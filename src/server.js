import config from './config/Config.js';
import { winster } from './support/Winster.js';
import winston from 'winston';
import { initCommunication } from './support/Controller.js';

export let app;
export let server;
export let io;

export async function startUp() {
	await winster();

	if (config.environment === 'development') {
		const { spawn } = require('child_process');
		const ls = spawn('touch', ['D:/Projects/poker/src/Game.svelte']);
		ls.on('close', (code) => {
			console.log(`touched GUI`);
		});
	}

	winston.info(`Node Version`);
	winston.info(`Current Directory is ${__dirname}`);

	await initCommunication();
}
