import { Players } from '../support/Controller.mjs';
import { globals } from '../support/globals.mjs';
import { setTablePlayers, setHands } from './Table.mjs';

/**
 * Prepares the table for a new round
 * Synchronous -- no needed awaits in function
 */
export function prepareForNewRound() {
	// Clear players, table cards and hand results
	let tablePlayers = [];

	globals.tableCards = [];
	setHands([]);

	let foundDealer = false;
	let bseq = 0,
		aseq = 49;

	// assign play sequence so that dealer is last
	for (const player of Players) {
		if (player.status === 'in') {
			player.setStatus({ dealSequence: foundDealer ? ++bseq : ++aseq });
			if (player.dealer) foundDealer = true;
			tablePlayers.push(player);
		} else {
			player.setStatus({ dealSequence: -1 });
		}
	}

	// sort players according to sequence
	tablePlayers.sort((a, b) => {
		if (a.dealSequence < b.dealSequence) return -1;
		if (a.dealSequence === b.dealSequence) return 0;
		return 1;
	});

	setTablePlayers(tablePlayers);
}
