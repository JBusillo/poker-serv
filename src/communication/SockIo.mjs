import winston from 'winston';
import RouteTable from '../support/RouteTable.mjs';
import http from 'http';
import config from '../config/Config.js';
import SocketIo from 'socket.io';

let io;
let app;
let SockMap = new Map();

export async function _initWebSocket() {
	app = await http.createServer(() => {});
	io = await new SocketIo(app, { pingTimeout: 10000 });
	app.listen(config.port);
	winston.info(`Listening on ${config.port}`);
	_initCommunication();
}

export async function _emitEasyAll(type, data, ...args) {
	let actions = [];
	actions.push({
		type,
		...data,
	});
	io.emit('PokerMessage', actions, ...args);
}

export function _emitEasySid(sid, type, data, fn) {
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

export function _disconnect(sid) {
	let sock = SockMap.get(sid);
	sock.disconnect(true);
}

function _initCommunication() {
	winston.info(`initCommunication - Socket.IO module`);

	io.on('connection', (socket) => {
		SockMap.set(socket.client.id, socket);
		socket.on('ClientMessage', (indata, fn) => {
			let data = { ...indata, sid: socket.client.id };
			RouteTable(data, fn);
		});

		socket.on('error', (error) => {
			console.log(`On error ${JSON.stringify(error)}`);
		});

		socket.on('disconnecting', (reason) => {
			console.log(`On disconnecting ${reason}`);
		});

		// socket.on('disconnect', (reason) => {
		// 	for (let p of Players) {
		// 		if (p.sockid === socket.client.id) {
		// 			console.log(`player ${p.name} disconnected, reason: ${reason}`);
		// 			p.setStatus(
		// 				{ status: 'Disconnected', isDisconnected: true, isOnBreak: true, isOnBreakNextRound: true },
		// 				true
		// 			);
		// 		}
		// 	}
		// });
	});
}
