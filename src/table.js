import * as Deck from 'deck';
import {
	Players,
	emitEasyAll,
	emitEasySid,
	Accounting,
	bcastGameMessage,
	bcastPlayerMessage,
	pupTag,
} from './controller';
import { dealerData } from './NewDeal';
import score from './scoring';
import winston from 'winston';

let tablePlayers = []; // mini-table (uuid only) of players in this round
let sumOfRaises = 0; // total raise amount for each betting round
let tableCards = []; // cards dealt to table
let hands = []; // work table to calculate winners and payouts

let tablePlayersV2 = []; // version 2: array of players in dealing order

/**
 * Prepares the table for a new round
 * Synchronous -- no needed awaits in function
 */
export function prepareForNewRound() {
	// Clear all cards off the table
	tablePlayersV2 = [];
	tableCards = [];
	hands = [];
	Players.clearCards();

	// Creates a mini-table (tablePlayers) of players with uuid only)
	// in dealing order (left of dealer, clockwise to
	// and including) the dealer
	let before = [],
		after = [],
		foundDealer = false;

	let bseq = 0,
		aseq = 49;

	// rank deal sequence
	for (const player of Players) {
		if (player.status === 'in') {
			if (foundDealer) {
				player.setStatus({ dealSequence: ++bseq });
			} else {
				player.setStatus({ dealSequence: ++aseq });
			}
			if (player.dealer === true) {
				foundDealer = true;
			}
			tablePlayersV2.push(player);
		}
	}

	// sort according to rank
	tablePlayersV2.sort((a, b) => {
		if (a.dealSequence < b.dealSequence) return -1;
		if (a.dealSequence === b.dealSequence) return 0;
		return 1;
	});

	for (const player of tablePlayersV2) {
		console.log(`${player.name} ${player.dealSequence}`);
	}

	for (let i = 0; i < Players.length; i++) {
		let player = Players[i];
		if (player.status === 'in') {
			if (foundDealer) {
				before.push({ uuid: player.uuid });
			} else {
				after.push({ uuid: player.uuid });
			}
			if (player.dealer === true) {
				foundDealer = true;
			}
		}
	}
	tablePlayers = [...before, ...after];
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
		for (let i = 0; i < tablePlayers.length; i++) {
			let player = Players.getPlayerByUuid(tablePlayers[i].uuid);
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
	tablePlayers.forEach((tPlayer) => {
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		player.setStatus({ raise: 0, paid: 0 });
	});
	sumOfRaises = 0;

	//FIRST ROTATION - Check/Raise/See/See & Raise/Fold
	for (let i = 0; i < tablePlayers.length; i++) {
		let tPlayer = tablePlayers[i];
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in') {
			let result = await BetDialog(player.uuid, true, numberRound);
			processBetResult(player, result);
		}
	}

	//SECOND ROTATION - See/Fold  (only for those owing!)
	winston.debug(`table.js - second Rotation`);
	for (let i = 0; i < tablePlayers.length; i++) {
		let tPlayer = tablePlayers[i];
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in' && sumOfRaises > player.paid) {
			let result = await BetDialog(player.uuid, false, numberRound);
			processBetResult(player, result);
		}
	}
}

/**
 * BetDialog:  Displays Bet dialog on client
 *             returns promise once response is received from the client
 */
function BetDialog(playerUuid, allowRaise, numberRound) {
	return new Promise((resolve, reject) => {
		try {
			let player = Players.getPlayerByUuid(playerUuid);
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
				function (data) {
					resolve(data);
				}
			);
			//			if (!allowRaise) debugger;
		} catch (e) {
			winston.debug(`Bet Dialog error: ${JSON.stringify(e)}`);
			reject(new Error(`Bet Dialog error ${JSON.stringify(e)}`));
			debugger;
		}
	});
}

/**
 * ProcessBetResult:  	Set statuses of players due to bet result
 * 					  	Also take care of any chip accounting
 * 						No blocking calls
 */
function processBetResult(player, result) {
	let message;
	let amount;
	switch (result.action) {
		case 'timeout':
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold (timeout)', highLight: false }, true);
			break;
		case 'check':
			message = `${player.name} checked`;
			player.setStatus({ lastAction: 'check', highLight: false }, true);
			break;
		case 'fold':
			message = `${player.name} folded!!`;
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false }, true);
			break;
		case 'see': // First or Second Rotation
			let incrementalRaise = sumOfRaises - player.paid;
			winston.debug(`see incrementalRaise: ${incrementalRaise}`);
			winston.debug(`see sumOfRaises: ${sumOfRaises}`);
			winston.debug(`see player.chips before: ${player.chips}`);
			Accounting.creditPot({ amount: incrementalRaise });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: incrementalRaise });
			winston.debug(`see player.chips after: ${player.chips}`);
			player.setStatus(
				{ lastAction: 'see', highLight: false, paid: (player.paid += incrementalRaise) },
				true
			);
			message = `${player.name} sees (accepts) the raise of ${formatAmount(incrementalRaise)}.`;
			break;
		case 'raise': // First rotation only
			let originalRaise = sumOfRaises;
			sumOfRaises += result.raiseAmount;
			Accounting.creditPot({ amount: sumOfRaises - player.paid });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: sumOfRaises - player.paid });
			player.setStatus({ lastAction: 'raise', highLight: false, paid: sumOfRaises }, true);
			if (originalRaise === 0) {
				message = `${player.name} raises for ${formatAmount(sumOfRaises)}`;
			} else {
				message = `${player.name} sees the raise of ${formatAmount(originalRaise)} and raises ${formatAmount(
					result.raiseAmount
				)} more!`;
			}
			break;
		case 'side-pot':
			Accounting.creditPot({ amount: player.chips });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: player.chips, paid: player.chips });
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
	let card;
	if (burn) {
		bcastGameMessage(`Burning a Card`);
		Deck.draw();
		await waitABit(500);
	}
	bcastGameMessage(`Dealing to Table`);
	for (let i = 0; i < count; i++) tableCards.push((card = Deck.draw().short));

	emitEasyAll('TableCards', { cards: tableCards });
	await waitABit(500);
}
//-------------------------------------------------------------------------------------------
//
//
//             Selecting Cards to Play
//
//
//-------------------------------------------------------------------------------------------
export async function selectCards() {
	let playersCount = 0;
	let solePlayer = null;
	for (let i = 0; i < tablePlayers.length; i++) {
		let player = Players.getPlayerByUuid(tablePlayers[i].uuid);
		if (['in', 'side-pot'].includes(player.status)) {
			solePlayer = player;
			playersCount++;
		}
	}
	if (playersCount > 1) {
		for (let i = 0; i < tablePlayers.length; i++) {
			let player = Players.getPlayerByUuid(tablePlayers[i].uuid);
			if (['in', 'side-pot'].includes(player.status)) {
				let result = await selectDialog(player);
				processSelectResult(player, result);
			}
		}
	} else {
		console.log('solePlayer');
		hands.push({
			hand: 'Everyone Folded!',
			handValue: '00-00-00-00-00-00',
			players: [
				{
					uuid: solePlayer.uuid,
					name: solePlayer.name,
					isSidePot: solePlayer.isSidePot,
					sidePotAmount: solePlayer.sidePotAmount,
					playerWinAmount: 0,
				},
			],
		});
	}
}

function selectDialog(player) {
	return new Promise((resolve, reject) => {
		try {
			emitEasyAll('HighLight', { uuid: player.uuid, action: 'only' });
			bcastGameMessage(`SHOWDOWN!!! Waiting for ${player.name} to show or fold`);
			pupTag(`showdialog.${player.uuid}`);
			emitEasySid(
				player.sockid,
				'MyActions',
				{
					miniDialog: 'SelectCards',
					desc: 'Select 5 cards for Showdown!',
				},
				function (data) {
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
	if (result.action === 'ok') {
		let scoreResult = score(result.cards);
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

		// add to hands table for scoring
		let playerData = {
			uuid: player.uuid,
			name: player.name,
			isSidePot: player.isSidePot,
			sidePotAmount: player.sidePotAmount,
			playerWinAmount: 0,
		};

		let handEntry = hands.find((e) => e.handValue === scoreResult.handValue);
		if (handEntry) {
			handEntry.players.push(playerData);
		} else {
			hands.push({ hand: scoreResult.hand, handValue: scoreResult.handValue, players: [playerData] });
		}
	} else {
		player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false });
	}
}

export function calculateWinner() {
	pupTag(`windialog`);
	bcastGameMessage(`Calculating winner.  May take a few hours...`);
	calculateHandData();
	distributeWinnings();
	showWinnings();
}

function calculateHandData() {
	console.log(`hands table   ${JSON.stringify(hands)}`);

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
				player.playerWinAmount = +5;
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
						player.playerWinAmount = +5;
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
	let nickelsToSplit = pot - potSplit;
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
	let text = [];
	for (const theHand of hands) {
		for (const player of theHand.players) {
			text.push(`${player.name}`);
			text.push(`  Hand: ${theHand.hand}   ${theHand.handValue}`);
			if (player.playerWinAmount > 0) {
				text.push(`  Won: ${formatAmount(player.playerWinAmount)}`);
			}
			if (player.isSidePot > 0) {
				text.push(`  Sidepot`);
			}
		}

		emitEasyAll('GameResults', { text });
		emitEasyAll('MyActions', {
			action: 'NewGame',
		});
	}
}

function formatAmount(amount) {
	return `$${(amount / 100).toFixed(2)}`;
}

function waitABit(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}
