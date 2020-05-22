import { v4 as uuidv4 } from 'uuid';
import { emitEasyAll, emitEasySid, disconnect, globals } from './Controller.js';
import winston from 'winston';
import Player from './Player.js';

export default function _Players() {}

_Players.prototype = new Array();

_Players.prototype.valueOf = function () {
	return Array.from(this);
};

_Players.prototype.add = function (data, cb) {
	try {
		winston.info(`'addPlayer ${JSON.stringify(data)}`);

		let player = this.getPlayerByUuid(data.uuid);

		// Give this player a list of all current players
		emitEasySid(data.sid, 'Players', { players: Array.from(this) });

		if (!player) {
			winston.info(`'adding player to table, uuid = ${data.uuid}`);

			player = new Player(data.uuid, data.player, data.sid);
			this.push(player);

			// Give everyone (including this player) this new player
			player.refreshNewPlayer();
			player.setActions({ action: 'Initial', gameInit: globals.gameInitialized });
		} else {
			disconnect(player.sockid);
			player.setStatus({ sockid: data.sid });
			player.setActions({ action: 'Initial', gameInit: globals.gameInitialized, onBreak: true });
			player.refreshPlayerStatus();
		}

		cb();
	} catch (e) {
		winston.error(`Error in player.add ${e.message}`);
	}
};

_Players.prototype.clearCards = function () {
	this.forEach((player) => {
		player.setStatus({ cards: [], dummyCards: [], totalBetThisRound: 0 });
	});
	// And clear my own cards
	emitEasyAll('MyCards', {
		cards: [],
	});

	// And clear table cards
	globals.tableCards = [];
	emitEasyAll('TableCards', {
		cards: globals.tableCards,
	});

	// And clear cards dealt to players
	emitEasyAll('PlayerCards', { cards: [] });
};

_Players.prototype.refreshAll = function () {
	emitEasyAll('Players', { players: Array.from(this) });
};

_Players.prototype.getNextActivePlayer = function () {
	let playerIx = this.findIndex((e) => e.isDealer);

	for (let i = playerIx + 1; i < this.length; i++) {
		if (!this[i].isOnBreak) {
			this[i].isDealer = true;
			this[i].setStatus({ isDealer: true });
		}
		return this[i];
	}
	for (let i = 0; i <= playerIx; i++) {
		if (!this[i].isOnBreak) {
			this[i].setStatus({ isDealer: true });
		}
		return this[i];
	}
	console.log(`Players.getNextActivePlayer No Dealer Found!!`);
	return null;
};

_Players.prototype.getPlayerByUuid = function (uuid) {
	return this.find((e) => e.uuid === uuid);
};

_Players.prototype.getPlayerBySockId = function (sockId) {
	return this.find((e) => e.sockid === sockId);
};

_Players.prototype.activeCount = function () {
	let count = 0;
	this.forEach((player) => {
		if (['in', 'side-pot'].includes(player.status)) count++;
	});
	console.log(`Players.activeCount: ${count}`);
	return count;
};

_Players.prototype.availableToPlayCount = function () {
	let count = 0;
	this.forEach((player) => {
		if (!player.isOnBreakNextRound && player.chips > 0) count++;
	});
	return count;
};

_Players.prototype.updateBreak = function () {
	this.forEach((player) => {
		if (player.isOnBreakNextRound) {
			player.setStatus({ status: 'On Break', isOnBreak: true, isOnBreakNextRound: true }, true);
			console.log(`Players:freeze ${player.name} put on Break`);
		} else {
			player.setStatus({ status: 'Ready', isOnBreak: false, isOnBreakNextRound: false }, true);
		}
		this.refreshAll();
	});
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
