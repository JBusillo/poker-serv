// Emit All
let messagesAll = new Map();

export function saveLastMessageSid(sid, type, data, fn) {}

export function saveLastMessageAll(type, data) {
	messagesAll.set(type, data);
}

export function reconnectPlayer(uuid) {
	let actions = [];
	for (let msg of messagesAll) actions.push(msg[0], msg[1]);
}

export let SockMap = new Map();

// InfoPot
// InfoMsg
// InfoGame
// PlayerShow
// PlayerCards
// PlayerStatus
// GameResults
// PupTag
// TableCards
// PauseGame

// Players -- refreshAll done first

// MyActions -- convert to sid
// HighLight -- omit

// exclude
//   Reload
//   AddPlayer

// ------------------- sid messages

// InfoMsg
// MyActions
// Players
// MyCards

// miniDialogs:

// Dealer
// Ante
// Betting
// Discard
// SelectCards
