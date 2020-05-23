import * as Deck from './Deck.js';
import {
	globals,
	Players,
	emitEasyAll,
	emitEasySid,
	Accounting,
	bcastGameMessage,
	bcastPlayerMessage,
	pupTag,
} from './Controller.js';
import score from './Scoring.js';
import winston from 'winston';

let sumOfRaises = 0, // total raise amount for each betting round
	hands = [], // work table to calculate winners and payouts
	tablePlayers = []; // array of players in dealing order

/**
 * Prepares the table for a new round
 * Synchronous -- no needed awaits in function
 */
export function prepareForNewRound() {
	// Clear players, table cards and hand results
	tablePlayers = [];
	globals.tableCards = [];
	hands = [];

	let foundDealer = false;
	let bseq = 0,
		aseq = 49;

	// assign play sequence so that dealer is last
	for (const player of Players) {
		if (player.status === 'in') {
			player.setStatus({ dealSequence: foundDealer ? ++bseq : ++aseq });
			if (player.dealer) foundDealer = true;
			tablePlayers.push(player);
		} else {
			player.setStatus({ dealSequence: -1 });
		}
	}

	// sort players according to sequence
	tablePlayers.sort((a, b) => {
		if (a.dealSequence < b.dealSequence) return -1;
		if (a.dealSequence === b.dealSequence) return 0;
		return 1;
	});
}

/**
 * Deals (n) cards to each 'in' player, in the play rotation (dealer's left to dealer)
 * Synchronous -- just a delay to simulate dealing of cards (waitABit)
 * PlayerCards lines only show dummy cards
 * MyCards shows actual cards of individual players
 */
export async function dealToPlayers(count) {
	let c = count;
	while (c-- > 0) {
		for (const player of tablePlayers) {
			if (player.status === 'in') {
				player.cards.push(Deck.draw().short);
				player.setDummyCards('XXX');
				// Show updated cards to player
				emitEasySid(player.sockid, 'MyCards', {
					cards: player.cards,
				});
				// Show back of dealt card to all players
				emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.dummyCards });
				await waitABit(200);
			}
		}
	}
}

/**
 * bBettingRound:  do two rotations of betting.  First rotation can raise,
 * Second rotation can only see any raise amount, or fold.
 * aynchronous -- due to BetDialog
 */
export async function bettingRound(numberRound) {
	winston.debug(`table.js - in bettingRound`);

	// reset all PlayerShow messages
	emitEasyAll('PlayerShow', { clearAllMessages: true });

	// add/reset any prior raise data
	for (const player of tablePlayers) {
		player.setStatus({ raise: 0, paid: 0 });
	}
	sumOfRaises = 0;

	//FIRST ROTATION - Check/Raise/See/See & Raise/Fold
	for (const player of tablePlayers) {
		if (player.status === 'in' && player.chips > 0) {
			let result = await BetDialog(player, true, numberRound);
			processBetResult(player, result);
		}
	}

	//SECOND ROTATION - See/Fold  (only for those owing!)
	for (const player of tablePlayers) {
		if (player.status === 'in' && sumOfRaises > player.paid && player.chips > 0) {
			let result = await BetDialog(player, false, numberRound);
			processBetResult(player, result);
		}
	}

	//SIDEPOT CALCULATION
	for (const sidePotPlayer of tablePlayers) {
		// did player create sidepot this round?
		if (sidePotPlayer.status === 'side-pot' && sidePotPlayer.paid > 0) {
			let sidePotAmount = 0;
			// only include portion of players.paid up to the sidePotPlayer's contribution
			for (const player of tablePlayers) {
				sidePotAmount += player.paid <= sidePotPlayer.paid ? player.paid : sidePotPlayer.paid;
			}
			sidePotPlayer.setStatus({ sidePotAmount });
		}
	}
}

/**
 * BetDialog:  Displays Bet dialog on client
 *             returns promise once response is received from the client
 */
function BetDialog(player, allowRaise, numberRound) {
	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			resolve({ action: 'timeout' });
		}, globals.BET_WAIT);
		try {
			pupTag(`betdialog.${player.uuid}.${numberRound}.${allowRaise ? 1 : 2}`);

			bcastGameMessage(`Waiting for ${player.name} to bet`);
			emitEasyAll('HighLight', { uuid: player.uuid, action: 'only' });

			emitEasySid(
				player.sockid,
				'MyActions',
				{
					miniDialog: 'Betting',
					chips: player.chips,
					sumRaises: sumOfRaises,
					alreadyPaid: player.paid,
					allowRaise,
					numberRound,
				},
				(data) => {
					clearTimeout(timeoutId);
					resolve(data);
				}
			);
		} catch (e) {
			winston.debug(`Bet Dialog error: ${JSON.stringify(e)}`);
			reject(new Error(`Bet Dialog error ${JSON.stringify(e)}`));
		}
	});
}

/**
 * ProcessBetResult:  	Set statuses of players due to bet result
 * 					  	Also take care of any chip accounting
 * 						No blocking calls
 */
function processBetResult(player, result) {
	let message, amount, incrementalRaise, originalRaise;
	switch (result.action) {
		case 'timeout':
			console.log(`player ${player.name} put on break in Bet Round`);
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold (timeout)', highLight: false }, true);
			message = `${player.name} didn't respond in time!! Auto-Fold`;
			break;
		case 'check':
			player.setStatus({ lastAction: 'check', highLight: false }, true);
			message = `${player.name} checked`;
			break;
		case 'fold':
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false }, true);
			message = `${player.name} folded!!`;
			break;
		case 'see': // First or Second Rotation
			incrementalRaise = sumOfRaises - player.paid;
			Accounting.creditPot({ amount: incrementalRaise });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: incrementalRaise });
			player.setStatus(
				{ lastAction: 'see', highLight: false, paid: (player.paid += incrementalRaise) },
				true
			);
			message = `${player.name} sees (accepts) the raise of ${formatAmount(incrementalRaise)}.`;
			break;
		case 'raise': // First rotation only
			originalRaise = sumOfRaises;
			sumOfRaises += result.raiseAmount;
			Accounting.creditPot({ amount: sumOfRaises - player.paid });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: sumOfRaises - player.paid });
			player.setStatus(
				{ lastAction: player.chips === 0 ? 'All In' : 'raise', highLight: false, paid: sumOfRaises },
				true
			);
			switch (true) {
				case player.chips === 0:
					message = `${player.name} is ALL IN for ${formatAmount(sumOfRaises)}`;
					break;
				case originalRaise === 0:
					message = `${player.name} raises for ${formatAmount(sumOfRaises)}`;
					break;
				default:
					message = `${player.name} sees the raise of ${formatAmount(
						originalRaise
					)} and raises ${formatAmount(result.raiseAmount)} more!`;
			}
			break;
		case 'side-pot':
			Accounting.creditPot({ amount: player.chips });
			Accounting.debitPlayerChips({
				uuid: player.uuid,
				amount: player.chips,
				paid: (player.paid += player.chips),
			});
			player.setStatus({ status: 'side-pot', lastAction: 'side-pot', highLight: false }, true);
			message = `${player.name} is all-in, created a side-pot.  All-in amount is ${amount}`;
			break;
		default:
			winston.error(`processBetResult Invalid result.action ${result.action}`);
	}
	bcastPlayerMessage(player.uuid, message);
}

/**
 * dealToTable:  	Deals <count> table cards.  Optionally burns a card <burn=true>
 * 						async due to WaitABit
 */
export async function dealToTable(count, burn) {
	if (burn) {
		bcastGameMessage(`Burning a Card`);
		Deck.draw();
		await waitABit(200);
	}
	bcastGameMessage(`Dealing to Table`);
	for (let i = 0; i < count; i++) globals.tableCards.push(Deck.draw().short);

	emitEasyAll('TableCards', { cards: globals.tableCards });
	await waitABit(200);
}
//-------------------------------------------------------------------------------------------
//
//             Discard Player Cards
//
//-------------------------------------------------------------------------------------------
export async function discard(rule, prompt) {
	bcastGameMessage(`Awaiting Discards`);
	let promises = [];
	for (const player of tablePlayers) {
		if (player.status === 'in') {
			let promise = new Promise((resolve, reject) => {
				// On Time-Out, remove player from action
				let timeoutId = setTimeout(() => {
					console.log(`player ${player.name} put on break in Discard Round`);
					player.clearCards();
					player.setStatus(
						{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
						true
					);
					resolve({ player });
				}, globals.DISCARD_WAIT);
				player.setStatus({ highLight: true }, true);
				emitEasySid(
					player.sockid,
					'MyActions',
					{
						miniDialog: 'Discard',
						rule,
						prompt,
					},
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						clearTimeout(timeoutId);
						player.setStatus(
							{
								cards: data.remainingCards,
								dummyCards: player.dummyCards.slice(0, data.remainingCards.length),
							},
							true
						);
						emitEasySid(player.sockid, 'MyCards', {
							cards: player.cards,
						});
						// Show back of remaining cards to all players
						emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.dummyCards });
						resolve();
					}
				);
			});
			promises.push(promise);
		}
	}
	return await Promise.allSettled(promises);
}

//-------------------------------------------------------------------------------------------
//
//             Selecting Cards to Play
//
//-------------------------------------------------------------------------------------------
export async function selectCards(rule, prompt) {
	for (const player of tablePlayers) {
		if (['in', 'side-pot'].includes(player.status)) {
			if (Players.activeCount() > 1) {
				let result = await selectDialog(player, rule, prompt);
				processSelectResult(player, result);
			} else {
				hands.push({
					hand: 'Everyone Folded!',
					handValue: '00-00-00-00-00-00',
					players: [
						{
							uuid: player.uuid,
							name: player.name,
							isSidePot: player.isSidePot,
							sidePotAmount: player.sidePotAmount,
							playerWinAmount: 0,
						},
					],
				});
			}
		}
	}
}

function selectDialog(player, rule, prompt) {
	return new Promise((resolve, reject) => {
		try {
			let timeoutId = setTimeout(() => {
				resolve({ action: 'timeout' });
			}, globals.SHOW_WAIT);
			emitEasyAll('HighLight', { uuid: player.uuid, action: 'only' });
			bcastGameMessage(`SHOWDOWN!!! Waiting for ${player.name} to show or fold`);
			pupTag(`showdialog.${player.uuid}`);
			emitEasySid(
				player.sockid,
				'MyActions',
				{
					miniDialog: 'SelectCards',
					rule,
					prompt,
				},

				(data) => {
					clearTimeout(timeoutId);
					resolve(data);
				}
			);
		} catch (e) {
			winston.debug(`SelectCards Dialog error: ${JSON.stringify(e)}`);
			reject(new Error(`SelectCards Dialog error ${JSON.stringify(e)}`));
		}
	});
}

function processSelectResult(player, result) {
	let scoreResult, playerData, handEntry;
	switch (result.action) {
		case 'ok':
			scoreResult = score(result.cards);
			player.setStatus(
				{
					playedCards: result.cards,
					lastAction: 'show',
					highLight: false,
					hand: scoreResult.hand,
					handValue: scoreResult.handValue,
				},
				true
			);
			emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.cards });
			emitEasyAll('PlayerShow', { uuid: player.uuid, cards: player.playedCards, hand: scoreResult.hand });
			break;
		case 'fold':
			player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false }, true);
			break;
		case 'timeout':
			console.log(`player ${player.name} put on break in Select Dialog`);
			player.setStatus(
				{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
				true
			);
			break;
	}
}

//scoreType = 'lowspade', 'highspade'
export function calculateWinner(scoreType) {
	pupTag(`windialog`);
	bcastGameMessage(`Showing Winner Data`);
	calculateHandData(scoreType);
	distributeWinnings(scoreType);
	showWinnings(scoreType);
}

function calculateHandData(scoreType) {
	console.log(`hands table   ${JSON.stringify(hands)}`);
	let handEntry;
	let playerData;
	for (const player of tablePlayers) {
		if (['in', 'side-pot'].includes(player.status)) {
			playerData = {
				uuid: player.uuid,
				name: player.name,
				isSidePot: player.isSidePot,
				sidePotAmount: player.sidePotAmount,
				playerWinAmount: 0,
				playedCards: player.playedCards,
			};

			handEntry = hands.find((e) => e.handValue === player.handValue);
			if (handEntry) {
				handEntry.players.push(playerData);
			} else {
				hands.push({ hand: player.hand, handValue: player.handValue, players: [playerData] });
			}
		}
	}

	// High/Low Chicago
	// Determine High/Low Spade and associated player
	//  if there is a player with Chicago
	//     player wins minimum of (sidepot, 50% of pot)
	//     this will increase playerWinAmount

	//  tp accomodate when a player has both the high-hand and Chicago
	//     high hand must increment (+=) playerWinAmount
	//  to accomodate when a side-potted player also has a high-hand
	//     high hand must take into account playerWinAmount when calculating side-pot payouts

	// sort hands table, reverse order (high to low)
	hands.sort((a, b) => {
		if (a.handValue < b.handValue) return 1;
		if (a.handValue === b.handValue) return 0;
		return -1;
	});

	let remainingPot = Accounting.Pot;
	while (remainingPot > 0) {
		// Evaluate hands, high to low
		for (const theHand of hands) {
			if (remainingPot <= 0) break;
			// distRounding contains amount to distribute, and remainder to distribute sequentially,
			// such that all players receive multiples of 5 cents.
			// returns { potSplit, nickelsToSplit };

			let distRounding = roundDist(remainingPot, theHand.players.length);

			// allocate pot to players, limiting sidepot wins to sidepot amounts
			for (const player of theHand.players) {
				player.playerWinAmount = player.isSidePot
					? Math.min(distRounding.potSplit, player.sidePotAmount)
					: distRounding.potSplit;
				remainingPot -= player.isSidePot
					? Math.min(distRounding.potSplit, player.sidePotAmount)
					: distRounding.potSplit;
			}

			// allocate any extra nickels
			for (const player of theHand.players) {
				if (distRounding.nickelsToSplit <= 0) break;
				player.playerWinAmount += 5;
				remainingPot -= 5;
				distRounding.nickelsToSplit -= 5;
			}

			// count players that are still in
			if (remainingPot > 0) {
				// get number of "in" players remaining
				let stillInCount = 0;
				theHand.players.forEach((e) => {
					if (!e.isSidePot) stillInCount++;
				});
				// do the rounding calculation again
				let distRounding = roundDist(remainingPot, stillInCount);

				// allocate to "in" players
				for (const player of theHand.players) {
					if (!player.isSidePot) {
						player.playerWinAmount += distRounding.potSplit;
						remainingPot -= distRounding.potSplit;
					}
				}

				// and allocate those damn nickels!
				for (const player of theHand.players) {
					if (distRounding.nickelsToSplit <= 0) break;
					if (!player.isSidePot) {
						player.playerWinAmount += 5;
						remainingPot -= 5;
						distRounding.nickelsToSplit -= 5;
					}
				}
			}
		}
	}
}

function roundDist(pot, numPlayers) {
	let potSplit = Math.trunc(pot / (numPlayers * 5)) * 5;
	let nickelsToSplit = pot - potSplit * numPlayers;
	return { potSplit, nickelsToSplit };
}

function distributeWinnings() {
	for (const theHand of hands) {
		for (const player of theHand.players) {
			if (player.playerWinAmount > 0) {
				Accounting.debitPot({ amount: player.playerWinAmount });
				Accounting.creditPlayerChips({ uuid: player.uuid, amount: player.playerWinAmount });

				let p = Players.getPlayerByUuid(player.uuid);
				p.refreshPlayerStatus();
			}
		}
	}
}

// uuid: player.uuid,
// name: player.name,
// isSidePot: player.isSidePot,
// sidePotAmount: player.sidePotAmount,
// playerWinAmount: 0,

function showWinnings() {
	// let text = [];
	// for (const theHand of hands) {
	// 	for (const player of theHand.players) {
	// 		text.push(`${player.name}`);
	// 		text.push(`  Hand: ${theHand.hand}   ${theHand.handValue}`);
	// 		if (player.playerWinAmount > 0) {
	// 			text.push(`  Won: ${formatAmount(player.playerWinAmount)}`);
	// 		}
	// 		if (player.isSidePot > 0) {
	// 			text.push(`  Sidepot`);
	// 		}
	// 	}

	let data = [];
	for (const theHand of hands) {
		for (const player of theHand.players) {
			let line = {
				player: player.name,
				hand: theHand.hand,
				handValue: theHand.handValue,
				won: player.playerWinAmount,
				message: '',
			};
			if (player.isSidePot > 0) {
				line.message = 'Side Pot';
			}
			data.push(line);
		}
	}

	emitEasyAll('GameResults', { results: data, show: true });

	emitEasyAll('MyActions', {
		action: 'NewGame',
	});

	globals.gameInProgress = false;

	Players.updateBreak();
}

function formatAmount(amount) {
	return `$${(amount / 100).toFixed(2)}`;
}

function waitABit(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}
