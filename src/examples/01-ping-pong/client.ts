import { createClient } from '../../client/index.ts'
import { events } from './events.ts'

const client = createClient('ws://localhost:3000/ws', events, {
	debug: true,
	validate: true,
})

// Connect
client.connect()

// Wait for connection
client.onOpen(() => {
	console.log('Connected!')

	// Send a one-way notification
	client.send('notify', {
		message: 'Hello from client!',
	})

	// Send a request and wait for response
	setInterval(async () => {
		try {
			const response = await client.request('ping', {
				timestamp: Date.now(),
			})
			console.log('Received pong:', response.pong)
			console.log('Server timestamp:', response.serverTimestamp)
			console.log(
				'Round trip time:',
				Date.now() - response.serverTimestamp,
				'ms',
			)
		} catch (error) {
			console.error('Ping failed:', error)
		}
	}, 2000)
})

client.onClose((event) => {
	console.log('Disconnected:', event.code, event.reason)
})

client.onError((event) => {
	console.error('Error:', event)
})
