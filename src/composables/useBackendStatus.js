import { ref, reactive, onMounted, onUnmounted } from 'vue';
import {
	backendConnection,
	apiCall,
	discoverBackend,
} from './useBackendConnection.js';

// Shared state - will be the same across all components
const serverStatus = reactive({
	running: false,
	connected: false,
	pid: null,
	startTime: null,
});

// Backend reachability is now handled by backendConnection
const backendReachable = ref(false);

const serverOutput = ref([]);
let statusInterval = null;

// Helper function to add log entries (for compatibility with TokenManager)
const addLogEntry = (level, message) => {
	const timestamp = new Date().toISOString();
	const logEntry = {
		timestamp,
		level,
		message,
	};

	serverOutput.value.push(logEntry);

	// Keep only last 100 entries to prevent memory issues
	if (serverOutput.value.length > 100) {
		serverOutput.value = serverOutput.value.slice(-100);
	}
};

// Main status fetching function
const fetchServerStatus = async () => {
	try {
		const response = await apiCall('/api/status');

		if (response.ok) {
			// Backend server is reachable
			backendReachable.value = true;

			const data = await response.json();

			// Update server status
			serverStatus.running = data.status.running;
			serverStatus.connected = data.status.connected;
			serverStatus.pid = data.status.pid;
			serverStatus.startTime = data.status.startTime;

			// Update server output with latest logs
			if (data.logs && Array.isArray(data.logs)) {
				const newLogs = data.logs.filter(
					(log) =>
						!serverOutput.value.some(
							(existing) =>
								existing.timestamp === log.timestamp &&
								existing.message === log.message
						)
				);

				if (newLogs.length > 0) {
					serverOutput.value.push(...newLogs);

					// Keep only last 200 entries
					if (serverOutput.value.length > 200) {
						serverOutput.value = serverOutput.value.slice(-200);
					}
				}
			}
		} else {
			// Backend server responded but with error
			backendReachable.value = false;
		}
	} catch (error) {
		// Backend server is not reachable
		backendReachable.value = false;

		// Update connection status based on backendConnection state
		backendReachable.value = backendConnection.isConnected;

		// Update connection status
		if (!backendConnection.isConnected) {
			serverStatus.running = false;
			serverStatus.connected = false;
			serverStatus.pid = null;
			serverStatus.startTime = null;
		}

		// Only log if we haven't seen this error recently
		if (
			!serverOutput.value.some((log) =>
				log.message.includes('Backend server not available')
			)
		) {
			addLogEntry('error', `Backend server not available (${error.message})`);

			// Show port discovery info
			if (backendConnection.port) {
				addLogEntry('info', `Using backend on port ${backendConnection.port}`);
			}
		}
	}
};

// Composable function
export function useBackendStatus() {
	// Start polling when first component uses this composable
	const startPolling = () => {
		if (!statusInterval) {
			fetchServerStatus(); // Initial fetch
			statusInterval = setInterval(fetchServerStatus, 2000); // Poll every 2 seconds
		}
	};

	// Stop polling (for cleanup)
	const stopPolling = () => {
		if (statusInterval) {
			clearInterval(statusInterval);
			statusInterval = null;
		}
	};

	// Auto-start polling
	onMounted(() => {
		startPolling();
	});

	// Cleanup
	onUnmounted(() => {
		// Note: Don't stop polling here since other components might still need it
		// The interval will be shared across all components using this composable
	});

	return {
		serverStatus,
		serverOutput,
		backendReachable,
		fetchServerStatus,
		startPolling,
		stopPolling,
		addLogEntry,
		// Expose connection info for debugging
		backendConnection,
		discoverBackend,
	};
}
