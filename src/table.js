import * as Deck from 'deck';
import { io } from './server';
import { Players, emitClient, Accounting } from './controller';
import { dealerData } from './round';
import score from './scoring';
import winston from 'winston';

let tablePlayers = [];
let tableCards = [];
let sumOfRaises = 0;

/**
 * Prepares the table for a new round
 * Synchronous -- no needed awaits in function
 */
export function prepareForNewRound() {
	// Clear Player cards and send to Players
	for (let i = 0; i < Players.length; i++) {
		Players[i].cards = [];
	}
	io.emit('PokerMessage', 'MyCards', {
		cards: [],
	});

	// Clear Table cards and send to Players
	winston.debug('table.js - Clear Table Cards');
	tableCards = [];
	io.emit('PokerMessage', 'TableCards', {
		cards: [],
	});

	// Creates a mini-table of players (uuid only)
	// in dealing order (left of dealer, clockwise to
	// and including) the dealer
	let before = [],
		after = [],
		foundDealer = false;

	for (let i = 0; i < Players.length; i++) {
		let player = Players[i];
		if (player.status === 'in') {
			if (foundDealer) {
				before.push({ uuid: player.uuid });
			} else {
				after.push({ uuid: player.uuid });
				if (player.dealer === true) {
					foundDealer = true;
				}
			}
		}
	}
	tablePlayers = [...before, ...after];
}

export async function dealToPlayers(count) {
	let promise = new Promise((resolve, reject) => {
		winston.debug(`table.js - in deal to players`);
		let c = count;
		while (c-- > 0) {
			for (let i = 0; i < tablePlayers.length; i++) {
				let player = Players.getPlayerByUuid(tablePlayers[0].uuid);
				if (player.status === 'in') {
					player.cards.push(Deck.draw().short);
					// Show updated cards to player
					console.log(`${player.name} ${player.cards}`);
					emitClient(player.sockid, 'PokerMessage', 'MyCards', {
						cards: player.cards,
					});
					// Tell everyone that a cards was dealt to player
					io.emit('PokerMessage', 'GameStatus', {
						message: `Dealt card to ${player.name}`,
					});
					waitABit(200).then();
				}
			}
		}
		resolve();
	});
	return await promise;
}
export async function bettingRound() {
	let promise = new Promise((resolve, reject) => {
		winston.debug(`table.js - in bettingRound`);
		// add/reset any prior raise data
		tablePlayers.forEach((player) => {
			player.raise = 0;
			player.paid = 0;
		});
		sumOfRaises = 0;
		Rotation1()
			.then(() => {
				Rotation2();
			})
			.then(() => {
				resolve();
			});
	});

	let result = await promise;

	return result;
}

// just two rotations possible
// no raises during second rotation
// no rotation if all paid up

async function Rotation1() {
	//FIRST ROTATION - Check/Raise/See/See & Raise/Fold
	winston.debug(`table.js - first Rotation`);
	for (let i = 0; i < tablePlayers.length; i++) {
		let tPlayer = tablePlayers[i];
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in') {
			winston.debug(`table.js - about to call BetDialog for ${player.name}`);
			let result = await BetDialog(player, true);
			winston.debug(`table.js - returned from BetDialog 1st Rotation, returned ${JSON.stringify(result)}`);
			processBetResult(player, result);
		}
	}
}

async function Rotation2() {
	//SECOND ROTATION - See/Fold  (only for those owing!)
	winston.debug(`table.js - second Rotation`);
	for (let i = 0; i < tablePlayers.length; i++) {
		let tPlayer = tablePlayers[i];
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in' && sumOfRaises > player.paid) {
			let result = await BetDialog(player, false);
			winston.debug(`table.js - returned from BetDialog 2nd Rotation, returned ${JSON.stringify(result)}`);
			processBetResult(player, result);
		}
	}
}

async function BetDialog(player, allowRaise) {
	let outMessage = {
		dialog: 'Bet',
		chips: player.chips,
		sumRaises: sumOfRaises,
		alreadyPaid: player.paid,
		allowRaise,
	};

	return new Promise((resolve) => {
		emitClient(player.sockid, 'PokerMessage', 'Dialog', outMessage, (data) => {
			resolve(data);
		});
	});
}

function processBetResult(player, result) {
	let message;
	let amount;
	let seeAmount;
	switch (result.action) {
		case 'timeout':
			message = `${player.name} didn't respond in time.  Auto-fold invoked!`;
			player.setStatus('fold');
			player.setLastAction('fold (timeout)');
			break;
		case 'check':
			message = `${player.name} checked`;
			player.setLastAction('check');
			break;
		case 'fold':
			message = `${player.name} folded!!`;
			player.setStatus('fold');
			break;
		case 'see':
			player.paid += amount = sumOfRaises - player.paid;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAction('see');
			message = `${player.name} sees (accepts) the raise.`;
			break;
		case 'raise':
			player.paid = sumOfRaises += amount = result.raiseAmount;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAction('raise');
			message = `${player.name} raises for ${formatAmount(amount)}`;
			break;
		case 'see-raise':
			seeAmount = sumOfRaises - player.paid;
			player.paid = sumOfRaises += amount = result.raiseAmount;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAction('see/raise');
			message = `${player.name} sees the raise of ${seeAmount} and raises ${amount} more!`;
			break;
		case 'side-pot':
			player.paid += amount = player.chips;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setStatus('side-pot');
			player.setLastAction('side-pot');
			message = `${player.name} is all-in, created a side-pot.  All-in amount is ${amount}`;
			break;
		default:
			console.log('Error');
	}
	// Show everyone what this player did
	io.emit('PokerMessage', 'GameStatus', {
		message,
	});
	Players.refreshAll();
}

export async function dealToTable(count, burn) {
	let card;
	if (burn) {
		Deck.draw();
		io.emit('PokerMessage', 'GameStatus', {
			message: `Burned a card`,
		});
	}
	for (let i = 0; i < count; i++) tableCards.push((card = Deck.draw().short));
	io.emit('PokerMessage', 'GameStatus', {
		message: `Dealt ${card.long} to Table`,
	});
	io.emit('PokerMessage', 'TableCards', {
		cards: tableCards,
	});
}

export async function showCards() {
	const playerSelectedData = Players.map(({ uuid, name }) => ({
		uuid,
		name,
	}));
	io.emit('PokerMessage', 'Dialog', {
		dialog: 'ShowDown',
		tableCards,
		players: playerSelectedData,
	});

	tablePlayers.forEach((tPlayer) => {
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in') {
			ShowDialog(player);
		}
	});
}

async function ShowDialog(player) {
	let scoring;
	let promise = new Promise((resolve, reject) => {
		emitClient(
			player.sockid,
			'PokerMessage',
			'Dialog',
			{
				dialog: 'ShowHand',
				tableCards,
				playerCards: player.cards,
				game: dealerData.game,
			},
			//fold or show
			//			{action: <fold/show> selectedCards: []}
			(data) => {
				if (data.action === 'fold') {
					player.setStatus('fold');
				} else {
					player.setSelectedCards(data.selectedCards);
					scoring = calculateHighHand(player.uuid);
					io.emit('PokerMessage', 'ShowDown', {
						action: 'player',
						highPlayer: scoring.highPlayer,
						isHighPlayer: scoring.isHighPlayer,
						highHandDescription: scoring.highHandDescription,
						playerHandDescription: scoring.playerHandDescription,
					});
				}
				resolve(data);
			}
		);
	});
	return await promise;
}

export function calculateWinner() {
	calculateHighHand();
	distributeWinnings();
	io.emit('PokerMessage', 'ShowDown', {
		action: 'terminate',
	});
}

function distributeWinnings() {}

function calculateHighHand(currentPlayerUuid) {
	let highHand = '00-00-00-00-00-00';
	let highPlayer = null;
	let isHighPlayer = false;
	let highHandDescription = null;
	let playerHandDescription = null;
	// if player specified, only calculate using "in" players up to current player
	// if no player specified, calculate using all "in" players
	for (let i = 0; i < tablePlayers.length; i++) {
		let player = Players.getPlayerByUuid(tablePlayers[i].uuid);
		let hand = score(player.selectedCards);
		if (hand.value > highHand) {
			highHand = hand.value;
			highPlayer = player;
			highHandDescription = hand.hand;
		}
		if (currentPlayerUuid && currentPlayerUuid === player.uuid) {
			playerHandDescription = hand.hand;
			if (highPlayer.uuid === currentPlayerUuid) {
				isHighPlayer = true;
			}
		}
	}
	return { highPlayer, highHandDescription, isHighPlayer, playerHandDescription };
}

function formatAmount(amount) {
	return `$${(amount / 100).toFixed(2)}`;
}

async function waitABit(ms) {
	let promise = new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});

	await promise; // wait until the promise resolves (*)
}
