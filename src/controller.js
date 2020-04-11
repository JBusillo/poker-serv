import { io } from './server';
import { v4 as uuidv4 } from 'uuid';
import * as Deck from './deck';
import * as accounting from 'accounting';
import * as controller from 'controller';
import { startRound } from './round';
import winston from 'winston';

let newTable = true;

function start() {
	if (newTable) {
	}
}

function initCommunication() {
	// add the channel (notify when 'players' has changed
	io.on('connection', (socket) => {
		socket.emit('playerData', publicPlayerData());

		socket.on('ClientMessage', (data, fn) => {
			switch (data.msgType) {
				case 'addPlayer':
					addPlayer(data, fn);
					break;
				case 'playerReady':
					playerReady(data, fn);
					break;
				case 'doButton':
					doButton(data, fn);
					break;
				case 'startRound':
					startRound(data, fn);
					break;
				default:
					console.log(`Default ${data}`);
			}
		});
	});
}
