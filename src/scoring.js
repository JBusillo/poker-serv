export default function score(cards) {
	console.log('---------------------------------------------------------');
	console.log(cards);
	let ranksAceHigh = Array.from(cards, (x) => x.substr(1)).sort();
	let ranksAceLow = Array.from(cards, (x) => x.substr(1).replace('14', '01')).sort();
	let suits = Array.from(cards, (x) => x.substr(0, 1));
	let res = group();
	let grouping = res.arr;
	let pairs = res.pairs;
	let isFlush = Array.from(new Set(suits)).length === 1;
	let isStraight = !!(ranksAceHigh[4] - ranksAceHigh[0] === 4 || ranksAceLow[4] - ranksAceLow[0] === 4);
	let isRoyalFlush = !!(isFlush && isStraight && ranksAceHigh[4] === '14');
	let isFullHouse = grouping.length === 2;
	let isThreeOfAKind = grouping.length === 3 && pairs[0].substr(0, 1) === '3';
	let isTwoPair = grouping.length === 3 && pairs[0].substr(0, 1) === '2';
	let isPair = grouping.length === 4;

	let strPairs = getPairs(pairs);

	//Royal Flush '10-00-00-00-00-00'
	if (isRoyalFlush) {
		return { hand: 'Royal Flush', handValue: '10-00-00-00-00-00' };
	}

	// Straight Flush '09-highcard-00-00-00'
	if (isStraight && isFlush) {
		return { hand: 'Straight Flush', handValue: `09-${ranksAceHigh[4]}-00-00-00-00` };
	}

	// Full House '08-3card-2card-00-00-00'
	if (isFullHouse) {
		return { hand: 'Full House', handValue: `08${strPairs}` };
	}

	if (isFlush) {
		return { hand: 'Flush', handValue: `07${strPairs}` };
	}

	if (isStraight) {
		return { hand: 'Straight', handValue: `06${strPairs}` };
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
