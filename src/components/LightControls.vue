<template>
	<div class="light-controls">
		<q-card class="q-ma-md" style="min-width: 350px">
			<!-- Header -->
			<q-card-section class="row items-center justify-between bg-grey-1">
				<div class="row items-center">
					<q-icon name="lightbulb" size="md" class="q-mr-sm" color="amber" />
					<span class="text-h6">Quick Light Controls</span>
				</div>
				<div class="row items-center">
					<q-icon
						:name="isConnected ? 'circle' : 'radio_button_unchecked'"
						:color="isConnected ? 'positive' : 'grey'"
						size="sm"
						class="q-mr-xs"
					/>
					<span class="text-caption text-grey-7">
						{{ isConnected ? 'Ready' : 'Not Connected' }}
					</span>
				</div>
			</q-card-section>

			<!-- Control Buttons -->
			<q-card-section>
				<div class="text-body2 q-mb-md text-grey-7">
					Test MCP server with simple light commands:
				</div>

				<div class="row q-gutter-md">
					<q-btn
						label="Turn Blue"
						icon="lightbulb"
						color="blue"
						class="col"
						@click="turnLightBlue"
						:loading="loading.blue"
						:disable="!isConnected || loading.red"
					/>
					<q-btn
						label="Turn Red"
						icon="lightbulb"
						color="red"
						class="col"
						@click="turnLightRed"
						:loading="loading.red"
						:disable="!isConnected || loading.blue"
					/>
				</div>
			</q-card-section>

			<!-- Command Output -->
			<q-card-section>
				<div class="text-h6 q-mb-sm row items-center">
					<q-icon name="terminal" class="q-mr-sm" />
					Command Results
				</div>
				<q-card flat bordered class="command-output">
					<q-card-section
						class="bg-grey-10 text-white"
						style="min-height: 120px; max-height: 200px; overflow-y: auto"
					>
						<div v-if="commandOutput.length === 0" class="text-grey-5">
							Ready to send commands...
						</div>
						<div v-else>
							<div
								v-for="(entry, index) in commandOutput"
								:key="index"
								class="output-line q-mb-xs text-caption"
							>
								<span class="text-grey-5">[{{ entry.timestamp }}]</span>
								<span :class="getStatusClass(entry.status)">
									{{ entry.message }}
								</span>
							</div>
						</div>
					</q-card-section>
				</q-card>
			</q-card-section>
		</q-card>
	</div>
</template>

<script setup>
	import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
	import { apiCall } from '../composables/useBackendConnection.js';

	// Props (to receive server status from parent)
	const props = defineProps({
		mcpServerConnected: {
			type: Boolean,
			default: false,
		},
	});

	// Reactive state
	const loading = reactive({
		blue: false,
		red: false,
	});

	const commandOutput = ref([]);
	// API calls now use automatic port discovery

	// Computed properties
	const isConnected = computed(() => props.mcpServerConnected);

	// Watch for connection status changes
	watch(
		() => props.mcpServerConnected,
		(newValue, oldValue) => {
			console.log('🔌 [LightControls] Connection status changed:', {
				from: oldValue,
				to: newValue,
				timestamp: new Date().toISOString()
			});
			
			if (newValue) {
				addCommandResult('system', 'success', 'MCP server connected - buttons enabled');
			} else {
				addCommandResult('system', 'error', 'MCP server disconnected - buttons disabled');
			}
		}
	);

	// Methods
	const addCommandResult = (command, status, message) => {
		const timestamp = new Date().toLocaleTimeString();
		console.log('📝 [LightControls] Adding command result to UI:', {
			command,
			status,
			message,
			timestamp
		});

		commandOutput.value.push({
			timestamp,
			command,
			status, // 'success', 'error', 'info'
			message,
		});

		// Keep only last 20 entries
		if (commandOutput.value.length > 20) {
			commandOutput.value = commandOutput.value.slice(-20);
			console.log('✂️ [LightControls] Trimmed command output to last 20 entries');
		}

		// Auto-scroll to bottom
		setTimeout(() => {
			const outputElement = document.querySelector(
				'.command-output .q-card-section'
			);
			if (outputElement) {
				outputElement.scrollTop = outputElement.scrollHeight;
				console.log('📜 [LightControls] Auto-scrolled output to bottom');
			}
		}, 50);
	};

	const sendMcpCommand = async (command, description) => {
		console.log('🚀 [LightControls] sendMcpCommand called:', {
			command,
			description,
			timestamp: new Date().toISOString()
		});

		try {
			addCommandResult(command, 'info', `Sending: ${description}`);
			console.log('📤 [LightControls] Sending MCP command via API:', {
				endpoint: '/api/mcp-command',
				method: 'POST',
				command
			});

			const response = await apiCall('/api/mcp-command', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command }),
			});

			console.log('📥 [LightControls] API response received:', {
				status: response.status,
				ok: response.ok,
				statusText: response.statusText
			});

			if (response.ok) {
				const data = await response.json();
				console.log('✅ [LightControls] Command successful:', {
					command,
					responseData: data
				});
				addCommandResult(
					command,
					'success',
					data.result || 'Command executed successfully'
				);
			} else {
				const error = await response.json();
				console.error('❌ [LightControls] Command failed:', {
					command,
					status: response.status,
					error
				});
				addCommandResult(command, 'error', error.error || 'Command failed');
			}
		} catch (error) {
			console.error('💥 [LightControls] Network/Exception error:', {
				command,
				error: error.message,
				stack: error.stack
			});
			addCommandResult(command, 'error', `Network error: ${error.message}`);
		}
	};

	const turnLightBlue = async () => {
		console.log('🔵 [LightControls] BLUE BUTTON CLICKED!', {
			timestamp: new Date().toISOString(),
			currentLoadingState: { ...loading },
			isConnected: isConnected.value
		});

		loading.blue = true;
		console.log('🔄 [LightControls] Blue loading state set to true');

		try {
			// Using LIFX MCP server command to set all lights to blue
			console.log('🎯 [LightControls] About to send blue light command');
			await sendMcpCommand(
				'set-state selector:all color:blue power:on',
				'Turn all lights blue'
			);
			console.log('✨ [LightControls] Blue light command completed successfully');
		} catch (error) {
			console.error('💥 [LightControls] Blue light command failed:', error);
		} finally {
			loading.blue = false;
			console.log('🔄 [LightControls] Blue loading state set to false');
		}
	};

	const turnLightRed = async () => {
		console.log('🔴 [LightControls] RED BUTTON CLICKED!', {
			timestamp: new Date().toISOString(),
			currentLoadingState: { ...loading },
			isConnected: isConnected.value
		});

		loading.red = true;
		console.log('🔄 [LightControls] Red loading state set to true');

		try {
			// Using LIFX MCP server command to set all lights to red
			console.log('🎯 [LightControls] About to send red light command');
			await sendMcpCommand(
				'set-state selector:all color:red power:on',
				'Turn all lights red'
			);
			console.log('✨ [LightControls] Red light command completed successfully');
		} catch (error) {
			console.error('💥 [LightControls] Red light command failed:', error);
		} finally {
			loading.red = false;
			console.log('🔄 [LightControls] Red loading state set to false');
		}
	};

	const getStatusClass = (status) => {
		switch (status) {
			case 'success':
				return 'text-positive';
			case 'error':
				return 'text-negative';
			case 'info':
				return 'text-info';
			default:
				return 'text-white';
		}
	};

	// Lifecycle
	onMounted(() => {
		console.log('🚀 [LightControls] Component mounted!', {
			timestamp: new Date().toISOString(),
			mcpServerConnected: props.mcpServerConnected,
			initialLoadingState: { ...loading }
		});

		addCommandResult(
			'system',
			'info',
			'Light controls ready. Ensure MCP server is connected.'
		);
	});

	onBeforeUnmount(() => {
		console.log('🔚 [LightControls] Component unmounting', {
			timestamp: new Date().toISOString(),
			finalCommandOutputCount: commandOutput.value.length
		});
	});
</script>

<style scoped>
	.command-output {
		font-family: 'Courier New', monospace;
	}

	.output-line {
		line-height: 1.4;
	}
</style>
