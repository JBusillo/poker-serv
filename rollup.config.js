//import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import visualizer from 'rollup-plugin-visualizer';
import json from '@rollup/plugin-json';
import ignore from 'rollup-plugin-ignore';

//import babel from '@rollup/plugin-babel';

import builtins from 'rollup-plugin-node-builtins';

import del from 'rollup-plugin-delete';

import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

const SERVER_PATH = production ? './src/config/Server.prod.js' : './src/config/Server.dev.js';

function onwarn(warning) {
	if (warning.code !== 'CIRCULAR_DEPENDENCY') {
		console.error(`(!) ${warning.message}`);
	}
}

export default {
	input: SERVER_PATH,
	onwarn,
	//	shimMissingExports: true,
	output: {
		sourcemap: true,
		//		sourcemap: !production,
		format: 'umd',
		name: 'PokerServer',
		file: production ? 'dist/PokerServer.js' : 'debug/PokerServer.js',
	},
	plugins: [
		del({ targets: production ? 'dist/*' : 'debug/*' }),
		//		ignore(['uws']),

		//		resolve({ preferBuiltins: false }),
		commonjs(),
		//		babel({ babelHelpers: 'bundled' }),
		builtins(),
		json({
			compact: true,
		}),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		production && terser(),
		visualizer({ sourcemap: true }),
	],
	watch: {
		clearScreen: false,
	},
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn('npm', ['run', 'start'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true,
				});
			}
		},
	};
}
