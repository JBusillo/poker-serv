import { EventEmitter } from 'events';
import { io } from './Server.js';
import fs from 'fs';
import config from './config/Config.js';
import winston from 'winston';
import _Players from './Players.js';
import { AccountingInit } from './Accounting.js';
import NewDeal from './NewDeal.js';

export let globals = {
	gameInitialized: false,
	pauseGame: false,
	tableCards: [],
	gameInProgress: false,

	// Wait Constants
	ANTE_WAIT: 120000,
	DEALER_SHOW_WAIT: 1000,
	DEALER_WAIT: 120000,
	BET_WAIT: 120000,
	SHOW_WAIT: 120000,
	DISCARD_WAIT: 120000,
};
export let Players = [];
export let Accounting = null;

// for pausing/resume event
export const resumeEvent = new EventEmitter();

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

export function disconnect(sid) {
	let sock = SockMap.get(sid);
	sock.disconnect(true);
}

export function bcastPlayers() {
	io.emit('PokerMessage', [{ type: 'Players', players: Array.from(Players) }]);
}

export function pupTag(tag) {
	emitEasyAll('PupTag', { tag });
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
			// flush queue if not sign-in request, and the player isn't signed in
			// flush queue if not sign-in request, and the player isn't signed in
			// flush queue if not sign-in request, and the player isn't signed in
			// flush queue if not sign-in request, and the player isn't signed in
			// flush queue if not sign-in request, and the player isn't signed in
			// flush queue if not sign-in request, and the player isn't signed in
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
				case 'goOnBreak':
					goOnBreak(data, fn);
					break;
				case 'goOffBreak':
					goOffBreak(data, fn);
					break;
				case 'pauseGame':
					gamePause();
					break;
				case 'resumeGame':
					gameResume();
					break;
				case 'abort':
					doAbort();
					break;
				default:
					winston.info(`initCommunication/Unrecognized msgType: ${data.msgType}`);
			}
		});
		socket.on('disconnect', (reason) => {
			for (let p of Players) {
				if (p.sockid === socket.client.id) {
					console.log(`player ${p.name} disconnected, reason: ${reason}`);
					p.setStatus({ status: 'Disconnected', isOnBreak: true, isOnBreakNextRound: true }, true);
				}
			}
		});
	});
}
function doDump(data, fn) {
	fs.writeFileSync(`${config.dumpPath}dumpData${Date.now().toString()}.json`, JSON.stringify(data.dumpData));
	fs.writeFileSync(`${config.dumpPath}dumpDOM${Date.now().toString()}.json`, JSON.stringify(data.dom));
	fn();
}

function goOnBreak(data, fn) {
	let player = Players.getPlayerBySockId(data.sid);
	if (player) {
		if (!globals.gameInProgress) player.setStatus({ isOnBreak: true, status: 'On Break' });
		player.setStatus({ isOnBreakNextRound: true }, true);
		console.log(`Controller:goOnBreak player ${player.name}`);
	}
	if (fn) fn();
}

function goOffBreak(data, fn) {
	let player = Players.getPlayerBySockId(data.sid);
	if (player) {
		if (!globals.gameInProgress) player.setStatus({ isOnBreak: false, status: 'Ready' });
		player.setStatus({ isOnBreakNextRound: false }, true);
		console.log(`Controller:goOffBreak player ${player.name}`);
	}
	if (fn) fn();
}

function gamePause() {
	globals.pauseGame = true;
}

function gameResume() {
	resumeEvent.emit('resume');
}

function doAbort() {
	emitEasyAll('Reload', {});
	process.exit(0);
}
