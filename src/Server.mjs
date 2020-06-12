import config from './config/Config.mjs';
import { winster } from './support/Winster.mjs';
import winston from 'winston';
import { initCommunication } from './support/Controller.mjs';

export let app;
export let server;
export let io;

export async function startUp() {
	await winster();

	if (config.environment === 'development') {
		const cp = await import('child_process');
		const ls = cp.spawn('touch', ['D:/Projects/poker/src/Game.svelte']);
		ls.on('close', (code) => {
			console.log(`touched GUI`);
		});
	}

	winston.info(`Node Version`);
	//	winston.info(`Current Directory is ${__dirname}`);

	await initCommunication();
}
