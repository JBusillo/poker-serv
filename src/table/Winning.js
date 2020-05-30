import { Players, emitEasyAll, Accounting, bcastGameMessage, pupTag } from '../support/Controller.js';
import { globals } from '../support/globals.js';
import { getTablePlayers, getHands } from './Table.js';

let hands;
let tablePlayers;
//scoreType = 'lowspade', 'highspade'
export function calculateWinner(scoreType) {
	tablePlayers = getTablePlayers();
	hands = getHands();

	pupTag(`windialog`);
	bcastGameMessage(`Showing Winner Data`);
	calculateHandData(scoreType);
	distributeWinnings(scoreType);
	showWinnings(scoreType);
}

function calculateHandData(scoreType) {
	let handEntry;
	let playerData;
	for (const player of tablePlayers) {
		if (['in', 'side-pot'].includes(player.status)) {
			playerData = {
				uuid: player.uuid,
				name: player.name,
				isSidePot: player.isSidePot,
				sidePotAmount: player.sidePotAmount,
				playerWinAmount: 0,
				playedCards: player.playedCards,
			};

			handEntry = hands.find((e) => e.handValue === player.handValue);
			if (handEntry) {
				handEntry.players.push(playerData);
			} else {
				hands.push({ hand: player.hand, handValue: player.handValue, players: [playerData] });
			}
		}
	}

	// High/Low Chicago
	// Determine High/Low Spade and associated player
	//  if there is a player with Chicago
	//     player wins minimum of (sidepot, 50% of pot)
	//     this will increase playerWinAmount

	//  tp accomodate when a player has both the high-hand and Chicago
	//     high hand must increment (+=) playerWinAmount
	//  to accomodate when a side-potted player also has a high-hand
	//     high hand must take into account playerWinAmount when calculating side-pot payouts

	// sort hands table, reverse order (high to low)
	hands.sort((a, b) => {
		if (a.handValue < b.handValue) return 1;
		if (a.handValue === b.handValue) return 0;
		return -1;
	});

	let remainingPot = Accounting.Pot;
	while (remainingPot > 0) {
		// Evaluate hands, high to low
		for (const theHand of hands) {
			if (remainingPot <= 0) break;
			// distRounding contains amount to distribute, and remainder to distribute sequentially,
			// such that all players receive multiples of 5 cents.
			// returns { potSplit, nickelsToSplit };

			let distRounding = roundDist(remainingPot, theHand.players.length);

			// allocate pot to players, limiting sidepot wins to sidepot amounts
			for (const player of theHand.players) {
				player.playerWinAmount = player.isSidePot
					? Math.min(distRounding.potSplit, player.sidePotAmount)
					: distRounding.potSplit;
				remainingPot -= player.isSidePot
					? Math.min(distRounding.potSplit, player.sidePotAmount)
					: distRounding.potSplit;
			}

			// allocate any extra nickels
			for (const player of theHand.players) {
				if (distRounding.nickelsToSplit <= 0) break;
				player.playerWinAmount += 5;
				remainingPot -= 5;
				distRounding.nickelsToSplit -= 5;
			}

			// count players that are still in
			if (remainingPot > 0) {
				// get number of "in" players remaining
				let stillInCount = 0;
				for (const e of theHand.players) {
					if (!e.isSidePot) stillInCount++;
				}
				// do the rounding calculation again
				let distRounding = roundDist(remainingPot, stillInCount);

				// allocate to "in" players
				for (const player of theHand.players) {
					if (!player.isSidePot) {
						player.playerWinAmount += distRounding.potSplit;
						remainingPot -= distRounding.potSplit;
					}
				}

				// and allocate those damn nickels!
				for (const player of theHand.players) {
					if (distRounding.nickelsToSplit <= 0) break;
					if (!player.isSidePot) {
						player.playerWinAmount += 5;
						remainingPot -= 5;
						distRounding.nickelsToSplit -= 5;
					}
				}
			}
		}
	}
}

function roundDist(pot, numPlayers) {
	let potSplit = Math.trunc(pot / (numPlayers * 5)) * 5;
	let nickelsToSplit = pot - potSplit * numPlayers;
	return { potSplit, nickelsToSplit };
}

function distributeWinnings() {
	for (const theHand of hands) {
		for (const player of theHand.players) {
			if (player.playerWinAmount > 0) {
				Accounting.debitPot({ amount: player.playerWinAmount });
				Accounting.creditPlayerChips({ uuid: player.uuid, amount: player.playerWinAmount });

				let p = Players.getPlayerByUuid(player.uuid);
				p.refreshPlayerStatus();
			}
		}
	}
}

// uuid: player.uuid,
// name: player.name,
// isSidePot: player.isSidePot,
// sidePotAmount: player.sidePotAmount,
// playerWinAmount: 0,

function showWinnings() {
	// let text = [];
	// for (const theHand of hands) {
	// 	for (const player of theHand.players) {
	// 		text.push(`${player.name}`);
	// 		text.push(`  Hand: ${theHand.hand}   ${theHand.handValue}`);
	// 		if (player.playerWinAmount > 0) {
	// 			text.push(`  Won: ${formatAmount(player.playerWinAmount)}`);
	// 		}
	// 		if (player.isSidePot > 0) {
	// 			text.push(`  Sidepot`);
	// 		}
	// 	}

	let data = [];
	for (const theHand of hands) {
		for (const player of theHand.players) {
			let line = {
				player: player.name,
				hand: theHand.hand,
				handValue: theHand.handValue,
				won: player.playerWinAmount,
				message: '',
			};
			if (player.isSidePot > 0) {
				line.message = 'Side Pot';
			}
			data.push(line);
		}
	}

	emitEasyAll('GameResults', { results: data, show: true });

	emitEasyAll('MyActions', {
		action: 'NewGame',
	});

	globals.gameInProgress = false;

	Players.updateBreak();
}
