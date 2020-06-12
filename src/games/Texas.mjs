import { Players } from '../support/Controller.mjs';
import * as Deck from '../support/Deck.mjs';
import * as Table from '../table/Table.mjs';

export default async function Texas(variation) {
	// Reset Table
	Table.prepareForNewRound();

	// Shuffle Deck
	Deck.shuffle();

	if (Players.activeCount() > 1) {
		if (variation && variation === 'Pineapple') {
			// Pineapple -- deal 3 facedown, discard 1
			await Table.dealToPlayers(3);
			await Table.discard('1Card', 'Pineapple: Pick one card to discard');
		} else {
			// Texas - no discards, 2 cards face down
			await Table.dealToPlayers(2);
		}
	}

	if (Players.activeCount() > 1) {
		await Table.bettingRound(1);
	}

	// Flop - burn, deal 3 cards to table, second betting round
	if (Players.activeCount() > 1) {
		await Table.dealToTable(3, true);
		await Table.bettingRound(2);
	}

	// Flop - burn, deal 1 card to table, third betting round
	if (Players.activeCount() > 1) {
		await Table.dealToTable(1, true);
		await Table.bettingRound(3);
	}

	// River - burn, deal 1 card to table, fourth (final) betting round
	if (Players.activeCount() > 1) {
		await Table.dealToTable(1, true);
		await Table.bettingRound(4);
	}

	// Player selects the five cards to show
	await Table.selectCards('5Total', 'Select five cards to play');

	// Calculate winner, do accounting, etc.
	await Table.calculateWinner();
}
