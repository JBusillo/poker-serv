import assert from 'assert';
const filePrefix = 'file:///D:/Projects/poker-serv/src/';
const replFilePrefix = 'file:///D:/Projects/test-poker-serv/test/lib/';
let a, b, c, d, e, f;

import mocha from 'mocha';
import * as td from 'testdouble';
import { getTablePlayers } from './lib/Table.mjs';

// import { Players, emitEasyAll, Accounting, bcastGameMessage, pupTag } from './support/Controller.mjs';
// import { globals } from './support/globals.mjs';
// import { getTablePlayers, getHands } from './table/Table.mjs';

//import 'poker-serv';

function x() {
	throw 'unimplemented';
}
let Controller, Globals, Table, Winning;

mocha.describe('mytest', () => {
	mocha.beforeEach(async () => {
		console.log('x--------------------------------------');

		Controller = await td.replaceEsm(`${filePrefix}support/Controller.mjs`);
		Globals = await td.replaceEsm(`${filePrefix}support/globals.mjs`);
		console.log('a');
		Table = await td.replaceEsm(`${filePrefix}table/Table.mjs`);
		console.log('b');
		Winning = await import(`${filePrefix}table/Winning.mjs`);
		var acct = td.object('Winning');
		Controller.Accounting = { Pot: 100 };

		console.log(JSON.stringify(Table));
		console.log('--------------------------------------');
	});
	mocha.afterEach(() => {
		td.reset();
	});
	mocha.it('simple test', () => {
		td.when(Table.getTablePlayers()).thenReturn([1, 2, 3, 4]);
		td.when(Table.getHands()).thenReturn([]);
		Winning.calculateWinner();
		console.log('d');
		assert.equal(1, 1);
	});
});
