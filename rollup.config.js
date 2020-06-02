//import ignore from 'rollup-plugin-ignore';
import builtins from 'rollup-plugin-node-builtins';
import commonjs from '@rollup/plugin-commonjs';
import visualizer from 'rollup-plugin-visualizer';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
//import builtins from 'builtin-modules';
import babel from '@rollup/plugin-babel';
import del from 'rollup-plugin-delete';

import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

console.log(production ? 'production' : 'development');
console.log(process.cwd());

const SERVER_PATH = production ? './src/config/Server.prod.js' : './src/config/Server.dev.js';

function onwarn(warning) {
	if (warning.code !== 'CIRCULAR_DEPENDENCY') {
		console.error(`(!) ${warning.message}`);
	}
}

export default {
	input: SERVER_PATH,
	onwarn,
	output: {
		sourcemap: true,
		format: 'cjs',
		name: 'PokerServer',
		file: production ? 'dist/PokerServer.js' : 'debug/PokerServer.js',
	},
	//	external: builtins,

	plugins: [
		del({ targets: production ? 'dist/*' : 'debug/*' }),
		resolve({ preferBuiltins: false }),
		commonjs(),
		// commonjs(),
		// babel({
		// 	babelHelpers: 'bundled',
		// 	extensions: ['.js', '.mjs', '.html'],
		// 	include: ['src/**'],
		// }),
		//		builtins(),
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
