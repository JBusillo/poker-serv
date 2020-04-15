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
	winster();

	app = await http.createServer(() => {});
	io = await SocketIo(app);

	winston.info('Node Version');
	winston.info('Current Directory is %s', __dirname);

	app.listen(config.port);
	winston.info(`Listening on ${config.port}`);

	//	process.exit(2);

	initCommunication();
}
