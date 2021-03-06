let _cfg = null;

export default class Config {
	static setConfig(cfg) {
		_cfg = cfg;
	}

	static get socketModule() {
		return _cfg.socketModule;
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

	static get dumpPath() {
		return _cfg.dumpPath;
	}
}
