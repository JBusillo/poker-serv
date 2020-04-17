import { Accounting, emitClient, Players } from './controller';
import * as Deck from './deck';
import * as Table from './table';

export default function Texas() {
	// Clear Cards
	Players.forEach((p) => (p.cards = []));

	// Reset Table
	Table.reset();

	// Shuffle Deck
	Deck.shuffle();

	// Cut Deck
	// await cutDeck();

	Deck.dealToPlayers(2);
	Table.bettingRound();

	//Flop
	if (Players.activeCount > 1) {
		Deck.burn();
		Deck.dealToTable(3);
		Table.bettingRound();
	}

	//Turn
	if (Players.activeCount > 1) {
		Deck.burn();
		Deck.dealToTable(1);
		Table.bettingRound();
	}

	//River
	if (Players.activeCount > 1) {
		Deck.burn();
		Deck.dealToTable(1);
		Table.bettingRound();
	}

	Table.calculateWinner();

	Table.showCards();

	Table.chanceToShow();
}
// remove all cards
// shuffle
// cut
// deal round (2)
// bet
// burn, deal table 3
// bet
// burn, deal table 1
// bet
// burn, deal table 1
// bet
// round (show)

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
