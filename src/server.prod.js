import * as serve './server.js';
import cfg from 'config.js';

export const config = {
	environment: 'production',
	headerOrigin: 'http://poker.cuencador.com',
	port: 8082,
};
cfg.SetConfig(config);

serve.Startup();
