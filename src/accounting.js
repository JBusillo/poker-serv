import { io } from './server';
import winston from 'winston';
import { Players } from './controller';

export function AccountingInit() {
	let Accounting = new Map();
	Accounting.Pot = 0;
	// debitPlayer -- data: {uuid, amount}
	Accounting.debitPlayer = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.buyin -= data.amount;
	};

	Accounting.debitPlayerChips = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.chips -= data.amount;
	};
	Accounting.creditPlayerChips = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.chips += data.amount;
	};

	Accounting.debitPot = function (data, cb) {
		Accounting.pot -= data.amount;
	};
	Accounting.creditPot = function (data, cb) {
		Accounting.pot += data.amount;
	};

	Accounting.buyin = function (data, cb) {
		Accounting.debitPlayer({ uuid: data.uuid, amount: data.amount });
		Accounting.creditPlayerChips({ uuid: data.uuid, amount: data.amount });
		let player = Players.getPlayerByUuid(data.uuid);
		if (cb) {
			Players.refreshAll();
			cb({ status: 'OK', chips: player.chips });
		}
	};

	return Accounting;
}
