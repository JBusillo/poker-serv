import express from 'express';
import http from 'http';
import socketIo from 'socket.io';
import bodyParser from 'body-parser';
import config from './config.js';
import Players from './players.js';
import * as Deck from './deck';
import winston from 'winston';
import expressWinston from 'express-winston';
const { printf, splat } = winston.format;

export let app;
export let server;
export let io;

export async function startUp() {
	winston.configure({
		level: 'debug',
		//		defaultMeta: { service: 'user-service' },
		transports: [
			new winston.transports.Console({
				format: winston.format.combine(
					winston.format.colorize({ level: true }),
					splat(),
					printf((e) => {
						let now = Date.now();
						let dt = new Date(now);
						now -= dt.getTimezoneOffset() * 60 * 1000;
						dt = new Date(now);
						let dstr = dt.toISOString().slice(0, -1).replace('T', ' ');

						return `[${dstr}] ${e.level} - ${e.message}`;
					})
				),
			}),
			new winston.transports.File({
				format: winston.format.combine(
					splat(),
					printf((e) => {
						let now = Date.now();
						let dt = new Date(Date.now());
						now -= dt.getTimezoneOffset() * 60 * 1000;
						dt = new Date(now);
						let dstr = dt.toISOString().slice(0, -1).replace('T', ' ');

						return `[${dstr}] ${e.level} - ${e.message}`;
					})
				),
				filename: 'combined.log',
				options: { flags: 'w' },
			}),
		],
		exitOnError: false,
	});
	//
	app = await express();

	app.use(
		expressWinston.logger({
			winstonInstance: winston,
			format: winston.format.combine(winston.format.colorize(), winston.format.json()),
			meta: false, // optional: control whether you want to log the meta data about the request (default to true)
			metaField: null,
			msg: 'HTTP {{req.method}} {{req.url}}', // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
			expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
			colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
		})
	);

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

	app.use(bodyParser.json());

	app.get('/', (req, res) => {
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
