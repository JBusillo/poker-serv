import { Players } from '../Controller.js';
import * as Deck from '../support/Deck.js';
import * as Table from '../table/Table.js';

export default async function Omaha(variation) {
	// Reset Table
	Table.prepareForNewRound();

	// Shuffle Deck
	Deck.shuffle();

	// Two cards face down to each player, first betting round
	if (Players.activeCount() > 1) {
		await Table.dealToPlayers(4);
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
	// Player selects the five cards to show
	await Table.selectCards('2M/3T', 'Must select 2 of your cards, 3 from table');

	// Calculate winner, do accounting, etc.
	await Table.calculateWinner(variation);
}
