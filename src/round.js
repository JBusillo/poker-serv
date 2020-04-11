import * as players from 'players';
import * as accounting from 'accounting';
import { io } from './server';

let partPlayers = [];
let promises = [];

export function startRound(pData, fn) {
	// freeze creates an array with participating players (not onbreak), with dealer first
	// pPlayer    getPartPlayer(uuid)  setStatusPartPlayer
	partPlayers = players.freeze();
	let dealer = partPlayers[0].uuid;
	let acceptResponses = true; // Set to false after time-out period
	accounting.debitPlayer('buyin', dealer, pData.anteAmount);
	accounting.creditPlayer('chips', dealer, pData.anteAmount);

	partPlayers.foreach((el) => {
		if (el.uuid !== dealer) {
			io.emit(
				'uuid',
				'Dialog',
				{ dialog: 'Ante', game: pData.game, anteAmount: pData.anteAmount },
				(data) => {
					// if promise was resolved/reject (should only happen on time-out), ignore any response
					if (acceptResponses) {
						// expect uuid: uuid, action: pay|sitout, buyinAmount: amount
						if (data.buyinAmount) {
							accounting.debitPlayer('buyin', data.uuid, data.buyinAmount);
							accounting.creditPlayer('chips', data.uuid, data.buyinAmount);
						}
						if (data.action === 'pay') {
							accounting.creditPot(data.uuid, pData.anteAmount);
							accounting.debitPlayer('chips', data.uuid, data.buyinAmount);
							players.setStatusPartPlayer(data.uuid, 'in');
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
}

// OK

function Step2() {
	console.log('we are in Step 2');
}

function getPlayer(uuid) {
	return partPlayers[partPlayers.find((e) => e.uuid === uuid)];
}

//Start Game
// Freeze Players
// Participating Players table

// Request Ante
//
// Ante Amount Specified

// One minute timer

// {msgType: "setAnte", amount amt}
// { msgType: "payAnte", uuid: uuid }
// Receive messages "Ante-Paid"
//                  "Ante-Out"

// function sleep(ms) {
// 	return new Promise((resolve) => setTimeout(resolve, ms));
// }
