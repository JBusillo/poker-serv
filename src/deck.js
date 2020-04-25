import winston from 'winston';
import { PokerDeck } from './pokerdeck';
import { players } from './players';
import { io } from './server';

let deck = [];
let deckPointer = 0;

export function shuffle() {
	io.emit('PokerMessage', 'GameStatus', {
		message: `Shuffling the deck...`,
	});

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

	deck = array;
	deckPointer = 0;

	let disp = '';
	deck.forEach((cd) => {
		disp = disp + cd + ':';
	});
	winston.info('Shuffled Deck: %s', disp);

	return array;
}

// export function dealToPlayers(tablePlayers, numberOfCards ) {
// 	for (let i = numberOfCards; i < numberOfCards; i++) {
// 	while (numberOfCards++ <)
// 	tablePlayers.forEach((tp) => {

// 	});
// }
// 	// find dealer
// 	// circular deal, dealer+1 around to dealer
// }

export function dealToTable(numberOfCards) {}

function burn() {
	draw();
}

export function draw() {
	let card = {
		short: deck[deckPointer],
		long: getCardLongDescription(deck[deckPointer]),
		mini: getCardMiniDescription(deck[deckPointer]),
	};
	deckPointer++;
	return card;
}

function getCardLongDescription(short) {
	let desc = '';
	switch (short.substr(1)) {
		case '02':
			desc = 'Two';
			break;
		case '03':
			desc = 'Three';
			break;
		case '04':
			desc = 'Four';
			break;
		case '05':
			desc = 'Five';
			break;
		case '06':
			desc = 'Six';
			break;
		case '07':
			desc = 'Seven';
			break;
		case '08':
			desc = 'Eight';
			break;
		case '09':
			desc = 'Nine';
			break;
		case '10':
			desc = 'Ten';
			break;
		case '11':
			desc = 'Jack';
			break;
		case '12':
			desc = 'Queen';
			break;
		case '13':
			desc = 'King';
			break;
		case '14':
			desc = 'Ace';
			break;
	}

	desc += ' of ';

	switch (short.substr(0, 1)) {
		case 'C':
			desc += 'Clubs';
			break;
		case 'D':
			desc += 'Diamonds';
			break;
		case 'H':
			desc += 'Hearts';
			break;
		case 'S':
			desc += 'Spades';
			break;
	}
	return desc;
}

function getCardMiniDescription(short) {
	let desc = '';
	let rank = '23456789JQKA'[Number(short.substr(1))];
	switch (short.substr(0, 1)) {
		case 'C':
			return rank + '♣';
		case 'D':
			return rank + '♦';
		case 'H':
			return rank + '♥';
		case 'S':
			return rank + '♠';
	}
	return '??';
}
