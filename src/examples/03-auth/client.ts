import { createClient } from '../../client/index.ts'
import { events } from './events.ts'

const token = process.argv[2] || 'secret-token'

const client = createClient('ws://localhost:3002/ws', events, {
	debug: true,
	validate: true,
})

client.connect()

client.onOpen(async () => {
	console.log('Connected!')

	try {
		// Authenticate
		console.log('Authenticating with token:', token)
		const authResult = await client.request('auth', { token })

		if (authResult.success) {
			console.log('Authenticated as:', authResult.user?.username)

			// Try accessing protected data
			const dataResult = await client.request('getData', {
				id: 'item-123',
			})
			console.log('Received data:', dataResult.data)
		} else {
			console.log('Authentication failed')
		}
	} catch (error) {
		console.error('Error:', error)
	}

	// Cleanup
	setTimeout(() => {
		client.close()
	}, 1000)
})

client.onClose(() => {
	console.log('Disconnected')
	process.exit(0)
})
