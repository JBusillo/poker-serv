import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import { _Players, _Player } from './players';
import { _Table } from './table';
import { _Accounting } from './accounting';
import { _Round } from './round';
import winston from 'winston';

export let Players = new _Players();
export let Table = new _Table();
export let Accounting = new _Accounting();
export let Round = new _Round();
let SockMap = new Map();

export function emitClient(sid, ...args) {
	let sock = SockMap.get(sid);
	sock.emit(...args);
}

export function initCommunication() {
	winston.info(`initCommunication - Initializing`);
	// add the channel (notify when 'players' has changed
	io.on('connection', (socket) => {
		socket.on('ClientMessage', (indata, fn) => {
			SockMap.set(socket.client.id, socket);
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
					Table.start(data, fn);
					break;
				case 'startRound':
					Table.start(data, fn);
					break;
				case 'dealerPass':
					Table.start(data, fn);
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
