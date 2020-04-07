import express from 'express';
import http from 'http';
import socketIo from 'socket.io';
import bodyParser from 'body-parser';
import config from './config.js';
import Players from './players.js';
import * as Deck from './deck';
import { winster, WinsterLog, WinsterErrorLog } from './winster';
import winston from 'winston';

export let app;
export let server;
export let io;
export let router = express.Router();

export async function startUp() {
	winster();

	app = await express();

	app.use(WinsterLog);

	winston.info('Current Directory is %s', __dirname);

	server = await http.createServer(app);

	io = await socketIo(server);

	server.listen(config.port);
	winston.info(`Listening on ${config.port}`);

	app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', config.headerOrigin);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('X-Content-Type-Options', 'nosniff');
		next();
	});

	app.use(router);

	app.use(WinsterErrorLog);

	app.use(bodyParser.json());

	router.get('/', (req, res, next) => {
		console.log('Init');
		res.send('OK');
	}); // for parsing application/json

	Players.init();

	Deck.init();

	// app.get('/getPlayers', (req, res) => {
	// 	res.setHeader('Content-Type', 'application/json');
	// 	res.send(JSON.stringify(players));
	// }); // for parsing application/json
}