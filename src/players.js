import { app, io } from './server';
import { v4 as uuidv4 } from 'uuid';
import * as Deck from './deck';

let playerData = { players: null, dealer: null, seq: [] };
let tableSequence = 0;
playerData.players = new Map();

function init() {
	// add the route
	app.get('/addPlayer', (req, res) => {
		addPlayer(req, res);
	});

	// add the channel (notify when 'players' has changed
	io.on('connection', function(socket) {
		socket.emit('playerData', playerData);
	});
}

function determineDealer() {
	socket.emit('myActionsData', 'freeze');
	spot = 1;
	card = 'XXxX';
	Deck.shuffle();
	while (card.substr(1, 2) != '14') {
		var card = Deck.draw();
	}
}

function addPlayer(req, res) {
	try {
		for (let [key, value] of playerData.players) {
			console.log(`${key} ${value} `);
		}

		// if (players.find(e => e.name == req.query.player)) {
		// 	throw 'Player Name already exists.  Choose another!';
		// }

		let uuid = uuidv4();
		playerData.players.set(uuid, {
			name: req.query.player,
			money: 0,
			winnings: 0,
			buyin: 0,
			dealer: false,
			thisHand: 'out', //out, in, ante-up, fold, call, raise $x.xx
			nextHand: 'out',
			tableSequence: ++tableSequence,
		});

		playerData.seq.push = {
			uuid: uuid,
		};

		io.emit('PokerMessage', 'PlayerStatus', playerData);
		res.send(JSON.stringify({ status: 'OK', uuid: uuid }));
	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({ status: 'Error', message: e }));
	}
}

module.exports = { init, addPlayer, playerData };
