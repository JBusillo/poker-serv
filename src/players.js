import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import { Players, emitClient } from './controller';
import winston from 'winston';

function PlayerInit(overrides) {
	let player = {
		uuid: null,
		name: null,
		sockid: null,
		chips: 0,
		buyin: 0,
		dealer: false,
		status: 'wait',
		onBreak: false,
		cards: [],
		actions: [],
		...overrides,
	};

	player.refresh = function () {
		io.emit(player.sockid, 'PlayerStatus', { players: Players, options: { hasBegun: false } });
	};

	return player;
}

// let playerDefault = {
// 	uuid: null,
// 	name: null,
// 	sockid: null,
// 	chips: 0,
// 	buyin: 0,
// 	dealer: false,
// 	status: 'wait',
// 	onBreak: false,
// 	cards: [],
// 	actions: [],
// };

export function PlayersInit() {
	winston.info(`start of PlayersInit`);
	let Players = [];

	Players.add = function (data, cb) {
		try {
			winston.info(`'addPlayer ${data}`);
			let player;

			// Generate uuid if none passed
			let uuid = data.uuid ? data.uuid : uuidv4();

			player = Players.getPlayerByUuid(uuid);

			if (!player) {
				winston.info(`'adding player to table, uuid = ${uuid}`);
				player = PlayerInit({ uuid, name: data.player, sockid: data.sid });
				Players.push(player);
			}

			Players.refreshAll();

			io.emit('PokerMessage', 'GameStatus', {
				message: `${player.name} joined the table!!!`,
			});

			emitClient(player.sockid, 'PokerMessage', 'MyActions', {
				buttons: [{ id: 'myStart', text: 'StartGame', bguid: 'testing' }],
			});

			cb({ uuid });
		} catch (e) {
			winston.error(`Error in player.add ${e.message}`);
		}
	};

	// function _Players() {
	// 	this.players = [];
	// 	this.partPlayers = [];
	// 	// Round Robin "next" on partPlayers
	// 	this.partPlayers.next = function (uuid) {
	// 		let ix = this.partPlayers.findIndex((e) => e.uuid === uuid);
	// 		return this.partPlayers[ix >= this.partPlayers.length ? 0 : ix];
	// 	};

	Players.refreshAll = function () {
		io.emit('PokerMessage', 'PlayerStatus', { players: Players, options: { hasBegun: false } });
	};

	Players.refreshOne = function (player) {
		io.emit(player.sockid, 'PlayerStatus', { players: Players, options: { hasBegun: false } });
	};

	Players.getNextActivePlayer = function () {
		winston.error('Todo: getNextActivePlayer');
		return Players[0];
		// return player
	};

	Players.each = async function (cb) {
		let p = Players;
		for (let i = 0; i < p.length; i++) {
			let res = await cb(p[i]);
			if (res === 'break') break;
		}
	};

	Players.getPlayerByUuid = function (uuid) {
		return Players.find((e) => e.uuid === uuid);
	};

	Players.freeze = function freeze() {
		// let foundDealer = false;
		// let before = [];
		// let after = [];
		Players.each(
			(player) => {
				if (!player.onBreak) {
					player.status = player.dealer ? 'in' : 'wait-dealer';
				}
				// if (foundDealer) {
				// 	before.push(player);
				// } else {
				// 	after.push(player);
				// }
			}
			// this.partPlayers = [...before, ...after];
		);
	};
	winston.info(`return of PlayersInit`);
	return Players;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
