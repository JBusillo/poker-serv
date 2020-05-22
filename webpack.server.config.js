const path = require('path');
const nodeExternals = require('webpack-node-externals');
// const NodemonPlugin = require('nodemon-webpack-plugin');
// const devServer = require('webpack-dev-server');

// pm2 start /var/www/Poker/restpoker.cuencador.com/PokerServer.js
// | status            │ errored                                          │
// │ name              │ restpoker                                        │
// │ namespace         │ default                                          │
// │ version           │ N/A                                              │
// │ restarts          │ 301                                              │
// │ uptime            │ 0                                                │
// │ script path       │ /var/www/Poker/restpoker.cuencador.com/server.js │
// │ script args       │ N/A                                              │
// │ error log path    │ /home/jbusillo/.pm2/logs/restpoker-error.log     │
// │ out log path      │ /home/jbusillo/.pm2/logs/restpoker-out.log       │
// │ pid path          │ /home/jbusillo/.pm2/pids/restpoker-1.pid         │
// │ interpreter       │ node                                             │
// │ interpreter args  │ N/A                                              │
// │ script id         │ 1                                                │
// │ exec cwd          │ /var/www/Poker/restpoker.cuencador.com           │
// │ exec mode         │ fork_mode                                        │
// │ node.js version   │ 13.11.0                                          │
// │ node env          │ N/A                                              │
// │ watch & reload    │ ✘                                                │
// │ unstable restarts │ 0                                                │
// │ created at        │ N/A

module.exports = (env, argv) => {
	const SERVER_PATH = argv.mode === 'production' ? './src/Server.prod.js' : './src/Server.dev.js';

	const OUT_DIR = argv.mode === 'production' ? 'dist' : 'debug';
	console.log(`SERVER_PATH ${SERVER_PATH}`);
	console.log(__dirname);
	console.log('[name]');

	return {
		entry: {
			PokerServer: SERVER_PATH,
		},
		output: {
			path: path.join(__dirname, OUT_DIR),
			publicPath: '/',
			filename: '[name].js',
			devtoolModuleFilenameTemplate: `file:///${__dirname}`,
		},
		target: 'node',
		node: {
			__dirname: false, // if you don't put this is, __dirname
			__filename: false, // and __filename return blank or /
		},
		externals: [nodeExternals()], // Need this to avoid error when working with Express
		devtool: 'source-map',
		plugins: [],
	};
};
