import WebSocket from 'isomorphic-ws';
import uuidv4 from 'uuid/v4.js';
import RouteTable from '../support/RouteTable.mjs';
import querystring from 'querystring';
import config from '../config/Config.mjs';

// Map for conversation initiated by Server
// key=serverAckId, data={callback}
let serverAckMap = new Map();

// key = sid, data = ws
let SidMap = new Map();

let wss;

export async function _initWebSocket() {
	wss = new WebSocket.Server({ port: config.port });
	_initCommunication();
}

function _initCommunication() {
	wss.on('connection', (ws, req) => {
		// Associate a uuid with this socket
		let qs = querystring.parse(req.url.substring(2));
		SidMap.set(qs.uuid, ws);
		ws.sid = qs.uuid;

		ws.on('message', (message) => {
			let parsed = JSON.parse(message);
			if (parsed.serverAckId) {
				// server -> client -> server (doing callback)
				serverAckMap.get(parsed.serverAckId)(parsed);
				serverAckMap.delete(parsed.ackId);
			} else if (parsed.clientAckId) {
				// client -> server (send back to client after processing)
				parsed.data.sid = ws.sid;
				RouteTable(parsed.data, (data) => {
					ws.send(JSON.stringify({ clientAckId: parsed.clientAckId, ...data }));
				});
			} else {
				RouteTable(parsed);
			}
		});
	});
}

export async function _emitEasyAll(type, data) {
	let actions = [];
	actions.push({
		type,
		...data,
	});
	for (let client of wss.clients) {
		if (client !== wss && client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(actions));
		}
	}
}

export function _emitEasySid(sid, type, data, fn) {
	let serverAckId = 0;
	let actions = [];
	let ws = SidMap.get(sid);

	if (fn) {
		serverAckId = uuidv4();
		serverAckMap.set(serverAckId, fn);
		actions.push({
			type,
			serverAckId,
			...data,
		});
	} else {
		actions.push({
			type,
			...data,
		});
	}
	ws.send(JSON.stringify(actions));
}
