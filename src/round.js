import { Accounting, emitClient, Players } from './controller';
import { io } from './server';
import winston from 'winston';
import * as Deck from './deck';

let dealer = null;
let dealerData = null;

export default async function Round(pData, cb) {
	let haveDealer = false;
	// freeze creates an array with participating players (not onbreak), with dealer first
	// pPlayer    getPartPlayer(uuid)  setStatusPartPlayer
	Players.freeze();

	while (!haveDealer) {
		//clear everyone's cards!!!
		Players.each((player) => {
			player.cards = [];
		});

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
				dealerData = data;
				haveDealer = true;
			}
		});
	}
	//{ account: 'accept (true/false) buyin', uuid: data.uuid, amount: data.amount }
	Accounting.debitPlayerChips({ uuid: dealer.uuid, amount: dealerData.anteAmount });
	Accounting.creditPot({ amount: dealerData.anteAmount });

	await getAntes().then(() => {
		winston.debug('getAntes/Promise/Resolve');
	});
}

// OK

function Step2() {
	console.log('we are in Step 2');
}

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
				setTimeout(() => reject('timeout'), 30000);
				io.to(player.sockid).emit(
					'PokerMessage',
					'Dialog',
					{ dialog: 'Ante', game: dealerData.game, anteAmount: dealerData.anteAmount },
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						if (acceptResponses) {
							// expect uuid: uuid, action: pay|sitout, buyinAmount: amount
							// if (data.buyinAmount) {
							// 	Accounting.debitPlayer('buyin', data.uuid, data.buyinAmount);
							// 	Accounting.creditPlayer('chips', data.uuid, data.buyinAmount);
							// }
							if (data.action === 'pay') {
								Accounting.creditPot(data.uuid, dealerData.anteAmount);
								Accounting.debitPlayer('chips', data.uuid, data.buyinAmount);
								player.status = 'in';
							} else if (data.action === 'sitout') {
								player.status = 'onBreak';
							}
							player.resolve(data.action);
						}
					}
				);
			});
			promises.push(promise);
		}
	});

	await Promise.all(promises);
	return;
}

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
