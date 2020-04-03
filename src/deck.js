//import { app, io } from './server';
import { PokerDeck } from './pokerdeck';
import { players } from './players';

let deck = [];
let deckPointer = 0;

export function init() {
	// io.on('connection', function(socket) {
	// 	console.log('io.on.connection');
	// 	socket.emit('players', players);
	// 	// socket.on('my other event', function(data) {
	// 	// 	console.log(data);
	// });

	deck = shuffle();

	let disp = '';
	deck.forEach(cd => {
		disp = disp + cd + ':';
	});
	console.log(disp);
}

export function shuffle() {
	let array = [...PokerDeck];
	let m = array.length,
		t,
		i;

	// While there remain elements to shuffle…
	while (m) {
		// Pick a remaining element…
		i = Math.floor(Math.random() * m--);

		// And swap it with the current element.
		t = array[m];
		array[m] = array[i];
		array[i] = t;
	}

	return array;
}

export function deal(numberOfCards) {
	burn();
	players.forEach(element => {});
	// find dealer
	// circular deal, dealer+1 around to dealer
}

function burn() {
	draw();
}

export function draw() {
	return deck[deckPointer++];
}
