import { prepareForNewRound as _prepareForNewRound } from './Preparing.mjs';
import { dealToPlayers as _dealToPlayers, dealToTable as _dealToTable } from './Dealing.mjs';
import { bettingRound as _bettingRound } from './Betting.mjs';
import { discard as _discard } from './Discarding.mjs';
import { selectCards as _selectCards } from './Selecting.mjs';
import { calculateWinner as _calculateWinner } from './Winning.mjs';

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
