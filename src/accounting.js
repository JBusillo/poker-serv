function _Accounting() {
	this.pot = 0;
	this.debit = function (data, cb) {};
	this.credit = function (data, cb) {};
	this.buyin = function (data, cb) {
		this.debit({ account: 'buyin', uuid: data.uuid, amount: data.amount });
		this.credit({ account: 'chips', uuid: data.uuid, amount: data.amount });
		cb();
	};
}

module.exports = { _Accounting };
