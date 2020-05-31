import { Players, emitEasyAll, emitEasySid, bcastGameMessage, pupTag } from '../support/Controller.js';
import { globals } from '../support/globals.js';

import score from './Scoring.js';
import winston from 'winston';
import { getTablePlayers, setHands } from './Table.js';

//-------------------------------------------------------------------------------------------
//
//             Selecting Cards to Play
//
//-------------------------------------------------------------------------------------------
let hands;
let tablePlayers;
export async function selectCards(rule, prompt) {
	emitEasyAll('PlayerShow', { clearAllMessages: true });

	tablePlayers = getTablePlayers();
	hands = [];
	for (const player of tablePlayers) {
		if (['in', 'side-pot'].includes(player.status)) {
			if (Players.activeCount() > 1) {
				let result = await selectDialog(player, rule, prompt);
				processSelectResult(player, result);
			} else {
				hands.push({
					hand: 'Everyone Folded!',
					handValue: '00-00-00-00-00-00',
					players: [
						{
							uuid: player.uuid,
							name: player.name,
							isSidePot: player.isSidePot,
							sidePotAmount: player.sidePotAmount,
							playerWinAmount: 0,
						},
					],
				});
			}
		}
	}
	setHands(hands);
}

function selectDialog(player, rule, prompt) {
	return new Promise((resolve, reject) => {
		try {
			let timeoutId = setTimeout(() => {
				resolve({ action: 'timeout' });
			}, globals.SHOW_WAIT);
			emitEasyAll('HighLight', { uuid: player.uuid, action: 'only' });
			bcastGameMessage(`SHOWDOWN!!! Waiting for ${player.name} to show or fold`);
			pupTag(`showdialog.${player.uuid}`);
			emitEasySid(
				player.sockid,
				'MyActions',
				{
					miniDialog: 'SelectCards',
					rule,
					prompt,
				},

				(data) => {
					clearTimeout(timeoutId);
					resolve(data);
				}
			);
		} catch (e) {
			winston.debug(`SelectCards Dialog error: ${JSON.stringify(e)}`);
			reject(new Error(`SelectCards Dialog error ${JSON.stringify(e)}`));
		}
	});
}

function processSelectResult(player, result) {
	let scoreResult;
	switch (result.action) {
		case 'ok':
			scoreResult = score(result.cards);
			player.setStatus(
				{
					playedCards: result.cards,
					lastAction: 'show',
					highLight: false,
					hand: scoreResult.hand,
					handValue: scoreResult.handValue,
				},
				true
			);
			emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.cards });
			emitEasyAll('PlayerShow', { uuid: player.uuid, cards: player.playedCards, hand: scoreResult.hand });
			break;
		case 'fold':
			player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false }, true);
			break;
		case 'timeout':
			console.log(`player ${player.name} put on break in Select Dialog`);
			player.setStatus(
				{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
				true
			);
			break;
	}
}
