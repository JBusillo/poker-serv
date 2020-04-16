import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import { PlayersInit } from './players';
import { AccountingInit } from './accounting';
import Round from './round';

export let Players = null;
export let Accounting = null;
let SockMap = new Map();

export function emitClient(sid, ...args) {
	let sock = SockMap.get(sid);
	sock.emit(...args);
}

export function initCommunication() {
	winston.info(`initCommunication - Initializing`);
	Players = PlayersInit();
	Accounting = AccountingInit();
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
					Round(data, fn);
					break;
				case 'startRound':
					Round(data, fn);
					break;
				case 'dealerPass':
					Round(data, fn);
					break;
				case 'doBuyIn':
					Accounting.buyin(data, fn);
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
