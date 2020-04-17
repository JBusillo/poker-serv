import * as Deck from 'deck';
import { io } from './server';
import { Players, emitClient, Accounting } from 'controller';

let tablePlayers = [];
let tableCards = [];
let sumOfRaises = 0;

export function reset() {
	// Clear Player cards
	Players.forEach((p) => (p.cards = []));

	// Clear Table cards
	tableCards = [];

	// Creates a mini-table of players (uuid only)
	// in dealing order (left of dealer, clockwise to
	// and including) the dealer
	let before = [];
	let after = [];
	let foundDealer = false;

	Players.forEach((player) => {
		if (player.status === 'in')
			if (foundDealer) {
				before.push({ uuid: player.uuid });
			} else {
				after.push(player.uuid);
				if (player.dealer === true) {
					foundDealer = true;
				}
			}
	});

	tablePlayers = [...before, ...after];
}

export function dealToPlayers(count) {
	let c = count;
	while (c-- > 0) {
		tablePlayers.forEach((tPlayer) => {
			let player = Players.getPlayerByUuid(tPlayer.uuid);
			if (player.status === 'in') {
				player.cards.push(Deck.draw());
				// Show updated cards to player
				emitClient(player.sockid, 'PokerMessage', 'MyCards', {
					cards: player.cards,
				});
				// Tell everyone that a cards was dealt to player
				io.emit('PokerMessage', 'GameStatus', {
					message: `Dealt card to ${player.name}`,
				});
				waitABit(300);
			}
		});
	}
}
export function bettingRound() {
	// add/reset any prior raise data
	tablePlayers.forEach((player) => {
		player.raise = 0;
		player.paid = 0;
	});

	sumOfRaises = 0;
	// just two rotations possible
	// no raises during second rotation
	// no rotation if all paid up

	//FIRST ROTATION - Check/Raise/See/See & Raise/Fold
	tablePlayers.forEach((tPlayer) => {
		let dialog = null;
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in') {
			if (sumOfRaises === 0) {
				dialog = 'CheckRaise';
			} else {
				dialog = 'SeeRaiseFold';
			}
			let result = BetDialog(player, dialog);

			processBetResult(player, result);
		}
	});

	//SECOND ROTATION - See/Fold  (only for those owing!)
	tablePlayers.forEach((tPlayer) => {
		let dialog = null;
		let player = Players.getPlayerByUuid(tPlayer.uuid);
		if (player.status === 'in' && sumOfRaises > player.paid) {
			let result = BetDialog(player, 'SeeFold');

			processBetResult(player, result);
		}
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
			player.setLastAcion('fold (timeout)');
			break;
		case 'check':
			message = `${player.name} checked`;
			player.setLastAcion('check');
			break;
		case 'fold':
			message = `${player.name} folded!!`;
			player.setStatus('fold');
			player.setLastAcion('check');
			break;
		case 'see':
			player.paid += amount = sumOfRaises - player.paid;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAcion('see');
			message = `${player.name} sees (accepts) the raise, adds ${formatAmount(amount)} to the pot`;
			break;
		case 'raise':
			player.paid = sumOfRaises += amount = result.raiseAmount;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAcion('raise');
			message = `${player.name} raises for ${formatAmount(amount)}`;
			break;
		case 'see-raise':
			seeAmount = sumOfRaises - player.paid;
			player.paid = sumOfRaises += amount = result.raiseAmount;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setLastAcion('see/raise');
			message = `${player.name} sees the raise of ${seeAmount} and raises ${amount} more!`;
			break;
		case 'side-pot':
			player.paid += amount = player.chips;
			Accounting.creditPot({ amount });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount });
			player.setStatus('side-pot');
			player.setLastAcion('side-pot');
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

export async function calculateWinner(dealer, count) {}
export async function showCards(dealer, count) {}
export async function chanceToShow(dealer, count) {}

async function BetDialog(player, action) {
	let promise = new Promise((resolve, reject) => {
		emitClient(
			player.sockid,
			'PokerMessage',
			'Dialog',
			{
				dialog: 'Bet',

				chips: player.chips,
				stayAmount: sumOfRaises,
			},
			//CheckRaise: action: check/raise
			//SeeRaiseFold: action see/see-raise/fold/side-pot

			(data) => {
				resolve(data);
			}
		);
	});
	return await promise;
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
