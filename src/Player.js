import { emitEasyAll, emitEasySid } from './Controller.js';

export default function Player(uuid, name, sockid) {
	this.uuid = uuid;
	this.name = name;
	this.sockid = sockid;

	this.chips = 0;
	this.buyIn = 0;
	this.raise = 0;
	this.paid = 0;
	this.totalBetThisRound = 0;

	this.isDealer = false;
	this.status = 'wait';
	this.lastAction = 'none';
	this.cards = [];
	this.dummyCards = [];

	this.buttons = [];
	this.highLight = false;
	this.playedCards = [];
	this.hand = '';
	this.handValue = '';

	this.isOnBreak = false;
	this.isOnBreakNextRound = false;
	this.isSidePot = false;
	this.sidePotAmount = 0;
	this.dealSequence = 0;

	this.isDisconnected = false;
	this.lastMessages = [];
}

Player.prototype.setStatus = function (stat, refresh) {
	Object.assign(this, stat);
	// 	if (typeof stat.isOnBreak !== 'undefined') {
	// 	this.isOnBreak = stat.isOnBreak;
	// 	this.isOnBreakNextRound = stat.isOnBreakNextRound;
	// }

	if (refresh) this.refreshPlayerStatus();
};

Player.prototype.setDummyCards = function (cards) {
	this.dummyCards.push(cards);
};

Player.prototype.setActions = function (stat) {
	if (stat.buttons) {
		this.buttons = stat.buttons;
		emitEasySid(this.sockid, 'MyActions', { buttons: this.buttons });
	} else {
		emitEasySid(this.sockid, 'MyActions', { ...stat });
	}
};

Player.prototype.clearCards = function () {
	this.cards = [];
	this.dummyCards = [];
	this.playedCards = [];
	emitEasyAll('PlayerCards', { cards: this.cards, uuid: this.uuid, playedCards: this.playedCards });
};

Player.prototype.refreshPlayerStatus = function () {
	this.refresh('PlayerStatus');
};

Player.prototype.refreshNewPlayer = function () {
	this.refresh('AddPlayer');
};

Player.prototype.refresh = function (messageType) {
	let msg = {
		player: {
			name: this.name,
			uuid: this.uuid,
			chips: this.chips,
			buyIn: this.buyIn,
			totalBetThisRound: this.totalBetThisRound,
			isDealer: this.isDealer,
			status: this.status,
			lastAction: this.lastAction,
			isOnBreak: this.isOnBreak,
			isOnBreakNextRound: this.isOnBreakNextRound,
			buttons: this.buttons,
			highLight: this.highLight,
		},
	};
	emitEasyAll(messageType, msg);
};
