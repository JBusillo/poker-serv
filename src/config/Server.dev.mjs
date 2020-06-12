import { startUp } from '../Server.mjs';
import cfg from './Config.mjs';

const config = {
	environment: 'development',
	headerOrigin: 'http://localhost',
	port: 8080,
	dumpPath: `D:/Projects/poker-serv/`,
};

cfg.setConfig(config);
startUp();
