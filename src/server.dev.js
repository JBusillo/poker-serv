import { startUp } from './server';
import cfg from './config.js';

const config = {
	environment: 'development',
	headerOrigin: 'http://localhost',
	port: 8080,
	dumpPath: `D:/Projects/poker-serv/`,
	//	dumpPath: `D:/Projects/poker-serv/dump${Date.now().toString()}.json`,
};

cfg.setConfig(config);

startUp();
