import { startUp } from './Server.js';
import cfg from './Config.js';

export const config = {
	environment: 'production',
	headerOrigin: 'http://poker.cuencador.com',
	port: 8083,
	dumpPath: `/var/www/Poker/dump${Date.now().toString()}.json`,
};
cfg.setConfig(config);

startUp();
