import {
	emitEasyAll,
	emitEasySid,
	Accounting,
	bcastGameMessage,
	bcastPlayerMessage,
	pupTag,
} from '../support/Controller.mjs';
import { globals } from '../support/globals.mjs';

import { getTablePlayers } from './Table.mjs';
import winston from 'winston';

let sumOfRaises;
let tablePlayers;

/**
 * bBettingRound:  do two rotations of betting.  First rotation can raise,
 * Second rotation can only see any raise amount, or fold.
 * aynchronous -- due to BetDialog
 */
export async function bettingRound(numberRound) {
	winston.debug(`betting.js - in bettingRound`);

	tablePlayers = getTablePlayers();

	// reset all PlayerShow messages
	emitEasyAll('PlayerShow', { clearAllMessages: true });

	// add/reset any prior raise data
	for (let player of tablePlayers) {
		player.setStatus({ raise: 0, paid: 0 });
	}
	sumOfRaises = 0;

	//FIRST ROTATION - Check/Raise/See/See & Raise/Fold
	for (let player of tablePlayers) {
		if (player.status === 'in' && player.chips > 0) {
			let result = await BetDialog(player, true, numberRound);
			processBetResult(player, result);
		}
	}

	//SECOND ROTATION - See/Fold  (only for those owing!)
	for (let player of tablePlayers) {
		if (player.status === 'in' && sumOfRaises > player.paid && player.chips > 0) {
			let result = await BetDialog(player, false, numberRound);
			processBetResult(player, result);
		}
	}

	//SIDEPOT CALCULATION
	for (let sidePotPlayer of tablePlayers) {
		// did player create sidepot this round?
		if (sidePotPlayer.status === 'side-pot' && sidePotPlayer.paid > 0) {
			let sidePotAmount = 0;
			// only include portion of players.paid up to the sidePotPlayer's contribution
			for (const player of tablePlayers) {
				sidePotAmount += player.paid <= sidePotPlayer.paid ? player.paid : sidePotPlayer.paid;
			}
			sidePotPlayer.setStatus({ sidePotAmount });
		}
	}
}

/**
 * BetDialog:  Displays Bet dialog on client
 *             returns promise once response is received from the client
 */
function BetDialog(player, allowRaise, numberRound) {
	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			console.log('timeout');
			resolve({ action: 'timeout' });
		}, globals.BET_WAIT);
		try {
			pupTag(`betdialog.${player.uuid}.${numberRound}.${allowRaise ? 1 : 2}`);

			bcastGameMessage(`Waiting for ${player.name} to bet`);
			emitEasyAll('HighLight', { uuid: player.uuid, action: 'only' });

			emitEasySid(
				player.sockid,
				'MyActions',
				{
					miniDialog: 'Betting',
					chips: player.chips,
					sumRaises: sumOfRaises,
					alreadyPaid: player.paid,
					allowRaise,
					numberRound,
				},
				(data) => {
					clearTimeout(timeoutId);
					resolve(data);
				}
			);
		} catch (e) {
			winston.debug(`Bet Dialog error: ${JSON.stringify(e)}`);
			reject(new Error(`Bet Dialog error ${JSON.stringify(e)}`));
		}
	});
}

/**
 * ProcessBetResult:  	Set statuses of players due to bet result
 * 					  	Also take care of any chip accounting
 * 						No blocking calls
 */
function processBetResult(player, result) {
	let message, amount, incrementalRaise, originalRaise;
	switch (result.action) {
		case 'timeout':
			console.log(`player ${player.name} put on break in Bet Round`);
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold (timeout)', highLight: false }, true);
			message = `${player.name} didn't respond in time!! Auto-Fold`;
			break;
		case 'check':
			player.setStatus({ lastAction: 'check', highLight: false }, true);
			message = `${player.name} checked`;
			break;
		case 'fold':
			player.clearCards();
			player.setStatus({ status: 'fold', lastAction: 'fold', highLight: false }, true);
			message = `${player.name} folded!!`;
			break;
		case 'see': // First or Second Rotation
			incrementalRaise = sumOfRaises - player.paid;
			Accounting.creditPot({ amount: incrementalRaise });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: incrementalRaise });
			player.setStatus(
				{ lastAction: 'see', highLight: false, paid: (player.paid += incrementalRaise) },
				true
			);
			message = `${player.name} sees (accepts) the raise of ${formatAmount(incrementalRaise)}.`;
			break;
		case 'raise': // First rotation only
			originalRaise = sumOfRaises;
			sumOfRaises += result.raiseAmount;
			Accounting.creditPot({ amount: sumOfRaises - player.paid });
			Accounting.debitPlayerChips({ uuid: player.uuid, amount: sumOfRaises - player.paid });
			player.setStatus(
				{ lastAction: player.chips === 0 ? 'All In' : 'raise', highLight: false, paid: sumOfRaises },
				true
			);
			switch (true) {
				case player.chips === 0:
					message = `${player.name} is ALL IN for ${formatAmount(sumOfRaises)}`;
					break;
				case originalRaise === 0:
					message = `${player.name} raises for ${formatAmount(sumOfRaises)}`;
					break;
				default:
					message = `${player.name} sees the raise of ${formatAmount(
						originalRaise
					)} and raises ${formatAmount(result.raiseAmount)} more!`;
			}
			break;
		case 'side-pot':
			Accounting.creditPot({ amount: player.chips });
			Accounting.debitPlayerChips({
				uuid: player.uuid,
				amount: player.chips,
				paid: (player.paid += player.chips),
			});
			player.setStatus({ status: 'side-pot', lastAction: 'side-pot', highLight: false }, true);
			message = `${player.name} is all-in, created a side-pot.  All-in amount is ${amount}`;
			break;
		default:
			winston.error(`processBetResult Invalid result.action ${result.action}`);
	}
	bcastPlayerMessage(player.uuid, message);
}

function formatAmount(amount) {
	return `$${(amount / 100).toFixed(2)}`;
}
