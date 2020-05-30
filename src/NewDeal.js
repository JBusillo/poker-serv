//import { EventEmitter } from 'events';

import {
	bcastGameMessage,
	Accounting,
	Players,
	emitEasyAll,
	emitEasySid,
	pupTag,
	resumeEvent,
} from './support/Controller.js';

import { globals } from './support/globals.js';

import winston from 'winston';
import * as Deck from './support/Deck.js';
import Texas from './games/Texas.js';
import Omaha from './games/Omaha.js';

let dealer = null;

export let dealerData = null;

export default async function NewDeal(data) {
	// Pause/Resume game
	if (globals.pauseGame) {
		bcastGameMessage(`Game is Paused`);
		emitEasyAll('PauseGame', { pause: true });

		await new Promise((resolve) => {
			resumeEvent.once('resume', resolve);
		});
		globals.pauseGame = false;
		bcastGameMessage(`Game is Resumed`);
		emitEasyAll('PauseGame', { pause: false });
	}

	emitEasyAll('PlayerShow', { clearAllMessages: true });
	emitEasyAll('GameResults', { show: false });

	if (Players.availableToPlayCount() < 2) {
		emitEasySid(data.sid, 'InfoMsg', {
			message: 'Stop playing with yourself!!!',
		});
		emitEasyAll('MyActions', {
			action: 'NewGame',
		});
		return;
	}

	Players.clearCards();

	Accounting.newDeal();

	globals.gameInitialized = true;

	// freeze
	Players.updateBreak();
	globals.gameInProgress = true;

	emitEasyAll('MyActions', {
		action: 'Ready',
	});

	let haveDealer = false;
	while (!haveDealer) {
		bcastGameMessage(`Determining dealer`);
		if (Players.availableToPlayCount() < 2) {
			bcastGameMessage('Waiting for more players to join');
			emitEasyAll('MyActions', {
				action: 'NewGame',
			});
			return;
		}

		// Clear player cards
		for (const player of Players) player.clearCards();

		if (dealer) {
			let tempDlr = Players.getNextActivePlayer();
			if (tempDlr) {
				dealer = Players.getNextActivePlayer();
			} else {
				bcastGameMessage('Waiting for more players to join');
				emitEasyAll('MyActions', {
					action: 'NewGame',
				});
				return;
			}
		} else {
			bcastGameMessage(`Determine first dealer by drawing for an Ace`);
			dealer = await getFirstDealer(); //.then((ret) => {
			// 	winston.debug(`getFirstDealer/Promise/Resolve`);
			// 	dealer = ret;
			// });
		}

		// Potential next dealer.  He can "pass"
		bcastGameMessage(`Dealer is ${dealer.name}; waiting for him/her to set game/ante or pass`);
		await DealerDialog(dealer).then((data) => {
			winston.debug(`round.js - DealerDialog resolved`);
			switch (data.action) {
				case 'accept':
					dealer.setStatus({ status: 'in', isDealer: true, lastAction: 'dealt' });
					dealerData = data;
					haveDealer = true;
					emitEasyAll('InfoGame', { game: dealerData.game });
					break;
				case 'timeout':
					console.log(`player ${player.name} put on break in Dealer dialog`);
					player.setStatus(
						{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
						true
					);
					break;
				case 'pass':
					player.setStatus(
						{ status: 'On Break', lastAction: 'pass', isOnBreak: true, highLight: false },
						true
					);
					break;
			}
		});
	}

	// at this point we have 'dealer' and 'dealerData'
	bcastGameMessage(`Dealer is ${dealer.name}; Game is ${dealerData.game}; Ante is ${dealerData.anteAmount}`);
	// Dealer has selected and picked game.  Debit his account for the ante amount
	let player = Players.getPlayerByUuid(dealer.uuid);
	Accounting.debitPlayerChips({ uuid: dealer.uuid, amount: dealerData.anteAmount });
	Accounting.creditPot({ amount: dealerData.anteAmount });
	player.refreshPlayerStatus();

	// Get Antes from other players
	winston.debug(`round.js - await getAntes`);
	await getAntes().then((e) => {
		winston.debug(`round.js - getAntes resolved`);
	});

	if (Players.availableToPlayCount() < 2) {
		bcastGameMessage('Not enough players anted!  No deal.');
		emitEasyAll('MyActions', {
			action: 'NewGame',
		});
		return;
	}

	// At this time, players with status "in" have anted and will be included in the following game
	// Ready to play.  Go to game module.
	winston.info(`Entering Game ${dealerData.game}`);
	switch (dealerData.game) {
		case "Texas Hold 'em":
			Texas();
			break;
		case 'Obama-ha':
			Omaha();
			break;
		case 'Obama-ha High Chicago':
			break;
		case 'Obama-ha Low Chicago':
			break;
		case 'Pineapple':
			Texas('Pineapple');
			break;
		case 'Five Card Draw':
			break;
		case 'Five Card Stud':
			break;
		case 'Seven Card Stud':
			break;

		default:
			winston.error(`Invalid Game: ${dealerData.game}`);
	}
}

async function DealerDialog(dealer) {
	let promise = new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			resolve({ action: 'timeout' });
		}, globals.DEALER_WAIT);
		emitEasySid(
			dealer.sockid,
			'MyActions',
			{
				miniDialog: 'Dealer',
				chips: dealer.chips,
			},
			(data) => {
				clearTimeout(timeoutId);
				resolve(data);
			}
		);
	});
	pupTag(`dealerdialog.${dealer.uuid}`);
	return await promise;
}

async function getFirstDealer() {
	try {
		winston.debug(`in getFirstDealer`);

		let card;
		let aceFound = false;

		Deck.shuffle();

		//Round robin until Ace is found
		while (!aceFound) {
			for (let i = 0; i < Players.length; i++) {
				let player = Players[i];
				await sleep(100);
				card = Deck.draw();
				player.cards.push(card.short);
				emitEasyAll('PlayerCards', { uuid: player.uuid, cards: player.cards });
				if (card.short.substr(1) === '14') {
					aceFound = true;
					player.dealer = true;
					bcastGameMessage(`We have a dealer: ${player.name}`);
					await sleep(globals.DEALER_SHOW_WAIT);
					for (const player of Players) player.clearCards();
					return player;
				}
			}
		}
	} catch (e) {
		winston.error(`in getFirstDealer %s`, e);
		throw e;
	}
}

async function getAntes() {
	let acceptResponses = true; // Set to false after time-out period
	let promises = [];
	for (const player of Players) {
		if (player.uuid !== dealer.uuid && !player.isOnBreak) {
			let promise = new Promise((resolve, reject) => {
				let timeoutId = setTimeout(() => {
					resolve({ action: 'timeout' });
				}, globals.ANTE_WAIT);
				player.setStatus({ status: 'Ante', highLight: true }, true);

				emitEasySid(
					player.sockid,
					'MyActions',
					{
						miniDialog: 'Ante',
						chips: player.chips,
						game: dealerData.game,
						anteAmount: dealerData.anteAmount,
					},
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						if (acceptResponses) {
							switch (data.action) {
								case 'pay':
									Accounting.creditPot({ amount: dealerData.anteAmount });
									Accounting.debitPlayerChips({ uuid: player.uuid, amount: dealerData.anteAmount });
									player.setStatus({ status: 'in', lastAction: 'ante', highLight: false }, true);
									break;
								case 'pass':
									player.setStatus(
										{ status: 'Skip Round', lastAction: 'Skip Round', highLight: false },
										true
									);
									break;
								case 'break':
									player.setStatus(
										{ status: 'On Break', lastAction: 'On Break', isOnBreak: true, highLight: false },
										true
									);
									break;
								case 'timeout':
									console.log(`player ${player.name} put on break in Ante dialog`);
									player.setStatus(
										{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
										true
									);

									break;
								default:
							}
							clearTimeout(timeoutId);
							resolve({ player, result: data.action });
						}
					}
				);
			});
			promises.push(promise);
		}
	}

	return await Promise.all(promises);
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
