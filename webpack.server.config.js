const path = require('path');
// const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
// const NodemonPlugin = require('nodemon-webpack-plugin');
// const devServer = require('webpack-dev-server');

module.exports = (env, argv) => {
	const SERVER_PATH = argv.mode === 'production' ? './src/server.prod.js' : './src/server.dev.js';

	const OUT_DIR = argv.mode === 'production' ? 'dist' : 'debug';
	console.log(SERVER_PATH);
	return {
		entry: {
			server: SERVER_PATH,
		},
		output: {
			path: path.join(__dirname, OUT_DIR),
			publicPath: '/',
			filename: '[name].js',
		},
		target: 'node',
		node: {
			// Need this when working with express, otherwise the build fails
			__dirname: false, // if you don't put this is, __dirname
			__filename: false, // and __filename return blank or /
		},
		externals: [nodeExternals()], // Need this to avoid error when working with Express
		devtool: 'inline-source-map',
		//		devServer: { writeToDisk: true },
		plugins: [
			// new NodemonPlugin({
			// 	watch: path.resolve('./debug'),
			// 	nodeArgs: ['--inspect=9230'],
			// 	script: './debug/server.js',
			// 	ext: 'js',
			// }), // Dong
		],
		//		plugins: [new webpack.SourceMapDevToolPlugin({}), new NodemonPlugin()],
		module: {
			rules: [
				{
					// Transpiles ES6-8 into ES5
					test: /\.js$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
					},
				},
			],
		},
	};
};
