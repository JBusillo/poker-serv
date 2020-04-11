import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import * as Deck from './deck';
import * as accounting from 'accounting';
import * as controller from 'controller';
import { startRound } from './round';
import winston from 'winston';

let Players = { players: [], dealer: null, seq: [] };

function init() {
	// add the channel (notify when 'players' has changed
	io.on('connection', (socket) => {
		socket.emit('playerData', publicPlayerData());

		socket.on('ClientMessage', (data, fn) => {
			switch (data.msgType) {
				case 'addPlayer':
					addPlayer(data, fn);
					break;
				case 'playerReady':
					playerReady(data, fn);
					break;
				case 'doButton':
					doButton(data, fn);
					break;
				case 'startRound':
					startRound(data, fn);
					break;
				default:
					console.log(`Default ${data}`);
			}
		});
	});
}

function addPlayer(data, fn) {
	try {
		winston.info(`'addPlayer ${data}`);
		let uuid = data.uuid;
		if (!uuid) uuid = uuidv4();

		let player = Players.players.find((e) => e.uuid === uuid);

		if (!player) {
			winston.info(`'adding player to table, uuid = ${uuid}`);
			Players.players.push({
				uuid,
				name: data.player,
				money: 0,
				winnings: 0,
				buyin: 0,
				dealer: false,
				thisHand: 'out', //out, in, ante-up, fold, call, broke, raise $x.xx
				onBreak: 'false',
				cards: [],
				actions: [],
			});

			Players.seq.push(uuid);
		}

		fn({ status: 'OK', uuid });
	} catch (e) {
		fn({ status: 'Error', message: e });
	}
}

function doButton(data, fn) {
	try {
		winston.info(`in doButton`);
		startTable();
		fn({ status: 'OK' });
	} catch (e) {
		fn({ status: 'Error', message: e });
	}
}

function playerReady(data, fn) {
	try {
		winston.info(`playerReady, ${data}`);
		let uuid = data.uuid;

		let player = Players.players.find((e) => e.uuid === uuid);

		io.emit('PokerMessage', 'GameStatus', {
			message: `${player.name} joined the game!!!`,
		});

		io.emit('PokerMessage', 'PlayerStatus', publicPlayerData());

		io.emit(uuid, 'MyActions', { buttons: [{ id: 'myStart', text: 'StartGame', bguid: 'testing' }] });

		fn({ status: 'OK', uuid });
	} catch (e) {
		fn({ status: 'Error', message: e });
	}
}

function publicPlayerData() {
	let publicData = [];
	Players.players.forEach((el) => {
		publicData.push({
			name: el.name,
			money: el.money,
			winnings: el.winnings,
			buyin: el.buyin,
			dealer: el.dealer,
			thisHand: el.thisHand, //out, in, ante-up, fold, call, raise $x.xx
			nextHand: el.nextHand,
		});
	});
	return publicData;
}

async function startTable() {
	try {
		winston.info(`in startTable`);

		let card;

		io.emit('PokerMessage', 'GameStatus', {
			message: `Shuffling the deck...`,
		});

		//clear everyone's cards!!!
		for (let i = 0; i < Players.players.length; i++) {
			Players.players[i].cards = [];
		}

		Deck.shuffle();
		let aceFound = false;

		//Round robin until Ace is found
		while (!aceFound) {
			for (let i = 0; i < Players.players.length; i++) {
				let player = Players.players[i];
				await sleep(200);
				card = Deck.draw();
				player.cards.push(card.short);
				io.emit(player.uuid, 'MyCards', { cards: player.cards });
				io.emit('PokerMessage', 'GameStatus', {
					message: `${player.name} drew the ${card.long}`,
				});
				if (card.short.substr(1) === '14') {
					aceFound = true;
					player.dealer = true;
					io.emit('PokerMessage', 'GameStatus', {
						message: `We have a dealer: ${player.name}`,
					});
					io.emit(
						player.uuid,
						'Dialog',
						{
							dialog: 'Dealer',
							chips: accounting.getChips(player.uuid),
						},
						(data) => {}
					);
					break;
				}
			}
		}
	} catch (e) {
		winston.error('in startTable %s', e);
		throw e;
	}
}

export function freeze() {
	let foundDealer = false;
	let before = [];
	let after = [];
	Players.players.forEach((el) => {
		if (!el.onBreak) {
			let player = { uuid: el.uuid, name: el.name, chips: el.chips, cards: [], status: 'ante-up' };
			player.uuid = el.uuid;
			if (el.dealer) {
				player.status = 'in';
				foundDealer = true;
			}
			if (foundDealer) {
				before.push(player);
			} else {
				after.push(player);
			}
		}
		return [...before, ...after];
	});

	// uuid,
	// name: data.player,
	// money: 0,
	// winnings: 0,
	// buyin: 0,
	// dealer: false,
	// thisHand: 'out', //out, in, ante-up, fold, call, broke, raise $x.xx
	// onBreak: 'false',
	// cards: [],
	// actions: [],
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { init, addPlayer, Players };
