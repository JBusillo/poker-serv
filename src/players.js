import { io, router } from './server';
import { v4 as uuidv4 } from 'uuid';
import * as Deck from './deck';
import winston from 'winston';

let Players = { players: [], dealer: null, seq: [] };

function init() {
	// add the route
	router.get('/addPlayer', (req, res, next) => {
		addPlayer(req, res, next);
	});

	router.get('/startTable', (req, res, next) => {
		startTable(req, res, next);
	});

	router.get('/doButton', (req, res, next) => {
		doButton(req, res, next);
	});

	router.get('/playerReady', (req, res, next) => {
		playerReady(req, res, next);
	});

	// add the channel (notify when 'players' has changed
	io.on('connection', (socket) => {
		socket.emit('playerData', publicPlayerData());
	});
}

function doButton(req, res, next) {
	try {
		winston.info(`in doButton`);
		startTable();
		res.send(JSON.stringify({ status: 'OK' }));
	} catch (e) {
		winston.error('in doButton %s', e);
		res.send(JSON.stringify({ status: 'Error', message: e }));
		next(e);
	}
}

function playerReady(req, res, next) {
	try {
		winston.info(`playerReady, uuid = ${req.query.uuid}`);
		let uuid = req.query.uuid;

		let player = Players.players.find((e) => e.uuid === uuid);

		io.emit('PokerMessage', 'GameStatus', {
			message: `${player.name} joined the game!!!`,
		});

		io.emit('PokerMessage', 'PlayerStatus', publicPlayerData());

		io.emit(uuid, 'MyActions', { buttons: [{ id: 'myStart', text: 'StartGame', bguid: 'testing' }] });

		res.send(JSON.stringify({ status: 'OK' }));
	} catch (e) {
		winston.error('in playerReady %s', e);
		res.send(JSON.stringify({ status: 'Error', message: e }));
		next(e);
	}
}

function addPlayer(req, res, next) {
	try {
		winston.info(`'addPlayer req query uuid = ${req.query.uuid}`);
		let uuid = req.query.uuid;
		if (!uuid) uuid = uuidv4();

		let player = Players.players.find((e) => e.uuid === uuid);

		if (!player) {
			winston.info(`'adding player to table, uuid = ${uuid}`);
			Players.players.push({
				uuid,
				name: req.query.player,
				money: 0,
				winnings: 0,
				buyin: 0,
				dealer: false,
				thisHand: 'out', //out, in, ante-up, fold, call, raise $x.xx
				nextHand: 'out',
				cards: [],
				actions: [],
			});

			Players.seq.push(uuid);
		}

		res.send(JSON.stringify({ status: 'OK', uuid }));
	} catch (e) {
		res.send(JSON.stringify({ status: 'Error', message: e }));
		next(e);
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
				await sleep(100);
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
					break;
				}
			}
		}
	} catch (e) {
		winston.error('in startTable %s', e);
		throw e;
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { init, addPlayer, Players };