import { startUp } from './server';
import cfg from './config.js';

const config = {
	environment: 'development',
	headerOrigin: 'http://localhost',
	port: 8080,
};

cfg.setConfig(config);

startUp();
