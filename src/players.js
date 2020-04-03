import { app, io } from './server';
import { v4 as uuidv4 } from 'uuid';
import * as Deck from './deck';

let playerData = { players: [], dealer: null, seq: [] };

function init() {
	// add the route
	app.get('/addPlayer', (req, res) => {
		addPlayer(req, res);
	});

	// add the channel (notify when 'players' has changed
	io.on('connection', socket => {
		socket.emit('playerData', playerData);
	});
}

function determineDealer() {
	io.emit('myActionsData', 'freeze');
	let spot = 1;
	let card = 'XXxX';
	Deck.shuffle();
	while (card.substr(1, 2) !== '14') {
		let card = Deck.draw();
	}
}

function addPlayer(req, res) {
	try {
		console.log('addPlayer');
		let uuid = req.query.uuid;
		if (!uuid) uuid = uuidv4();

		const uuidNew = el => {
			el.uuid !== uuid;
		};

		if (playerData.players.every(uuidNew)) {
			playerData.players.push({
				uuid,
				name: req.query.player,
				money: 0,
				winnings: 0,
				buyin: 0,
				dealer: false,
				thisHand: 'out', //out, in, ante-up, fold, call, raise $x.xx
				nextHand: 'out',
			});

			playerData.seq.push(uuid);
		}

		io.emit('PokerMessage', 'GameStatus', {
			message: `${req.query.player} joined the game!!!`,
		});

		io.emit('PokerMessage', 'PlayerStatus', playerData);
		res.send(JSON.stringify({ status: 'OK', uuid }));
	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({ status: 'Error', message: e }));
	}
}

module.exports = { init, addPlayer, playerData };
