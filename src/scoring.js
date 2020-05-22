//for testing
// console.log(score(['H13', 'H10', 'H11', 'H10', 'D09']));
// console.log(score(['H14', 'H13', 'H11', 'H12', 'H10']));
// console.log(score(['D05', 'H05', 'D05', 'H12', 'S05']));
// console.log(score(['H09', 'H13', 'H12', 'H11', 'H10']));
// console.log(score(['H08', 'C09', 'D09', 'H09', 'D08']));
// console.log(score(['H14', 'H02', 'H12', 'H03', 'H08']));
// console.log(score(['H13', 'H09', 'H11', 'H10', 'D12']));
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
	5;
	let res = group();
	let grouping = res.arr;
	let pairs = res.pairs;

	let isFlush = Array.from(new Set(suits)).length === 1;
	let isStraight =
		setRanksAceHigh[4] - setRanksAceHigh[0] === 4 || setRanksAceLow[4] - setRanksAceLow[0] === 4;

	let isRoyalFlush = isFlush && isStraight && ranksAceHigh[4] === '14';
	let isFourOfAKind = grouping.length === 2 && pairs[0].substr(0, 1) === '4';

	let isFullHouse = grouping.length === 2 && pairs[0].substr(0, 1) === '3';
	let isThreeOfAKind = grouping.length === 3 && pairs[0].substr(0, 1) === '3';
	let isTwoPair = grouping.length === 3 && pairs[0].substr(0, 1) === '2';
	let isPair = grouping.length === 4;

	let strPairs = getPairs(pairs);
	console.log(`strPairs   ${JSON.stringify(strPairs)}`);

	//Royal Flush '11-00-00-00-00-00'
	if (isRoyalFlush) {
		return { hand: 'Royal Flush', handValue: '11-00-00-00-00-00' };
	}

	// Straight Flush '10-highcard-00-00-00'
	if (isStraight && isFlush) {
		return { hand: 'Straight Flush', handValue: `10-${ranksAceHigh[4]}-00-00-00-00` };
	}

	// Four of a Kind '09-highcard-00-00-00'
	// 4(x) 1
	if (isFourOfAKind) {
		return { hand: 'Four of a Kind', handValue: `09-${ranksAceHigh[4]}-00-00-00-00` };
	}

	// Full House '08-3card-2card-00-00-00'
	if (isFullHouse) {
		return { hand: 'Full House', handValue: `08${strPairs}` };
	}

	if (isFlush) {
		return { hand: 'Flush', handValue: `07${strPairs}` };
	}

	if (isStraight) {
		return { hand: 'Straight', handValue: `06-${ranksAceHigh[4]}-00-00-00-00` };
	}

	if (isThreeOfAKind) {
		return { hand: 'Three of a Kind', handValue: `05${strPairs}` };
	}

	if (isTwoPair) {
		return { hand: 'Two Pair', handValue: `04${strPairs}` };
	}

	if (isPair) {
		return { hand: 'A Pair', handValue: `03${strPairs}` };
	}

	return { hand: 'High Card', handValue: `02${strPairs}` };

	function group() {
		let pairs = [];
		let arr = Array.from(ranksAceHigh);
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

	function getPairs() {
		let ret = '';
		for (let i = 0; i < 5; i++) {
			if (i < pairs.length) {
				ret = ret + pairs[i].substr(1);
			} else {
				ret = ret + '-00';
			}
		}
		return ret;
	}
}
