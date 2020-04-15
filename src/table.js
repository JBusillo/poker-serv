import { io } from './server';
import winston from 'winston';
import { Players, Round, emitClient } from './controller';
import * as Deck from './deck';

function _Table() {
	this.hasBegun = false;
	this.start = async function (data, cb) {
		try {
			winston.info(`in startTable`);

			let card;

			io.emit('PokerMessage', 'GameStatus', {
				message: `Shuffling the deck...`,
			});

			//clear everyone's cards!!!
			Players.each((player) => {
				player.cards = [];
			});

			Deck.shuffle();
			let aceFound = false;

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
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { _Table };
