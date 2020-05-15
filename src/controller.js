import { io } from './server.js';
import fs from 'fs';
import config from './config.js';

import winston from 'winston';

import _Players from './players.js';
import { AccountingInit } from './accounting.js';
import NewDeal from './NewDeal.js';

export const ANTE_WAIT = 30000;
export const DEALER_WAIT = 1000;
export let globals = { gameInitialized: false };
export let Players = [];
export let Accounting = null;

let SockMap = new Map();

export async function emitEasyAll(type, data, ...args) {
	let actions = [];
	actions.push({
		type,
		...data,
	});
	io.emit('PokerMessage', actions, ...args);
}

export function emitEasySid(sid, type, data, fn) {
	let sock = SockMap.get(sid);

	let actions = [];
	actions.push({
		type,
		...data,
	});

	if (fn) {
		sock.emit('PokerMessage', actions, fn);
	} else {
		sock.emit('PokerMessage', actions);
	}
}

export function bcastGameMessage(message) {
	emitEasyAll('InfoMsg', { message });
}

export function bcastPlayerMessage(uuid, message) {
	emitEasyAll('PlayerShow', { uuid, message });
}

export function bcastPlayers() {
	io.emit('PokerMessage', [{ type: 'Players', players: Array.from(Players) }]);
}

export function pupTag(tag) {
	emitEasyAll('PupTag', { tag });
}

function doDump(data, fn) {
	fs.writeFileSync(`${config.dumpPath}dumpData${Date.now().toString()}.json`, JSON.stringify(data.dumpData));
	fs.writeFileSync(`${config.dumpPath}dumpDOM${Date.now().toString()}.json`, JSON.stringify(data.dom));
	fn();
}

export function initCommunication() {
	winston.info(`initCommunication - Initializing`);

	//Create the main Players object
	Players = new _Players();

	//Create the main Accounting object
	let a = AccountingInit();
	Accounting = Object.create(a);

	// add the channel (notify when 'players' has changed
	io.on('connection', (socket) => {
		SockMap.set(socket.client.id, socket);
		socket.on('ClientMessage', (indata, fn) => {
			let data = { ...indata, sid: socket.client.id };
			winston.info(`initCommunication/Client Message ${JSON.stringify(data)}`);
			switch (data.msgType) {
				case 'addPlayer':
					Players.add(data, fn);
					break;
				case 'playerReady':
					Players.ready(data, fn);
					break;
				case 'beginTable':
					NewDeal(data, fn);
					break;
				case 'startNewRound':
					NewDeal(data, fn);
					break;
				case 'doBuyIn':
					Accounting.buyin(data, fn);
					break;
				case 'doDump':
					doDump(data, fn);
					break;
				case 'abort':
					process.exit(0);
					break;
				default:
					winston.info(`initCommunication/Unrecognized msgType: ${data.msgType}`);
			}
		});
	});
}
