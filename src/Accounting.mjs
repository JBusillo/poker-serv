import { Players, emitEasyAll } from './support/Controller.mjs';

export function AccountingInit() {
	let Accounting = new Map();

	Accounting.Pot = 0;
	// debitPlayer -- data: {uuid, amount}
	Accounting.debitPlayer = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.setStatus({ buyIn: (player.buyIn -= data.amount) });
	};
	Accounting.debitPlayerChips = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.setStatus({
			chips: (player.chips -= data.amount),
			totalBetThisRound: (player.totalBetThisRound += data.amount),
		});
	};
	Accounting.creditPlayerChips = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		player.setStatus({ chips: (player.chips += data.amount) });
	};

	Accounting.debitPot = function (data, cb) {
		this.Pot -= data.amount;
		emitEasyAll('InfoPot', { pot: this.Pot });
	};
	Accounting.creditPot = function (data, cb) {
		this.Pot += data.amount;
		emitEasyAll('InfoPot', { pot: this.Pot });
	};

	Accounting.newDeal = function (data, cb) {
		this.Pot = 0;
		emitEasyAll('InfoPot', { pot: this.Pot });
	};

	Accounting.buyin = function (data, cb) {
		let player = Players.getPlayerByUuid(data.uuid);
		if (player.chips >= 1000) {
			if (cb)
				cb({
					status: 'FAILED',
					chips: player.chips,
					errorMessage: "Can't buy, wait until chip balance is under $10",
				});
			return;
		}
		Accounting.debitPlayer({ uuid: data.uuid, amount: data.amount });
		Accounting.creditPlayerChips({ uuid: data.uuid, amount: data.amount });
		player.setStatus({ lastAction: 'buyin' }, true);
		if (cb) {
			Players.refreshAll();
			cb({ status: 'OK', chips: player.chips });
		}
	};

	return Accounting;
}
