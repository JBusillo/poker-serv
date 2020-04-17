import { Accounting, emitClient, Players } from './controller';
import { io } from './server';
import winston from 'winston';
import * as Deck from './deck';
import texas from './texas';

let dealer = null;
let dealerData = null;

export default async function Round(pData, cb) {
	let haveDealer = false;
	// freeze creates an array with participating players (not onbreak), with dealer first
	// pPlayer    getPartPlayer(uuid)  setStatusPartPlayer
	Players.freeze();

	while (!haveDealer) {
		//clear everyone's cards!!!
		// Players.each((player) => {
		// 	player.cards = [];
		// });

		Players.forEach((p) => (p.cards = []));

		if (dealer) {
			dealer = Players.getNextActivePlayer();
		} else {
			await getFirstDealer().then((ret) => {
				winston.debug('getFirstDealer/Promise/Resolve');
				dealer = ret;
			});
		}

		await DealerDialog(dealer).then((data) => {
			winston.debug('DealerDialog/Promise/Resolve');
			if (data.accept) {
				dealer.setStatus('in', true);
				dealerData = data;
				haveDealer = true;
			}
		});
	}
	//{ account: 'accept (true/false) buyin', uuid: data.uuid, amount: data.amount }
	Accounting.debitPlayerChips({ uuid: dealer.uuid, amount: dealerData.anteAmount });
	Accounting.creditPot({ amount: dealerData.anteAmount });

	await getAntes().then((e) => {
		winston.debug('getAntes/Promise/Resolve');
	});

	// "Texas Hold 'em",
	// "Obama-ha",
	// "Obama-ha High Chicago",
	// "Obama-ha Low Chicago",
	// "Pineapple",
	// "Five Card Draw",
	// "Five Card Stud",
	// "Seven Card Stud"

	switch (dealerData.game) {
		case "Texas Hold 'em":
			texas();
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
			console.log(`Invalid Game: ${dealerData.game}`);
	}
}

// OK

function Step2() {}

async function DealerDialog(dealer) {
	let promise = new Promise((resolve, reject) => {
		emitClient(
			dealer.sockid,
			'PokerMessage',
			'Dialog',
			{
				dialog: 'Dealer',
				chips: dealer.chips,
			},
			//accept (true/false), anteAmount, game
			(data) => {
				resolve(data);
			}
		);
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
				emitClient(player.sockid, 'PokerMessage', 'MyCards', {
					cards: player.cards,
				});
				io.emit('PokerMessage', 'GameStatus', {
					message: `${player.name} drew the ${card.long}`,
				});
				if (card.short.substr(1) === '14') {
					aceFound = true;
					player.dealer = true;
					io.emit('PokerMessage', 'GameStatus', {
						message: `We have a dealer: ${player.name}`,
					});

					return player;
				}
			}
		}
	} catch (e) {
		winston.error('in getFirstDealer %s', e);
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
					player.status = 'On Break';
					resolve({ player, result: 'timeout' });
				}, 30000);

				player.setStatus('Ante');
				emitClient(
					player.sockid,
					'PokerMessage',
					'Dialog',
					{ dialog: 'Ante', game: dealerData.game, anteAmount: dealerData.anteAmount },
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						if (acceptResponses) {
							switch (data.action) {
								case 'pay':
									Accounting.creditPot({ amount: dealerData.anteAmount });
									Accounting.debitPlayerChips({ uuid: player.uuid, amount: dealerData.anteAmount });
									player.setStatus('in', true);
									break;
								case 'pass':
									player.setStatus('Skip Round', true);
									break;
								case 'break':
									player.setStatus('On Break', true);
									break;
								default:
							}

							resolve({ player, result: data.action });
						}
					}
				);
			});
			Players.refreshAll();
			promises.push(promise);
		}
	});

	return await Promise.all(promises);
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
