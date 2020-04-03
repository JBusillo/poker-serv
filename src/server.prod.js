import * as serve from './server';
import cfg from './config.js';

export const config = {
	environment: 'production',
	headerOrigin: 'http://poker.cuencador.com',
	port: 8083,
};
cfg.setConfig(config);

serve.startUp();
