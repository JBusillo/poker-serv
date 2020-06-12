import * as Deck from '../support/Deck.mjs';
import { emitEasyAll, emitEasySid, bcastGameMessage } from '../support/Controller.mjs';
import { getTablePlayers } from './Table.mjs';
import { globals } from '../support/globals.mjs';

let tablePlayers;
/**
 * Deals (n) cards to each 'in' player, in the play rotation (dealer's left to dealer)
 * Synchronous -- just a delay to simulate dealing of cards (waitABit)
 * PlayerCards lines only show dummy cards
 * MyCards shows actual cards of individual players
 */
export async function dealToPlayers(count) {
	tablePlayers = getTablePlayers();
	let c = count;
	while (c-- > 0) {
		for (let player of tablePlayers) {
			if (player.status === 'in') {
				player.cards.push(Deck.draw().short);
				player.setDummyCards('X02');
				// Show updated cards to player
				emitEasySid(player.sockid, 'MyCards', {
					cards: player.cards,
				});
				// Show back of dealt card to all players
				emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.dummyCards });
				await waitABit(200);
			}
		}
	}
}

/**
 * dealToTable:  	Deals <count> table cards.  Optionally burns a card <burn=true>
 * 						async due to WaitABit
 */
export async function dealToTable(count, burn) {
	tablePlayers = getTablePlayers();
	if (burn) {
		bcastGameMessage(`Burning a Card`);
		Deck.draw();
		await waitABit(200);
	}
	bcastGameMessage(`Dealing to Table`);
	for (let i = 0; i < count; i++) globals.tableCards.push(Deck.draw().short);

	emitEasyAll('TableCards', { cards: globals.tableCards });
	await waitABit(200);
}

function waitABit(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}
