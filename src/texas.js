import { Players } from './controller';
import * as Deck from './deck';
import * as Table from './table';
import winston from 'winston';

export default async function Texas() {
	winston.debug('texas.js - beginning');

	// Reset Table
	Table.prepareForNewRound();

	// Shuffle Deck
	winston.debug('texas.js - Deck.shuffle()');
	Deck.shuffle();

	// Cut Deck
	// await cutDeck();

	winston.debug('texas.js - Table.dealToPlayers(2)');
	await Table.dealToPlayers(2);

	winston.debug('texas.js - Table.bettingRound()');
	await Table.bettingRound();

	//Flop
	if (Players.activeCount > 1) {
		Deck.burn();
		await Deck.dealToTable(3);
		await Table.bettingRound();
	}

	//Turn
	if (Players.activeCount > 1) {
		Deck.burn();
		await Deck.dealToTable(1);
		await Table.bettingRound();
	}

	//River
	if (Players.activeCount > 1) {
		Deck.burn();
		await Deck.dealToTable(1);
		await Table.bettingRound();
	}

	await Table.showCards();

	await Table.calculateWinner();

	//	Table.chanceToShow();
}

// obama-ha / high/low chicago

// remove all cards
// shuffle
// cut
// deal round (4)
// bet
// burn, deal table 3
// bet
// burn, deal table 1
// bet
// burn, deal table 1
// bet
// round (select 3 table, 2 player) show
