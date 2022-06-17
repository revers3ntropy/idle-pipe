const socket = new WebSocket('wss://revers3ntropy.com:50015');
export default socket;

socket.onmessage = ({ data }) => {
	data = JSON.parse(data);

	if (!handlers.hasOwnProperty(data.handler)) {
		console.error(`Unknown handler: ${data.handler}`);
		return;
	}

	handlers[data.handler](data);
};

socket.onopen = () => {};

export const handlers = {};