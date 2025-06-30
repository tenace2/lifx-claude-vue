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
	import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
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

	// Methods
	const addCommandResult = (command, status, message) => {
		const timestamp = new Date().toLocaleTimeString();
		commandOutput.value.push({
			timestamp,
			command,
			status, // 'success', 'error', 'info'
			message,
		});

		// Keep only last 20 entries
		if (commandOutput.value.length > 20) {
			commandOutput.value = commandOutput.value.slice(-20);
		}

		// Auto-scroll to bottom
		setTimeout(() => {
			const outputElement = document.querySelector(
				'.command-output .q-card-section'
			);
			if (outputElement) {
				outputElement.scrollTop = outputElement.scrollHeight;
			}
		}, 50);
	};

	const sendMcpCommand = async (command, description) => {
		try {
			addCommandResult(command, 'info', `Sending: ${description}`);

			const response = await apiCall('/api/mcp-command', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command }),
			});

			if (response.ok) {
				const data = await response.json();
				addCommandResult(
					command,
					'success',
					data.result || 'Command executed successfully'
				);
			} else {
				const error = await response.json();
				addCommandResult(command, 'error', error.error || 'Command failed');
			}
		} catch (error) {
			addCommandResult(command, 'error', `Network error: ${error.message}`);
		}
	};

	const turnLightBlue = async () => {
		loading.blue = true;
		try {
			// Using LIFX MCP server command to set all lights to blue
			await sendMcpCommand(
				'set-state selector:all color:blue power:on',
				'Turn all lights blue'
			);
		} finally {
			loading.blue = false;
		}
	};

	const turnLightRed = async () => {
		loading.red = true;
		try {
			// Using LIFX MCP server command to set all lights to red
			await sendMcpCommand(
				'set-state selector:all color:red power:on',
				'Turn all lights red'
			);
		} finally {
			loading.red = false;
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
		addCommandResult(
			'system',
			'info',
			'Light controls ready. Ensure MCP server is connected.'
		);
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
