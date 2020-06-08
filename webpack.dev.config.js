const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
//const nodeExternals = require('webpack-node-externals');
let Visualizer = require('webpack-visualizer-plugin');

module.exports = (env, argv) => {
	const SERVER_PATH = './src/config/Server.dev.js';

	const OUT_DIR = 'debug';
	//	const production = argv.mode === 'production';
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
		//		externals: [nodeExternals()], // Need this to avoid error when working with Express
		devtool: 'source-map',
		plugins: [new CleanWebpackPlugin(), new Visualizer()],
	};
};
