import { Players, Accounting, emitClient } from './controller';
import { io } from './server';
import winston from 'winston';
import * as Deck from './deck';

function _Round() {
	this.roundNumber = 0;
	this.dealer = null;

	this.dealerPass = function (pData, cb) {
		let dealerUuid = Players.partPlayers.next();
	};

	this.start = function (pData, cb) {
		let promises = [];
		// freeze creates an array with participating players (not onbreak), with dealer first
		// pPlayer    getPartPlayer(uuid)  setStatusPartPlayer
		Players.freeze();

		//clear everyone's cards!!!
		Players.each((player) => {
			player.cards = [];
		});

		if (this.dealer) {
			this.dealer = Players.partPlayers.next();
		} else {
			this.dealer = this.getFirstDealer();
		}

		emitClient(
			player.sockid,
			'PokerMessage',
			'Dialog',
			{
				dialog: 'Dealer',
				chips: player.chips,
			},
			(data) => {}
		);

		let dealer = Players.partPlayers[0].uuid;
		let acceptResponses = true; // Set to false after time-out period
		//{ account: 'buyin', uuid: data.uuid, amount: data.amount }
		Accounting.debit({ account: 'chips', player: dealer, amount: pData.anteAmount });
		Accounting.credit({ account: 'pot', player: dealer, amount: pData.anteAmount });

		Players.partPlayers.foreach((el) => {
			if (el.uuid !== dealer) {
				io.to(el.sockid).emit(
					'PokerMessage',
					'Dialog',
					{ dialog: 'Ante', game: pData.game, anteAmount: pData.anteAmount },
					(data) => {
						// if promise was resolved/reject (should only happen on time-out), ignore any response
						if (acceptResponses) {
							// expect uuid: uuid, action: pay|sitout, buyinAmount: amount
							if (data.buyinAmount) {
								Accounting.debitPlayer('buyin', data.uuid, data.buyinAmount);
								Accounting.creditPlayer('chips', data.uuid, data.buyinAmount);
							}
							if (data.action === 'pay') {
								Accounting.creditPot(data.uuid, pData.anteAmount);
								Accounting.debitPlayer('chips', data.uuid, data.buyinAmount);
								Players.setStatusPartPlayer(data.uuid, 'in');
							} else if (data.action === 'sitout') {
							}
							el.resolve(data.action);
						}
					}
				);

				el.promise = new Promise((resolve, reject) => {
					el.resolve = resolve;
					setTimeout(() => reject('timeout'), 30000);
				});
				promises.push(el.promise);
			}
		});
		Promise.all(promises).then(() => {
			Step2();
		});
	};
}

// OK

function Step2() {
	console.log('we are in Step 2');
}

function getPlayer(uuid) {
	return Players.partPlayers[Players.partPlayers.find((e) => e.uuid === uuid)];
}

this.getFirstDealer = function () {
	this.hasBegun = false;
	this.start = async function (data, cb) {
		try {
			winston.info(`in startTable`);

			let card;
			let aceFound = false;

			Deck.shuffle();

			//Round robin until Ace is found
			while (!aceFound) {
				for (let i = 0; i < Players.players.length; i++) {
					let player = Players.players[i];
					await sleep(300);
					card = Deck.draw();
					player.cards.push(card.short);
					io.to(data.sid).emit('PokerMessage', 'MyCards', { cards: player.cards });
					io.emit('PokerMessage', 'GameStatus', {
						message: `${player.name} drew the ${card.long}`,
					});
					if (card.short.substr(1) === '14') {
						aceFound = true;
						player.dealer = true;
						io.emit('PokerMessage', 'GameStatus', {
							message: `We have a dealer: ${player.name}`,
						});
						Round.start();
						console.log(`before emit uuid = ${player.uuid}`);
						console.log(`before emit socketid = ${player.sockid}`);

						emitClient(
							player.sockid,
							'PokerMessage',
							'Dialog',
							{
								dialog: 'Dealer',
								chips: player.chips,
							},
							(data) => {}
						);
						break;
					}
				}
			}
		} catch (e) {
			winston.error('in startTable %s', e);
			throw e;
		}
	};
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

//

module.exports = { _Round };
