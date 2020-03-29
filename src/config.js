let _cfg = null;

export default class Config {
	static SetConfig(cfg) {
		_cfg = cfg;
	}

	static get environment() {
		return _cfg.environment;
	}

	static get port() {
		return _cfg.port;
	}

	static get headerOrigin() {
		return _cfg.headerOrigin;
	}
}
