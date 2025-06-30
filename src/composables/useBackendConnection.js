import { ref, reactive } from 'vue';

// Backend connection state
const backendConnection = reactive({
	port: null,
	baseUrl: null,
	isConnected: false,
	isDiscovering: false,
	error: null,
	lastDiscovery: null,
});

// Possible ports to try (in order of preference)
const POSSIBLE_PORTS = [3001, 3002, 3003, 3004, 3005];

// Discover which port the backend is running on
const discoverBackend = async () => {
	backendConnection.isDiscovering = true;
	backendConnection.error = null;

	console.log('🔍 Discovering backend server...');

	for (const port of POSSIBLE_PORTS) {
		try {
			const url = `http://localhost:${port}`;
			console.log(`🔍 Trying port ${port}...`);

			// Try to connect with a short timeout
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout

			const response = await fetch(`${url}/health`, {
				method: 'GET',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const data = await response.json();

				// Verify it's actually our backend by checking the response structure
				if (data.status === 'ok' && data.mcpServer !== undefined) {
					backendConnection.port = port;
					backendConnection.baseUrl = url;
					backendConnection.isConnected = true;
					backendConnection.isDiscovering = false;
					backendConnection.lastDiscovery = new Date().toISOString();

					console.log(`✅ Backend discovered on port ${port}`);
					return port;
				}
			}
		} catch (error) {
			console.log(`❌ Port ${port} not available: ${error.message}`);
		}
	}

	// If we get here, no backend was found
	backendConnection.isDiscovering = false;
	backendConnection.error = 'Backend server not found on any expected port';
	backendConnection.isConnected = false;

	console.error('🚨 Backend server not found on any port:', POSSIBLE_PORTS);
	throw new Error('Backend server not found on any expected port');
};

// Get API URL for a given endpoint
const getApiUrl = (endpoint) => {
	if (!backendConnection.baseUrl) {
		throw new Error(
			'Backend not discovered yet. Call discoverBackend() first.'
		);
	}
	return `${backendConnection.baseUrl}${endpoint}`;
};

// Make an API call with automatic backend discovery
const apiCall = async (endpoint, options = {}) => {
	// If not connected, try to discover backend first
	if (!backendConnection.isConnected) {
		await discoverBackend();
	}

	try {
		const url = getApiUrl(endpoint);
		const response = await fetch(url, options);

		// If we get a connection error, try to rediscover
		if (!response.ok && (response.status === 0 || response.status >= 500)) {
			console.log('🔄 Connection lost, attempting to rediscover backend...');
			backendConnection.isConnected = false;
			await discoverBackend();

			// Retry the request with new URL
			const retryUrl = getApiUrl(endpoint);
			return await fetch(retryUrl, options);
		}

		return response;
	} catch (error) {
		// If fetch fails completely, try to rediscover
		if (error.name === 'TypeError' || error.message.includes('fetch')) {
			console.log('🔄 Network error, attempting to rediscover backend...');
			backendConnection.isConnected = false;
			await discoverBackend();

			// Retry the request
			const retryUrl = getApiUrl(endpoint);
			return await fetch(retryUrl, options);
		}

		throw error;
	}
};

// Reset connection state (useful for debugging)
const resetConnection = () => {
	backendConnection.port = null;
	backendConnection.baseUrl = null;
	backendConnection.isConnected = false;
	backendConnection.isDiscovering = false;
	backendConnection.error = null;
	backendConnection.lastDiscovery = null;
};

export {
	backendConnection,
	discoverBackend,
	getApiUrl,
	apiCall,
	resetConnection,
	POSSIBLE_PORTS,
};
