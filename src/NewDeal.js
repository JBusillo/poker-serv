//import { EventEmitter } from 'events';

import {
	ANTE_WAIT,
	DEALER_WAIT,
	globals,
	bcastGameMessage,
	Accounting,
	Players,
	emitEasyAll,
	emitEasySid,
	pupTag,
	pauseGame,
	resumeEvent,
} from './controller.js';
import winston from 'winston';
import * as Deck from './deck.js';
import Texas from './texas.js';

let dealer = null;

export let dealerData = null;

export default async function NewDeal() {
	//Reset Pot

	if (globals.pauseGame) {
		bcastGameMessage(`Game is Paused`);
		await new Promise((resolve) => {
			globals.pauseGame = false;
			resumeEvent.once('resume', resolve);
		});
	}

	Accounting.newDeal();

	//Reset any player counters
	for (let i = 0; i < Players.length; i++) {
		let player = Players[i];
		player.setStatus({ isSidePot: false, sidePotAmount: 0 });
	}

	globals.gameInitialized = true;

	// freeze -  freezes who can participate in this upcoming game
	Players.freeze();

	emitEasyAll('MyActions', {
		action: 'Ready',
	});

	let haveDealer = false;
	while (!haveDealer) {
		bcastGameMessage(`Determining dealer`);

		// Clear player cards
		Players.forEach((player) => player.clearCards());

		if (dealer) {
			dealer = Players.getNextActivePlayer();
		} else {
			bcastGameMessage(`Determine first dealer by drawing for an Ace`);
			await getFirstDealer().then((ret) => {
				winston.debug(`getFirstDealer/Promise/Resolve`);
				dealer = ret;
			});
		}

		// Potential next dealer.  He can "pass"
		bcastGameMessage(`Dealer is ${dealer.name}; waiting for him/her to set game/ante or pass`);
		await DealerDialog(dealer).then((data) => {
			winston.debug(`round.js - DealerDialog resolved`);
			if (data.accept) {
				dealer.setStatus({ status: 'in', isDealer: true, lastAction: 'dealt' });
				dealerData = data;
				haveDealer = true;
				emitEasyAll('InfoGame', { game: dealerData.game });
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

	// At this time, players with status "in" have anted and will be included in the following game

	// Ready to play.  Go to game module.
	winston.info(`Entering Game ${dealerData.game}`);
	switch (dealerData.game) {
		case "Texas Hold 'em":
			Texas();
			break;
		case 'Obama-ha':
			break;
		case 'Obama-ha High Chicago':
			break;
		case 'Obama-ha Low Chicago':
			break;
		case 'Pineapple':
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
		emitEasySid(dealer.sockid, 'Dialog', { dialog: 'Dealer', chips: dealer.chips }, (data) => {
			resolve(data);
		});
		pupTag(`dealerdialog.${dealer.uuid}`);
	});
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
					await sleep(DEALER_WAIT);
					Players.forEach((player) => player.clearCards());
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
	Players.forEach((player) => {
		if (player.uuid !== dealer.uuid) {
			let promise = new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve({ action: 'timeout' });
				}, ANTE_WAIT);
				player.setStatus({ status: 'Ante', highLight: true }, true);

				let actions = [];
				actions.push({
					type: 'Dialog',
					dialog: 'Ante',
					chips: dealer.chips,
					game: dealerData.game,
					anteAmount: dealerData.anteAmount,
				});

				emitEasySid(
					player.sockid,
					'Dialog',
					{ dialog: 'Ante', chips: dealer.chips, game: dealerData.game, anteAmount: dealerData.anteAmount },
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
									player.setStatus(
										{ status: 'On Break', lastAction: 'Time-Out', isOnBreak: true, highLight: false },
										true
									);

									break;
								default:
							}

							resolve({ player, result: data.action });
						}
					}
				);
			});
			promises.push(promise);
		}
	});

	return await Promise.all(promises);
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
