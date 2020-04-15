import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import { Table, Players } from './controller';
import winston from 'winston';

function _Player(playerObj) {
	this.uuid = playerObj.uuid;
	this.name = playerObj.name;
	this.sockid = playerObj.sockid;
	this.chips = 0;
	this.buyin = 0;
	this.dealer = false;
	this.status = 'wait';
	this.onBreak = false;
	this.cards = [];
	this.actions = [];
}

function _Players() {
	this.players = [];
	this.partPlayers = [];
	// Round Robin "next" on partPlayers
	this.partPlayers.next = function (uuid) {
		let ix = this.partPlayers.findIndex((e) => e.uuid === uuid);
		return this.partPlayers[ix >= this.partPlayers.length ? 0 : ix];
	};
	this.add = function (data, cb) {
		try {
			winston.info(`'addPlayer ${data}`);
			let player;

			// Generate uuid if none passed
			let uuid = data.uuid;
			if (!uuid) uuid = uuidv4();

			player = this.find(uuid);

			if (!player) {
				winston.info(`'adding player to table, uuid = ${uuid}`);
				player = new _Player({
					uuid,
					name: data.player,
					sockid: data.sid,
				});

				this.players.push(player);
			}
			this.refreshUI();

			io.emit('PokerMessage', 'GameStatus', {
				message: `${player.name} joined the table!!!`,
			});

			io.to(data.sid).emit('PokerMessage', 'MyActions', {
				buttons: [{ id: 'myStart', text: 'StartGame', bguid: 'testing' }],
			});

			//			io.emit(uuid, 'MyActions', { buttons: [{ id: 'myStart', text: 'StartGame', bguid: 'testing' }] });

			cb({ uuid });
		} catch (e) {
			winston.error(`Error in player.add ${e.message}`);
		}
	};

	this.get = function () {
		return this.players;
	};

	this.refreshUI = function () {
		io.emit('PokerMessage', 'PlayerStatus', { players: this.players, options: { hasBegun: Table.hasBegun } });
	};

	this.each = async function (cb) {
		let p = Players.get();
		for (let i = 0; i < p.length; i++) {
			let res = await cb(p[i]);
			if (res === 'break') break;
		}
	};

	this.find = function (uuid) {
		return this.players.find((e) => e.uuid === uuid);
	};

	this.freeze = function () {
		let foundDealer = false;
		let before = [];
		let after = [];
		this.each((el) => {
			if (!el.onBreak) {
				let player = { uuid: el.uuid, name: el.name, chips: el.chips, cards: [], status: 'ante-up' };
				player.uuid = el.uuid;
				if (el.dealer) {
					player.status = 'in';
					foundDealer = true;
				}
				if (foundDealer) {
					before.push(player);
				} else {
					after.push(player);
				}
			}
			this.partPlayers = [...before, ...after];
		});
	};
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { _Players, _Player };
