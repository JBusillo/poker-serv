import { startUp } from '../Server.mjs';
import cfg from './Config.mjs';

export const config = {
	environment: 'production',
	headerOrigin: 'http://poker.cuencador.com',
	port: 8083,
	dumpPath: `/var/www/Poker/dump${Date.now().toString()}.json`,
};
cfg.setConfig(config);

startUp();
