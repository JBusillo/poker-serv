import express from 'express';
import http from 'http';
import socketIo from 'socket.io';
import bodyParser from 'body-parser';
import config from './config.js';
import Players from './players.js';
import * as Deck from './deck';

export let app;
export let server;
export let io;
export async function Startup() {
	//
	app = await express();
	server = await http.createServer(app);
	io = await socketIo(server);
	console.log('XXXfY');

	server.listen(config.port);
	console.log(`Listening on ${config.port}`);

	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Origin', config.headerOrigin);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept'
		);
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
	//Players.init(app, io);
	Deck.init();

	app.get('/getPlayers', (req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(players));
	}); // for parsing application/json
}

//module.exports = { app, server, io, Startup };
