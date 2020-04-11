export let SessionStatus;

let GameStatuses = [
	{ code: 'WP', desc: 'Waiting for Players' },
	{ code: 'DD', desc: 'Determining Dealer' },
	{ code: 'DW', desc: 'Waiting for Dealer' },
	{ code: 'AW', desc: 'Waiting for Antes' },
	{ code: 'DE', desc: 'Dealing Cards' },
	{ code: 'DC', desc: 'Discard Round' },
	{ code: 'BR', desc: 'Betting Round' },
	{ code: 'GR', desc: 'Game Results' },
];

let PlayerStatuses = [
	{ code: 'In', desc: 'In the game' },
	{ code: 'Out', desc: 'Sitting Out' },
	{ code: 'Bet', desc: 'Waiting for Players' },
	{ code: 'Fold', desc: 'Waiting for Players' },
	{ code: 'Buy', desc: 'Waiting for Players' },
];
