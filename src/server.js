import http from 'http';
import SocketIo from 'socket.io';
import config from './config.js';
import { winster } from './winster';
import winston from 'winston';
import { initCommunication } from './controller';

export let app;
export let server;
export let io;

export async function startUp() {
	await winster();

	if (config.environment === 'development') {
		const { spawn } = require('child_process');
		const ls = spawn('touch', ['D:Projects\\poker\\src\\Game.svelte']);
		ls.on('close', (code) => {
			console.log(`touched GUI`);
		});
	}

	app = await http.createServer(() => {});
	io = await SocketIo(app);

	winston.info(`Node Version`);
	winston.info(`Current Directory is ${__dirname}`);

	initCommunication();

	app.listen(config.port);
	winston.info(`Listening on ${config.port}`);
}
