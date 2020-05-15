import { v4 as uuidv4 } from 'uuid';
import { bcastGameMessage, emitEasyAll, emitEasySid, globals } from './controller.js';
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

		// Generate uuid if none passed
		let uuid = data.uuid ? data.uuid : uuidv4();

		let player = this.getPlayerByUuid(uuid);

		// Give this player a list of all current players
		emitEasySid(data.sid, 'Players', { players: Array.from(this) });

		if (!player) {
			winston.info(`'adding player to table, uuid = ${uuid}`);

			player = new Player(uuid, data.player, data.sid);
			this.push(player);
			emitEasySid(data.sid, 'InfoName', { name: player.name });

			// Give everyone (including this player) this new player
			player.refreshNewPlayer();
		}

		player.setActions({ action: 'Initial', gameInit: globals.gameInitialized, onBreak: player.isOnBreak });

		// Send the new player its assigned uuid
		cb({ uuid });
	} catch (e) {
		winston.error(`Error in player.add ${e.message}`);
	}
};

_Players.prototype.clearCards = function () {
	this.forEach((player) => {
		player.setStatus({ cards: [], dummyCards: [] });
	});
	// And clear my own cards
	emitEasyAll('MyCards', {
		cards: [],
	});

	// And clear table cards
	emitEasyAll('TableCards', {
		cards: [],
	});

	// And clear cards dealt to players
	emitEasyAll('PlayerCards', { cards: [] });
};

_Players.prototype.refreshAll = function () {
	emitEasyAll('Players', { players: Array.from(this) });
};

//// Fix This -- no direct assignments!!!!
_Players.prototype.getNextActivePlayer = function () {
	let p = this.findIndex((e) => e.isDealer);
	this[p].isDealer = false;

	for (let i = p + 1; i < this.length; i++) {
		if (!this[i].isOnBreak) {
			this[i].isDealer = true;
		}
		return this[i];
	}
	for (let i = 0; i <= p; i++) {
		if (!this[i].isOnBreak) {
			this[i].isDealer = true;
		}
		return this[i];
	}
	return this[0];
};

_Players.prototype.getPlayerByUuid = function (uuid) {
	return this.find((e) => e.uuid === uuid);
};

_Players.prototype.activeCount = function () {
	let count = 0;
	this.forEach((player) => {
		if (['in', 'side-pot'].includes(player.status)) count++;
	});
	return count;
};

_Players.prototype.activePlayers = function () {
	let players = [];
	this.forEach((player) => {
		if (['in', 'side-pot'].includes(player.status)) players.push(player);
	});
	players;
};

_Players.prototype.freeze = function freeze() {
	this.forEach((player) => {
		if (!player.isOnBreak) {
			player.setStatus({ status: 'Ready' }, true);
		}
		this.refreshAll();
	});
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
