// let arrCards;
// arrCards = ['H13', 'H10', 'H11', 'H04', 'D09'];
// console.log(score(arrCards));

// arrCards = ['H14', 'H13', 'H12', 'H11', 'H10']; //royal flush
// console.log(score(arrCards));

// console.log(score(['H09', 'H13', 'H12', 'H11', 'H10'])); //straight flush
// console.log(score(['H14', 'H02', 'H05', 'H04', 'H03'])); //straight flush
// console.log(score(['C05', 'H05', 'D05', 'H12', 'S05'])); //four of a kind
// console.log(score(['C05', 'H05', 'D05', 'H12', 'D12'])); //full house
// console.log(score(['H14', 'H02', 'H12', 'H03', 'H08'])); //flush
// console.log(score(['H13', 'H09', 'H11', 'H10', 'D12']));
// console.log(score(['H02', 'H03', 'H05', 'H14', 'D04']));
// console.log(score(['H05', 'D12', 'S05', 'H03', 'C05']));
// console.log(score(['D03', 'D12', 'H03', 'D05', 'C05']));
// console.log(score(['H05', 'D03', 'S08', 'D03', 'C13']));
// console.log(score(['S02', 'D03', 'C09', 'H13', 'C08']));

export default function score(cards) {
	let ranksAceHigh = Array.from(cards, (x) => x.substr(1)).sort();
	let setRanksAceHigh = Array.from(new Set(ranksAceHigh));
	let ranksAceLow = Array.from(cards, (x) => x.substr(1).replace('14', '01')).sort();
	let setRanksAceLow = Array.from(new Set(ranksAceLow));
	let suits = Array.from(cards, (x) => x.substr(0, 1));
	let res = group({ AcesHigh: true });
	let grouping = res.arr;
	let pairs = res.pairs;

	let resAcesLow = group({ AcesHigh: false });
	let pairsAcesLow = resAcesLow.pairs;

	let isFlush = Array.from(new Set(suits)).length === 1;
	let isStraightAceHigh = setRanksAceHigh[4] - setRanksAceHigh[0] === 4;
	let isStraightAceLow = setRanksAceLow[4] - setRanksAceLow[0] === 4;

	let isRoyalFlush = isFlush && isStraightAceHigh && ranksAceHigh[4] === '14';

	let isFourOfAKind = grouping.length === 2 && pairs[0].substr(0, 1) === '4';

	let isFullHouse = grouping.length === 2 && pairs[0].substr(0, 1) === '3';
	let isThreeOfAKind = grouping.length === 3 && pairs[0].substr(0, 1) === '3';
	let isTwoPair = grouping.length === 3 && pairs[0].substr(0, 1) === '2';
	let isPair = grouping.length === 4;

	let strPairs = getPairs(pairs);
	let strPairsAcesLow = getPairs(pairsAcesLow);
	let handValue, hand;

	switch (true) {
		case isRoyalFlush:
			hand = 'Royal Flush';
			handValue = `11${strPairs}`;
			break;
		case isStraightAceHigh && isFlush:
			hand = 'Straight Flush';
			handValue = `10${strPairs}`;
			break;
		case isStraightAceLow && isFlush:
			hand = 'Straight Flush';
			handValue = `10${strPairsAcesLow}`;
			break;
		case isFourOfAKind:
			hand = 'Four of a Kind';
			handValue = `09${strPairs}`;
			break;
		case isFullHouse:
			hand = 'Full House';
			handValue = `08${strPairs}`;
			break;
		case isFlush:
			hand = 'Flush';
			handValue = `07${strPairs}`;
			break;
		case isStraightAceHigh:
			hand = 'Straight';
			handValue = `06${strPairs}`;
			break;
		case isStraightAceLow:
			hand = 'Straight';
			handValue = `06${strPairsAcesLow}`;
			break;
		case isThreeOfAKind:
			hand = 'Three of a Kind';
			handValue = `05${strPairs}`;
			break;
		case isTwoPair:
			hand = 'Two Pair';
			handValue = `04${strPairs}`;
			break;
		case isPair:
			hand = 'A Pair';
			handValue = `03${strPairs}`;
			break;
		default:
			hand = 'High Card';
			handValue = `02${strPairs}`;
	}

	//sort cards
	let hv;
	let sortedCards = [];
	let items = handValue.substr(3).split('-');
	for (let handCard of items) {
		hv = handCard === '01' ? '14' : handCard;
		for (let cd of cards) {
			if (hv === cd.substr(1)) sortedCards.push(cd);
		}
	}
	for (let ix = 0; ix < 5; ix++) cards[ix] = sortedCards[ix];

	return { hand, handValue };

	function group(param) {
		let pairs = [];
		let arr;
		if (param.AcesHigh === true) {
			arr = Array.from(ranksAceHigh);
		} else {
			arr = Array.from(ranksAceLow);
		}
		arr.forEach((el) => {
			if (!pairs.includes('1-' + el)) pairs.push('1-' + el);
		});
		let x = 0;
		while (x < arr.length) {
			while (arr.length > x + 1 && arr[x] === arr[x + 1]) {
				arr.splice(x, 1);
				let pairIx = pairs.findIndex((el) => el.substr(2) === arr[x]);
				pairs[pairIx] =
					(parseInt(pairs[pairIx].substr(0, 1), 10) + 1).toString() + pairs[pairIx].substr(1, 3);
			}
			x++;
		}
		pairs.sort();
		pairs.reverse();
		return { arr, pairs };
	}

	function getPairs(p) {
		let ret = '';
		for (let i = 0; i < 5; i++) {
			if (i < p.length) {
				ret = ret + p[i].substr(1);
			} else {
				ret = ret + '-00';
			}
		}
		return ret;
	}
}
