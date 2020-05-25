import { globals, emitEasyAll, emitEasySid, bcastGameMessage } from '../Controller.js';
import { getTablePlayers } from './Table.js';

let tablePlayers;

//-------------------------------------------------------------------------------------------
//
//             Discard Player Cards
//
//-------------------------------------------------------------------------------------------
export async function discard(rule, prompt) {
	tablePlayers = getTablePlayers();

	bcastGameMessage(`Awaiting Discards`);
	let promises = [];
	for (const player of tablePlayers) {
		if (player.status === 'in') {
			let promise = new Promise((resolve, reject) => {
				// On Time-Out, remove player from action
				let timeoutId = setTimeout(() => {
					console.log(`player ${player.name} put on break in Discard Round`);
					player.clearCards();
					player.setStatus(
						{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
						true
					);
					resolve({ player });
				}, globals.DISCARD_WAIT);
				player.setStatus({ highLight: true }, true);
				emitEasySid(
					player.sockid,
					'MyActions',
					{
						miniDialog: 'Discard',
						rule,
						prompt,
					},
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						clearTimeout(timeoutId);
						player.setStatus(
							{
								cards: data.remainingCards,
								dummyCards: player.dummyCards.slice(0, data.remainingCards.length),
							},
							true
						);
						emitEasySid(player.sockid, 'MyCards', {
							cards: player.cards,
						});
						// Show back of remaining cards to all players
						emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.dummyCards });
						resolve();
					}
				);
			});
			promises.push(promise);
		}
	}
	return await Promise.allSettled(promises);
}
