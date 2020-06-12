import path from 'path';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
//const nodeExternals = require('webpack-node-externals');
//let Visualizer = require('webpack-visualizer-plugin');
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = (env, argv) => {
	const SERVER_PATH = './src/config/Server.prod.mjs';

	const OUT_DIR = 'dist';
	console.log(`SERVER_PATH ${SERVER_PATH}`);
	console.log(`DIRECTORY ${__dirname}`);

	return {
		entry: {
			PokerServer: SERVER_PATH,
		},
		output: {
			path: path.join(__dirname, OUT_DIR),
			publicPath: '/',
			filename: '[name].js',
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
		resolve: {
			modules: ['node_modules'],
		},
		node: {
			__dirname: false, // if you don't put this is, __dirname
			__filename: false, // and __filename return blank or /
		},
		//		externals: [nodeExternals()], // Need this to avoid error when working with Express
		//		devtool: 'source-map',
		plugins: [
			new CleanWebpackPlugin(),
			//			new BundleAnalyzerPlugin(),
			// new Visualizer({
			// 	filename: '../prodstatistics.html',
			//			}),
		],
	};
};
