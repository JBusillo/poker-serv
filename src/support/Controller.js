import { _initWebSocket, _emitEasyAll, _emitEasySid } from '../communication/SockWs';

import { EventEmitter } from 'events';
import fs from 'fs';
import config from '../config/Config.js';
import winston from 'winston';
import _Players from '../Players.js';
import { AccountingInit } from '../Accounting.js';
import { globals } from './globals';

export let Players = [];
export let Accounting = null;

// for pausing/resume event
export const resumeEvent = new EventEmitter();

let SockMap = new Map();

export async function emitEasyAll(type, data, ...args) {
	_emitEasyAll(type, data, ...args);
}

export function emitEasySid(sid, type, data, fn) {
	_emitEasySid(sid, type, data, fn);
}

export function bcastGameMessage(message) {
	_emitEasyAll('InfoMsg', { message });
}

export function bcastPlayerMessage(uuid, message) {
	_emitEasyAll('PlayerShow', { uuid, message });
}

export function disconnect(sid) {
	let sock = SockMap.get(sid);
	sock.disconnect(true);
}

export function pupTag(tag) {
	_emitEasyAll('PupTag', { tag });
}

export async function initCommunication() {
	winston.info(`initCommunication`);

	await _initWebSocket();

	// import(/* webpackChunkName: "test" */ config.socketModule)
	// 	.then((obj) => {
	// 		console.log('Imported Module');
	// 	})
	// 	.catch((err) => {
	// 		console.log(`Module Load Failed: ${JSON.stringify(err)}`);
	// 	});

	//Create the main Players object
	Players = new _Players();

	//Create the main Accounting object
	let a = AccountingInit();
	Accounting = Object.create(a);
}
export function doDump(data, fn) {
	fs.writeFileSync(`${config.dumpPath}dumpData${Date.now().toString()}.json`, JSON.stringify(data.dumpData));
	fs.writeFileSync(`${config.dumpPath}dumpDOM${Date.now().toString()}.json`, JSON.stringify(data.dom));
	fn();
}

export function goOnBreak(data, fn) {
	let player = Players.getPlayerBySockId(data.sid);
	if (player) {
		if (!globals.gameInProgress) player.setStatus({ isOnBreak: true, status: 'On Break' });
		player.setStatus({ isOnBreakNextRound: true }, true);
		console.log(`Controller:goOnBreak player ${player.name}`);
	}
	if (fn) fn();
}

export function goOffBreak(data, fn) {
	let player = Players.getPlayerBySockId(data.sid);
	if (player) {
		if (!globals.gameInProgress) player.setStatus({ isOnBreak: false, status: 'Ready' });
		player.setStatus({ isOnBreakNextRound: false }, true);
		console.log(`Controller:goOffBreak player ${player.name}`);
	}
	if (fn) fn();
}

export function gamePause() {
	globals.pauseGame = true;
}

export function gameResume() {
	resumeEvent.emit('resume');
}

export function doAbort() {
	emitEasyAll('Reload', {});
	process.exit(0);
}
