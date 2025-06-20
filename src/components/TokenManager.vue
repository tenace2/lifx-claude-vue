<template>
	<div class="token-manager">
		<!-- Main Control Panel -->
		<q-card class="control-panel q-ma-md">
			<!-- Header with status -->
			<q-card-section class="row items-center justify-between bg-grey-1">
				<div class="row items-center">
					<q-icon name="build" size="md" class="q-mr-sm" />
					<span class="text-h6">MCP Server Control</span>
				</div>
				<div class="row items-center">
					<q-icon
						:name="serverStatus.connected ? 'circle' : 'radio_button_unchecked'"
						:color="serverStatus.connected ? 'positive' : 'grey'"
						size="sm"
						class="q-mr-xs"
					/>
					<span class="text-caption text-grey-7">
						{{ serverStatus.connected ? 'Connected' : 'Disconnected' }}
						{{ serverStatus.pid ? ` (PID: ${serverStatus.pid})` : '' }}
					</span>
				</div>
			</q-card-section>

			<!-- Architecture Info Banner -->
			<q-card-section class="bg-blue-1 border-bottom">
				<div class="row items-start q-gutter-md">
					<q-icon name="info" color="blue-6" size="sm" class="q-mt-xs" />
					<div class="col">
						<div class="text-body2 text-blue-8 q-mb-xs">
							<strong>Two-Server Architecture</strong>
						</div>
						<div class="text-caption text-blue-7">
							<strong>Backend Manager:</strong> mcp-server-manager.js (running
							on port 3001) - Provides HTTP API for this web interface<br />
							<strong>LIFX MCP Server:</strong> lifx-api-mcp-server.js (child
							process) - Handles actual LIFX device communication
						</div>
					</div>
				</div>
			</q-card-section>

			<!-- Token Status Section -->
			<q-card-section>
				<div
					class="row items-center justify-between q-pa-sm bg-grey-2 rounded-borders"
				>
					<div class="row items-center">
						<q-icon name="vpn_key" color="orange" size="sm" class="q-mr-sm" />
						<span class="text-body2">
							{{
								tokenStatus.hasToken
									? 'Token configured'
									: 'No token configured'
							}}
						</span>
					</div>
					<q-btn
						label="Set Token"
						color="primary"
						size="sm"
						@click="openTokenModal"
						:disabled="serverStatus.running"
					/>
				</div>
			</q-card-section>

			<!-- Control Buttons -->
			<q-card-section>
				<div class="row q-gutter-sm">
					<q-btn
						label="Start"
						icon="play_arrow"
						color="positive"
						class="col"
						@click="startServer"
						:disabled="!tokenStatus.hasToken || serverStatus.running"
					/>
					<q-btn
						label="Stop"
						icon="stop"
						color="negative"
						class="col"
						@click="stopServer"
						:disabled="!serverStatus.running"
					/>
					<q-btn
						label="Restart"
						icon="refresh"
						color="info"
						class="col"
						@click="restartServer"
						:disabled="!tokenStatus.hasToken"
					/>
				</div>
			</q-card-section>

			<!-- Server Output Section -->
			<q-card-section>
				<div class="text-h6 q-mb-sm row items-center justify-between">
					<div class="row items-center">
						<q-icon name="assignment" class="q-mr-sm" />
						<div>
							<div>Combined Server Logs</div>
							<div class="text-caption text-grey-6">
								Backend Manager + LIFX MCP Server Output
							</div>
						</div>
					</div>
					<div class="row q-gutter-xs">
						<q-btn
							dense
							flat
							icon="clear_all"
							color="grey-6"
							size="sm"
							@click="clearServerOutput"
							:disabled="serverOutput.length === 0"
						>
							<q-tooltip>Clear server output</q-tooltip>
						</q-btn>
						<q-btn-dropdown
							dense
							flat
							icon="content_copy"
							color="primary"
							size="sm"
							:disabled="serverOutput.length === 0"
						>
							<q-list>
								<q-item
									clickable
									v-close-popup
									@click="copyServerOutput('full')"
								>
									<q-item-section>
										<q-item-label>Copy Full Output</q-item-label>
										<q-item-label caption
											>All log entries with timestamps</q-item-label
										>
									</q-item-section>
								</q-item>
								<q-item
									clickable
									v-close-popup
									@click="copyServerOutput('messages')"
								>
									<q-item-section>
										<q-item-label>Copy Messages Only</q-item-label>
										<q-item-label caption>Just the log messages</q-item-label>
									</q-item-section>
								</q-item>
								<q-item
									clickable
									v-close-popup
									@click="copyServerOutput('errors')"
								>
									<q-item-section>
										<q-item-label>Copy Errors Only</q-item-label>
										<q-item-label caption
											>Error and warning messages</q-item-label
										>
									</q-item-section>
								</q-item>
							</q-list>
							<q-tooltip>Copy server output to clipboard</q-tooltip>
						</q-btn-dropdown>
					</div>
				</div>
				<q-card flat bordered class="server-output">
					<q-card-section
						class="bg-white text-dark"
						style="
							min-height: 200px;
							max-height: 400px;
							overflow-y: auto;
							border: 1px solid #e0e0e0;
						"
					>
						<div v-if="serverOutput.length === 0" class="text-grey-6 text-h6">
							Waiting for server status...
						</div>
						<div v-else>
							<div
								v-for="(line, index) in serverOutput"
								:key="index"
								class="output-line q-mb-xs font-mono text-h6"
							>
								<span class="text-grey-6">[{{ line.timestamp }}]</span>
								<span :class="getLogLevelClass(line.level)">{{
									line.message
								}}</span>
							</div>
						</div>
					</q-card-section>
				</q-card>
			</q-card-section>
		</q-card>

		<!-- Token Input Modal -->
		<q-dialog
			v-model="showTokenModal"
			persistent
			transition-show="scale"
			transition-hide="scale"
		>
			<q-card style="min-width: 500px">
				<q-card-section class="text-center q-pb-sm">
					<div class="text-h6 row items-center justify-center">
						<q-icon name="vpn_key" color="orange" size="md" class="q-mr-sm" />
						LIFX API Token Required
					</div>
				</q-card-section>

				<q-card-section class="text-center q-pt-none">
					<p class="text-body2 text-grey-7 q-mb-sm">
						Please enter your LIFX API token to start the MCP server.
					</p>
					<p class="text-caption text-grey-6">
						Token stored encrypted within password field,<br />
						and is only good for current browser session.
					</p>
				</q-card-section>

				<q-card-section>
					<q-input
						v-model="tempToken"
						:type="showPassword ? 'text' : 'password'"
						label="LIFX API Token"
						placeholder="Enter your LIFX token... (Ctrl+V to paste)"
						outlined
						maxlength="100"
						class="q-mb-sm"
						:error="tokenError !== ''"
						:error-message="tokenError"
						@keyup.enter="setToken"
						@paste="handlePaste"
						autocomplete="off"
						spellcheck="false"
					>
						<template v-slot:append>
							<q-btn
								flat
								round
								icon="content_paste"
								size="sm"
								@click="pasteFromClipboard"
								color="primary"
								title="Paste from clipboard"
							/>
							<q-btn
								flat
								round
								icon="visibility"
								size="sm"
								@click="togglePasswordVisibility"
								:color="showPassword ? 'primary' : 'grey'"
								title="Toggle password visibility"
							/>
						</template>
					</q-input>
					<div class="text-caption text-grey-6 q-mb-sm">
						💡 Tip: Use Ctrl+V (or Cmd+V on Mac) to paste, or click the paste
						button above
					</div>
					<p class="text-caption text-grey-6">
						Get your token from
						<a
							href="https://cloud.lifx.com/settings"
							target="_blank"
							class="text-primary"
						>
							LIFX Cloud Settings
						</a>
					</p>
				</q-card-section>

				<q-card-actions align="right" class="q-pa-md">
					<q-btn label="Cancel" color="grey" flat @click="closeTokenModal" />
					<q-btn
						label="Set Token & Start"
						color="primary"
						@click="setToken"
						:disabled="!tempToken.trim()"
					/>
				</q-card-actions>
			</q-card>
		</q-dialog>
	</div>
</template>

<script setup>
	import { ref, reactive, onMounted, watch } from 'vue';
	import { useQuasar } from 'quasar';
	import { useBackendStatus } from '../composables/useBackendStatus.js';

	// Quasar instance for notifications
	const $q = useQuasar();

	// Use shared backend status instead of local state
	const { serverStatus, serverOutput, addLogEntry, fetchServerStatus } =
		useBackendStatus();

	// Emits
	const emit = defineEmits(['server-status-change']);

	// Reactive state
	const showTokenModal = ref(false);
	const tempToken = ref('');
	const tokenError = ref('');
	const showPassword = ref(false);

	const tokenStatus = reactive({
		hasToken: false,
		tokenPreview: '',
	});

	// Polling interval for status updates (now managed by composable)
	const API_BASE_URL = 'http://localhost:3001/api';

	// Watch for server status changes and emit to parent
	watch(
		() => ({ ...serverStatus }),
		(newStatus) => {
			emit('server-status-change', newStatus);
		},
		{ deep: true }
	);

	// Methods
	const openTokenModal = () => {
		tempToken.value = '';
		tokenError.value = '';
		showPassword.value = false;
		showTokenModal.value = true;
	};

	const closeTokenModal = () => {
		showTokenModal.value = false;
		tempToken.value = '';
		tokenError.value = '';
		showPassword.value = false;
	};

	const setToken = () => {
		if (!tempToken.value.trim()) {
			tokenError.value = 'Token is required';
			return;
		}

		// Basic validation - LIFX tokens are typically 64 characters
		if (tempToken.value.length < 20) {
			tokenError.value = 'Token appears to be too short';
			return;
		}

		// Store token in session storage (not persistent)
		sessionStorage.setItem('lifx_token', tempToken.value);

		// Update token status
		tokenStatus.hasToken = true;
		tokenStatus.tokenPreview = `${tempToken.value.substring(
			0,
			8
		)}...${tempToken.value.substring(tempToken.value.length - 4)}`;

		// Add log entry
		addLogEntry('info', 'LIFX token configured successfully');

		// Close modal
		closeTokenModal();

		// Auto-start server after token is set
		setTimeout(() => {
			startServer();
		}, 500);
	};

	const startServer = async () => {
		if (!tokenStatus.hasToken) {
			addLogEntry('error', 'Cannot start server: No token configured');
			return;
		}

		try {
			addLogEntry('info', 'Starting MCP server...');

			const response = await fetch(`${API_BASE_URL}/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lifxToken: sessionStorage.getItem('lifx_token'),
				}),
			});

			if (response.ok) {
				const data = await response.json();
				addLogEntry('info', data.message);
			} else {
				const error = await response.json();
				addLogEntry('error', error.error || 'Failed to start server');
			}
		} catch (error) {
			addLogEntry('error', `Failed to start server: ${error.message}`);
		}
	};

	const stopServer = async () => {
		try {
			addLogEntry('info', 'Stopping MCP server...');

			const response = await fetch(`${API_BASE_URL}/stop`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			if (response.ok) {
				const data = await response.json();
				addLogEntry('info', data.message);
			} else {
				const error = await response.json();
				addLogEntry('error', error.error || 'Failed to stop server');
			}
		} catch (error) {
			addLogEntry('error', `Failed to stop server: ${error.message}`);
		}
	};

	const restartServer = async () => {
		if (!tokenStatus.hasToken) {
			addLogEntry('error', 'Cannot restart server: No token configured');
			return;
		}

		try {
			addLogEntry('info', 'Restarting MCP server...');

			const response = await fetch(`${API_BASE_URL}/restart`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lifxToken: sessionStorage.getItem('lifx_token'),
				}),
			});

			if (response.ok) {
				const data = await response.json();
				addLogEntry('info', data.message);
			} else {
				const error = await response.json();
				addLogEntry('error', error.error || 'Failed to restart server');
			}
		} catch (error) {
			addLogEntry('error', `Failed to restart server: ${error.message}`);
		}
	};

	const getLogLevelClass = (level) => {
		switch (level) {
			case 'error':
				return 'text-red-8'; // Dark red for white background
			case 'warn':
				return 'text-orange-8'; // Dark orange for white background
			case 'info':
				return 'text-blue-8'; // Dark blue for white background
			case 'success':
				return 'text-green-8'; // Dark green for white background
			default:
				return 'text-grey-8'; // Dark grey for default text
		}
	};

	// Token input helper methods
	const handlePaste = (event) => {
		// This handler is called when paste event occurs
		// No need to do anything special, just ensure the event isn't blocked
		setTimeout(() => {
			tokenError.value = ''; // Clear any previous errors
		}, 10);
	};

	const pasteFromClipboard = async () => {
		try {
			if (navigator.clipboard && navigator.clipboard.readText) {
				const text = await navigator.clipboard.readText();
				tempToken.value = text.trim();
				tokenError.value = ''; // Clear any previous errors
			} else {
				// Fallback for browsers that don't support clipboard API
				tokenError.value = 'Please use Ctrl+V (or Cmd+V) to paste your token';
			}
		} catch (error) {
			tokenError.value =
				'Unable to access clipboard. Please use Ctrl+V (or Cmd+V) to paste your token';
		}
	};

	const togglePasswordVisibility = () => {
		showPassword.value = !showPassword.value;
	};

	// Copy server output to clipboard
	const copyServerOutput = async (format = 'full') => {
		try {
			let outputText = '';

			switch (format) {
				case 'full':
					// Full format with timestamps and levels
					outputText = serverOutput.value
						.map(
							(entry) =>
								`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${
									entry.message
								}`
						)
						.join('\n');
					break;

				case 'messages':
					// Messages only, no timestamps or levels
					outputText = serverOutput.value
						.map((entry) => entry.message)
						.join('\n');
					break;

				case 'errors':
					// Only error and warning messages
					outputText = serverOutput.value
						.filter((entry) => ['error', 'warn'].includes(entry.level))
						.map(
							(entry) =>
								`[${entry.timestamp}] [${entry.level.toUpperCase()}] ${
									entry.message
								}`
						)
						.join('\n');
					break;
			}

			if (!outputText.trim()) {
				if ($q && $q.notify) {
					$q.notify({
						type: 'warning',
						message:
							format === 'errors'
								? 'No errors found to copy'
								: 'No output to copy',
						timeout: 2000,
						position: 'top-right',
					});
				}
				return;
			}
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(outputText);
				// Show success notification
				if ($q && $q.notify) {
					$q.notify({
						type: 'positive',
						message: `Server output copied (${getFormatName(format)})`,
						timeout: 2000,
						position: 'top-right',
					});
				}
			} else {
				// Fallback for older browsers
				const textArea = document.createElement('textarea');
				textArea.value = outputText;
				textArea.style.position = 'absolute';
				textArea.style.left = '-9999px';
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
				if ($q && $q.notify) {
					$q.notify({
						type: 'positive',
						message: `Server output copied (${getFormatName(format)})`,
						timeout: 2000,
						position: 'top-right',
					});
				}
			}
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			if ($q && $q.notify) {
				$q.notify({
					type: 'negative',
					message: 'Failed to copy server output to clipboard',
					timeout: 3000,
					position: 'top-right',
				});
			}
		}
	};

	// Clear server output
	const clearServerOutput = async () => {
		try {
			const response = await fetch('http://localhost:3001/api/clear-logs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const result = await response.json();
				// Clear the local display immediately
				serverOutput.value = [];

				// Use safe access to $q.notify
				if ($q && $q.notify) {
					$q.notify({
						type: 'positive',
						message: 'Server output cleared',
						timeout: 2000,
						position: 'top-right',
					});
				} else {
					console.log('Server output cleared successfully');
				}
			} else {
				throw new Error('Failed to clear server logs');
			}
		} catch (error) {
			console.error('Failed to clear server logs:', error);

			// Use safe access to $q.notify
			if ($q && $q.notify) {
				$q.notify({
					type: 'negative',
					message: 'Failed to clear server output',
					timeout: 3000,
					position: 'top-right',
				});
			} else {
				console.error('Failed to clear server output:', error.message);
			}
		}
	};

	// Helper function to get format display name
	const getFormatName = (format) => {
		switch (format) {
			case 'full':
				return 'Full Output';
			case 'messages':
				return 'Messages Only';
			case 'errors':
				return 'Errors Only';
			default:
				return 'Full Output';
		}
	};

	// Check for existing token on mount
	onMounted(() => {
		const existingToken = sessionStorage.getItem('lifx_token');
		if (existingToken) {
			tokenStatus.hasToken = true;
			tokenStatus.tokenPreview = `${existingToken.substring(
				0,
				8
			)}...${existingToken.substring(existingToken.length - 4)}`;
			addLogEntry('info', 'Found existing LIFX token');
		} else {
			addLogEntry('info', 'No token configured - click "Set Token" to begin');
		}
	});
</script>

<style scoped>
	.control-panel {
		max-width: 800px;
		margin: 0 auto;
	}

	.server-output {
		font-family: 'Courier New', monospace;
	}

	.output-line {
		line-height: 1.6;
		padding: 4px 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.output-line:last-child {
		border-bottom: none;
	}

	.font-mono {
		font-family: 'Courier New', monospace;
		font-size: 16px;
		font-weight: 600;
	}
</style>
