import { startUp } from '../Server.js';
import cfg from './Config.js';

const config = {
	environment: 'development',
	headerOrigin: 'http://localhost',
	port: 8080,
	dumpPath: `D:/Projects/poker-serv/`,
};

cfg.setConfig(config);

startUp();
