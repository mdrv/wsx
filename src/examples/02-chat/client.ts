import { createClient } from '../../client/index.ts'
import { events } from './events.ts'

const username = process.argv[2] || `user-${Math.random().toString(36).slice(2, 7)}`
const room = process.argv[3] || 'general'

const client = createClient('ws://localhost:3001/ws', events, {
	debug: false,
	validate: true,
})

// Listen for chat messages
client.on('message', (msg) => {
	console.log(
		`[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.username}: ${msg.message}`,
	)
})

// Listen for user join/leave
client.on('userJoined', (data) => {
	console.log(`>>> ${data.username} joined the room`)
})

client.on('userLeft', (data) => {
	console.log(`<<< ${data.username} left the room`)
})

// Connect
client.connect()

client.onOpen(async () => {
	console.log('Connected to chat server!')

	try {
		// Join the room
		const result = await client.request('join', {
			username,
			room,
		})

		console.log(result.message)
		console.log('Users in room:', result.users.join(', '))
		console.log('Type messages to send (Ctrl+C to exit):\n')

		// Read from stdin and send messages
		process.stdin.setEncoding('utf8')
		process.stdin.on('data', async (chunk) => {
			const message = chunk.toString().trim()
			if (message) {
				try {
					await client.request('sendMessage', { message })
				} catch (error) {
					console.error('Failed to send message:', error)
				}
			}
		})
	} catch (error) {
		console.error('Failed to join room:', error)
		process.exit(1)
	}
})

client.onClose(() => {
	console.log('\nDisconnected from chat server')
	process.exit(0)
})

client.onError(() => {
	console.error('Connection error')
})

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\nShutting down...')
	client.close()
})
