import {
	Players,
	Accounting,
	doDump,
	goOnBreak,
	goOffBreak,
	gamePause,
	gameResume,
	doAbort,
} from '../support/Controller.js';
import NewDeal from '../NewDeal.js';
import winston from 'winston';

export default function RouteMessage(data, fn) {
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
}
