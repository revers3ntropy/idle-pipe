const ws = require('ws');
const https = require('https');
const fs = require('fs');
const {query} = require('./sql.js');

const port = '50015';

const server = new https.createServer({
	cert: fs.readFileSync('certificate.pem'),
	key: fs.readFileSync('privatekey.pem')
});

const wss = new ws.WebSocketServer({ server });

wss.on('connection', socket => {
	socket.on('message', async message => {
		try {
			message = JSON.parse(message);
		} catch (e) {
			console.log(message, e);
			return;
		}

		if (!handlers.hasOwnProperty(message.handler)) {
			console.log(`Unknown handler: ${message.handler}`);
			return;
		}

		const res = await handlers[message.handler](socket, message);
		if (!res) return;
		socket.send(JSON.stringify({
			handler: message.handler,
			...res
		}));
	});
});

console.log('ws server started on ' + port);

server.listen(parseInt(port));

const handlers = {
	'ping': () => ({ ok: true }),

	'get-high-score': async (socket, body) => {
		try {
			return {
				score: parseInt((
					await query(`SELECT idlePipeHighscore FROM userData WHERE id=${body.id}`)
				)[0]?.idlePipeHighscore)
			}
		} catch (e) {
			console.log('error getting highscore: ', e);
			return {};
		}

	},
	'update-high-score': async (socket, body) => {
		try {
			await query(`UPDATE userData SET idlePipeHighscore='${body.score}' WHERE id=${body.id}`);
		} catch (e) {
			console.log('error in sql query: ');
		}
	},

	'save': async (socket, body) => {

	},

	'load': async (socket, body) => {

	}
};
