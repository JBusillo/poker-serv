import { prepareForNewRound as _prepareForNewRound } from './Preparing.js';
import { dealToPlayers as _dealToPlayers, dealToTable as _dealToTable } from './Dealing.js';
import { bettingRound as _bettingRound } from './Betting.js';
import { discard as _discard } from './Discarding.js';
import { selectCards as _selectCards } from './Selecting.js';
import { calculateWinner as _calculateWinner } from './Winning.js';

let hands = []; // work table to calculate winners and payouts
let tablePlayers = []; // array of players in dealing order

export function setTablePlayers(val) {
	tablePlayers = val;
}

export function getTablePlayers() {
	return tablePlayers;
}

export function setHands(val) {
	hands = val;
}

export function getHands() {
	return hands;
}

export async function prepareForNewRound() {
	await _prepareForNewRound();
}

export async function dealToPlayers(...args) {
	await _dealToPlayers(...args);
}

export async function dealToTable(...args) {
	await _dealToTable(...args);
}

export async function bettingRound(...args) {
	await _bettingRound(...args);
}

export async function discard(...args) {
	await _discard(...args);
}

export async function selectCards(...args) {
	await _selectCards(...args);
}

export async function calculateWinner(...args) {
	await _calculateWinner(...args);
}
