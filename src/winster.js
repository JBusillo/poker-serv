import winston from 'winston';
const { printf, splat, timestamp, prettyPrint } = winston.format;
import expressWinston from 'express-winston';

export function winster() {
	winston.configure({
		level: 'debug',
		//		defaultMeta: { service: 'user-service' },
		transports: [
			new winston.transports.Console({
				format: winston.format.combine(
					winston.format.colorize({ level: true }),
					splat(),
					printf((e) => {
						let now = Date.now();
						let dt = new Date(now);
						now -= dt.getTimezoneOffset() * 60 * 1000;
						dt = new Date(now);
						let dstr = dt.toISOString().slice(0, -1).replace('T', ' ');

						return `[${dstr}] ${e.level} - ${e.message}`;
					})
				),
			}),
			new winston.transports.File({
				format: winston.format.combine(
					splat(),
					printf((e) => {
						let now = Date.now();
						let dt = new Date(Date.now());
						now -= dt.getTimezoneOffset() * 60 * 1000;
						dt = new Date(now);
						let dstr = dt.toISOString().slice(0, -1).replace('T', ' ');

						return `[${dstr}] ${e.level} - ${e.message}`;
					})
				),
				filename: 'combined.log',
				options: { flags: 'w' },
			}),
		],
		exitOnError: false,
	});
}

export const WinsterLog = expressWinston.logger({
	winstonInstance: winston,
	format: winston.format.combine(winston.format.colorize(), winston.format.json()),
	meta: false, // optional: control whether you want to log the meta data about the request (default to true)
	metaField: null,
	msg: 'HTTP {{req.method}} {{req.url}}', // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
	expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
	colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
});

export const WinsterErrorLog = expressWinston.errorLogger({
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(timestamp(), prettyPrint({ colorize: true })),
		}),
		new winston.transports.File({
			format: winston.format.combine(timestamp(), prettyPrint()),
			filename: 'error.log',
			options: { flags: 'w' },
		}),
	],
});
