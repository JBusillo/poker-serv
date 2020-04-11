import winston from 'winston';
const { printf, splat } = winston.format;

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
