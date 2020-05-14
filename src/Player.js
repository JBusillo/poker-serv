import { emitEasyAll, emitEasySid } from './controller';
import winston from 'winston';

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
	this.rejoinFromBreak = false;
	this.isSidePot = false;
	this.sidePotAmount = 0;
	this.dealSequence = 0;
}

Player.prototype.setStatus = function (stat, refresh) {
	if (typeof stat.chips !== 'undefined') this.chips = stat.chips;
	if (typeof stat.buyIn !== 'undefined') this.buyIn = stat.buyIn;
	if (typeof stat.raise !== 'undefined') this.raise = stat.raise;
	if (typeof stat.paid !== 'undefined') this.paid = stat.paid;
	if (typeof stat.totalBetThisRound !== 'undefined') this.totalBetThisRound = stat.totalBetThisRound;

	if (typeof stat.isDealer !== 'undefined') this.isDealer = stat.isDealer;
	if (typeof stat.status !== 'undefined') this.status = stat.status;
	if (typeof stat.lastAction !== 'undefined') this.lastAction = stat.lastAction;
	if (typeof stat.cards !== 'undefined') this.cards = stat.cards;
	if (typeof stat.dummyCards !== 'undefined') this.dummyCards = stat.dummyCards;

	if (typeof stat.buttons !== 'undefined') this.buttons = stat.buttons;
	if (typeof stat.highLight !== 'undefined') this.highLight = stat.highLight;
	if (typeof stat.playedCards !== 'undefined') this.playedCards = stat.playedCards;

	if (typeof stat.hand !== 'undefined') this.hand = stat.hand;
	if (typeof stat.handValue !== 'undefined') this.handValue = stat.handValue;
	if (typeof stat.isOnBreak !== 'undefined') this.isOnBreak = stat.isOnBreak;
	if (typeof stat.rejoinFromBreak !== 'undefined') this.rejoinFromBreak = stat.rejoinFromBreak;
	if (typeof stat.isSidePot !== 'undefined') this.isSidePot = stat.isSidePot;
	if (typeof stat.sidePotAmount !== 'undefined') this.sidePotAmount = stat.sidePotAmount;
	if (typeof stat.dealSequence !== 'undefined') this.dealSequence = stat.dealSequence;

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
			rejoinFromBreak: this.rejoinFromBreak,
			buttons: this.buttons,
			//			cards: this.dummyCards,
			//			playedCards: showCards ? this.playedCards : this.playedCards,
			highLight: this.highLight,
		},
	};
	emitEasyAll(messageType, msg);
};
