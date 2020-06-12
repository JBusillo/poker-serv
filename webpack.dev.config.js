import path from 'path';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
//const nodeExternals = require('webpack-node-externals');
import Visualizer from 'webpack-visualizer-plugin';

module.exports = (env, argv) => {
	const SERVER_PATH = './src/config/Server.dev.mjs';

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
			//			ecmaVersion: 6,
			devtoolModuleFilenameTemplate: `file:///${__dirname}`,
		},
		target: 'node',
		module: {
			rules: [
				{
					test: /\.mjs$/,
					type: 'javascript/auto',
				},
			],
		},
		node: {
			__dirname: false, // if you don't put this is, __dirname
			__filename: false, // and __filename return blank or /
		},
		//		externals: [nodeExternals()], // Need this to avoid error when working with Express
		devtool: 'source-map',
		plugins: [new CleanWebpackPlugin(), new Visualizer()],
	};
};
