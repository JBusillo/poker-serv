const path = require('path');
const nodeExternals = require('webpack-node-externals');
// const NodemonPlugin = require('nodemon-webpack-plugin');
// const devServer = require('webpack-dev-server');

module.exports = (env, argv) => {
	const SERVER_PATH = argv.mode === 'production' ? './src/server.prod.js' : './src/server.dev.js';

	const OUT_DIR = argv.mode === 'production' ? 'dist' : 'debug';
	console.log(`SERVER_PATH ${SERVER_PATH}`);
	console.log(__dirname);

	return {
		entry: {
			server: SERVER_PATH,
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
