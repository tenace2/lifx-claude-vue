<template>
	<div class="claude-chat">
		<q-card class="q-ma-md" style="min-width: 400px">
			<!-- Header -->
			<q-card-section class="row items-center justify-between bg-grey-1">
				<div class="row items-center">
					<q-icon name="smart_toy" size="md" class="q-mr-sm" color="primary" />
					<span class="text-h6">Claude AI Assistant</span>
				</div>
				<div class="row items-center">
					<q-icon
						:name="claudeStatus.hasApiKey ? 'circle' : 'radio_button_unchecked'"
						:color="claudeStatus.hasApiKey ? 'positive' : 'grey'"
						size="sm"
						class="q-mr-xs"
					/>
					<span class="text-caption text-grey-7">
						{{ claudeStatus.hasApiKey ? 'API Key Set' : 'No API Key' }}
					</span>
				</div>
			</q-card-section>

			<!-- Token Management Section -->
			<q-card-section>
				<div
					class="row items-center justify-between q-pa-sm bg-grey-2 rounded-borders"
				>
					<div class="row items-center">
						<q-icon name="vpn_key" color="blue" size="sm" class="q-mr-sm" />
						<span class="text-body2">
							{{
								claudeStatus.hasApiKey
									? 'Claude API configured'
									: 'No Claude API key configured'
							}}
						</span>
					</div>
					<q-btn
						label="Set API Key"
						color="primary"
						size="sm"
						@click="openClaudeTokenModal"
					/>
				</div>
			</q-card-section>

			<!-- Usage Statistics -->
			<q-card-section v-if="claudeStatus.hasApiKey" class="q-pt-none">
				<div class="row q-gutter-md">
					<div class="col">
						<q-card flat bordered class="text-center q-pa-sm">
							<div class="text-h6 text-primary">{{ totalTokensUsed }}</div>
							<div class="text-caption text-grey-6">Total Tokens</div>
							<q-tooltip class="text-body2" max-width="300px">
								<div class="q-pa-sm">
									<div class="text-weight-bold q-mb-xs">
										Token Breakdown per Request:
									</div>
									<div>• LIFX Tools: ~670 tokens</div>
									<div v-if="useSystemPrompt">
										• System Prompt: ~2,100 tokens
									</div>
									<div v-else>• System Prompt: 0 tokens (DISABLED)</div>
									<div>• Your Message: ~10-50 tokens</div>
									<div>• Claude Response: ~100-200 tokens</div>
									<div>• Other overhead: ~400-500 tokens</div>
									<div class="q-mt-xs text-weight-bold">
										{{
											useSystemPrompt
												? 'Total: ~3,200-3,400 per request'
												: 'Total: ~1,200-1,400 per request'
										}}
									</div>
									<div class="q-mt-xs text-caption">
										💡 Disable system prompt to save ~2,100 tokens per request
									</div>
									<div class="q-mt-sm text-caption text-blue-7">
										<strong>Filtering Behavior:</strong><br />
										• Keyword Filter ON: Non-lighting requests blocked (0
										tokens)<br />
										• Keyword Filter OFF: All requests sent to Claude (full
										token cost)<br />
										• Independent of system prompt setting
									</div>
								</div>
							</q-tooltip>
						</q-card>
					</div>
					<div class="col">
						<q-card flat bordered class="text-center q-pa-sm">
							<div class="text-h6 text-positive">
								${{ estimatedCost.toFixed(4) }}
							</div>
							<div class="text-caption text-grey-6">Est. Cost</div>
						</q-card>
					</div>
					<div class="col">
						<q-card flat bordered class="text-center q-pa-sm">
							<div class="text-h6 text-info">
								{{ conversationHistory.length }}
							</div>
							<div class="text-caption text-grey-6">Messages</div>
						</q-card>
					</div>
				</div>
			</q-card-section>

			<!-- Chat Interface -->
			<q-card-section v-if="claudeStatus.hasApiKey">
				<div class="text-h6 q-mb-sm row items-center">
					<q-icon name="chat" class="q-mr-sm" />
					Light Control Chat
				</div>

				<!-- Chat Messages -->
				<q-card
					flat
					bordered
					class="chat-container"
					style="height: 300px; overflow-y: auto"
				>
					<q-card-section class="q-pa-sm">
						<div
							v-if="conversationHistory.length === 0"
							class="text-grey-5 text-center q-pa-md"
						>
							<q-icon name="lightbulb" size="lg" class="q-mb-sm" />
							<div class="text-body2">Ask me to control your LIFX lights!</div>
							<div class="text-caption">
								Try: "Turn the lights blue" or "Dim the lights to 30%"
							</div>
						</div>

						<div
							v-for="(message, index) in conversationHistory"
							:key="index"
							class="q-mb-md"
						>
							<!-- User Message -->
							<div class="row justify-end q-mb-xs">
								<q-card
									flat
									class="bg-primary text-white q-pa-sm"
									style="max-width: 80%; border-radius: 18px"
								>
									<div class="text-body2">{{ message.content }}</div>
								</q-card>
							</div>

							<!-- Claude Response -->
							<div v-if="message.response" class="row justify-start">
								<q-card
									flat
									class="bg-grey-2 q-pa-sm"
									style="max-width: 80%; border-radius: 18px"
								>
									<div class="text-body2">{{ message.response }}</div>

									<!-- Action indicators -->
									<div v-if="message.actionTaken" class="q-mt-sm">
										<q-chip
											size="sm"
											color="positive"
											text-color="white"
											icon="lightbulb"
										>
											Action Taken
										</q-chip>
									</div>
									<div v-if="message.actionError" class="q-mt-sm">
										<q-chip
											size="sm"
											color="negative"
											text-color="white"
											icon="error"
										>
											{{ message.actionError }}
										</q-chip>
									</div>

									<!-- Token usage -->
									<div
										v-if="message.tokensUsed"
										class="text-caption text-grey-6 q-mt-xs"
									>
										{{ message.tokensUsed }} tokens
										{{ message.filtered ? '(filtered)' : '' }}
									</div>
								</q-card>
							</div>
						</div>

						<!-- Loading indicator -->
						<div v-if="isProcessing" class="row justify-start">
							<q-card
								flat
								class="bg-grey-2 q-pa-sm"
								style="border-radius: 18px"
							>
								<q-spinner-dots size="md" color="primary" />
								<span class="q-ml-sm text-body2">Claude is thinking...</span>
							</q-card>
						</div>
					</q-card-section>
				</q-card>

				<!-- System Prompt Control Panel -->
				<q-card flat bordered class="q-mt-md">
					<q-expansion-item
						icon="psychology"
						label="System Prompt Control"
						header-class="text-grey-7"
						dense
						:default-opened="false"
					>
						<q-card-section class="q-pa-md">
							<div class="row items-start justify-between q-mb-md">
								<div class="col">
									<div class="text-body2 q-mb-sm">
										<strong>What is a System Prompt?</strong>
									</div>
									<div class="text-body2 text-grey-7 q-mb-md">
										When initializing each Claude AI session, a system prompt
										(sometimes called a "system message" or "pre-prompt") sets
										strict boundaries for the AI assistant's behavior. This
										ensures Claude only responds to lighting control requests
										and helps prevent accidental off-topic conversations.
									</div>
									<div class="text-body2 text-grey-7 q-mb-md">
										<strong>Cost Impact:</strong> The system prompt consumes
										approximately
										<span class="text-primary">~2100 tokens per request</span>.
										While this increases costs, it significantly improves
										response quality and keeps conversations focused on LIFX
										lighting control.
									</div>
								</div>
							</div>

							<div class="row items-center justify-between q-mb-md">
								<div class="col">
									<div class="text-body2">
										<strong>Current Setting:</strong>
										<span
											:class="
												useSystemPrompt ? 'text-positive' : 'text-warning'
											"
										>
											{{
												useSystemPrompt
													? 'System Prompt Enabled'
													: 'System Prompt Disabled'
											}}
										</span>
									</div>
									<div class="text-caption text-grey-6">
										{{
											useSystemPrompt
												? 'Claude will stay focused on lighting control (~2100 extra tokens)'
												: 'Claude may respond to any topic (saves ~2100 tokens but less reliable)'
										}}
									</div>
								</div>
								<q-toggle
									v-model="useSystemPrompt"
									color="positive"
									size="lg"
									@update:model-value="onSystemPromptToggle"
								/>
							</div>

							<q-expansion-item
								icon="code"
								label="View Current System Prompt"
								dense
								header-class="text-grey-6"
								v-if="useSystemPrompt"
							>
								<q-card flat bordered class="q-mt-sm">
									<q-card-section class="q-pa-sm">
										<div class="text-caption text-grey-7 q-mb-xs">
											This is the exact prompt sent to Claude with every
											request:
										</div>
										<q-input
											:model-value="systemPromptPreview"
											type="textarea"
											readonly
											outlined
											dense
											:rows="6"
											class="monospace-font"
											style="
												font-family: 'Courier New', monospace;
												font-size: 12px;
											"
										/>
									</q-card-section>
								</q-card>
							</q-expansion-item>

							<div v-if="!useSystemPrompt" class="q-mt-md">
								<q-banner class="bg-warning text-dark" dense rounded>
									<template v-slot:avatar>
										<q-icon name="warning" />
									</template>
									<strong>Warning:</strong> With system prompt disabled, Claude
									may respond to non-lighting requests and might not use LIFX
									tools correctly.
								</q-banner>
							</div>
						</q-card-section>
					</q-expansion-item>
				</q-card>

				<!-- Keyword Filter Control Panel -->
				<q-card flat bordered class="q-mt-md">
					<q-expansion-item
						icon="filter_alt"
						label="Keyword Filter Control"
						default-opened
						header-class="bg-blue-1 text-blue-8"
					>
						<q-card-section class="bg-blue-1">
							<div class="text-body2 q-mb-md">
								<div class="q-mb-xs">
									<strong>What is Keyword Filtering?</strong>
								</div>
								<div class="text-caption text-blue-7 q-mb-md">
									Pre-filtering checks user messages for lighting-related
									keywords before sending to Claude API. When enabled,
									non-lighting requests are blocked locally, saving tokens and
									API costs. This works independently of the system prompt
									setting.
								</div>
								<div class="text-caption text-blue-7">
									<strong>Educational Value:</strong> Toggle this to understand
									how client-side filtering compares to server-side prompting
									for controlling AI behavior.
								</div>
							</div>

							<div class="row items-center justify-between q-mb-md">
								<div class="col">
									<div class="text-body2">
										<strong>Current Setting:</strong>
										<span
											:class="
												useKeywordFilter ? 'text-positive' : 'text-warning'
											"
										>
											{{
												useKeywordFilter
													? 'Keyword Filter Enabled'
													: 'Keyword Filter Disabled'
											}}
										</span>
									</div>
									<div class="text-caption text-grey-6">
										{{
											useKeywordFilter
												? 'Non-lighting requests blocked locally (saves tokens)'
												: 'All requests sent to Claude (may consume tokens for rejections)'
										}}
									</div>
								</div>
								<q-toggle
									v-model="useKeywordFilter"
									color="positive"
									size="lg"
									@update:model-value="onKeywordFilterToggle"
								/>
							</div>

							<q-expansion-item
								icon="list"
								label="View Current Keywords"
								dense
								header-class="text-grey-6"
								v-if="useKeywordFilter"
							>
								<q-card flat class="bg-white q-mt-sm">
									<q-card-section class="q-pa-md">
										<div class="text-caption text-grey-7 q-mb-sm">
											Messages containing any of these keywords will be sent to
											Claude:
										</div>
										<div class="text-body2 font-mono bg-grey-2 q-pa-sm rounded">
											light, lights, bulb, lamp, brightness, bright, dim, color,
											red, blue, green, yellow, orange, purple, pink, white,
											warm, cool, kelvin, on, off, turn, set, lifx, effect,
											breathe, pulse, scene, mood, ambiance
										</div>
									</q-card-section>
								</q-card>
							</q-expansion-item>

							<div v-if="!useKeywordFilter" class="q-mt-md">
								<q-banner class="bg-warning text-dark" dense rounded>
									<template v-slot:avatar>
										<q-icon name="warning" />
									</template>
									<strong>Educational Note:</strong> With keyword filtering
									disabled, all messages (including non-lighting requests) will
									be sent to Claude, consuming tokens even for rejections.
								</q-banner>
							</div>
						</q-card-section>
					</q-expansion-item>
				</q-card>

				<!-- Message Input -->
				<div class="q-mt-md">
					<q-input
						v-model="currentMessage"
						placeholder="Ask me to control your lights... (e.g., 'Turn lights red')"
						outlined
						@keyup.enter="sendMessage"
						:disable="isProcessing"
						class="q-mb-sm"
					>
						<template v-slot:append>
							<q-btn
								round
								dense
								flat
								icon="send"
								color="primary"
								@click="sendMessage"
								:disable="!currentMessage.trim() || isProcessing"
							/>
						</template>
					</q-input>

					<!-- Clear conversation button -->
					<div class="row justify-between items-center q-mb-sm">
						<div class="text-caption text-grey-6">
							💡 This assistant only responds to lighting control requests
						</div>
						<q-btn
							v-if="conversationHistory.length > 0"
							flat
							dense
							size="sm"
							label="Clear Chat"
							icon="clear_all"
							color="grey-6"
							@click="clearChat"
						/>
					</div>
				</div>

				<!-- Quick Actions -->
				<div class="q-mt-md">
					<div class="text-body2 q-mb-sm text-grey-7">Quick Commands:</div>
					<div class="row q-gutter-xs">
						<q-btn
							size="sm"
							outline
							color="primary"
							@click="sendQuickMessage('Turn lights on')"
							:disable="isProcessing"
						>
							Lights On
						</q-btn>
						<q-btn
							size="sm"
							outline
							color="primary"
							@click="sendQuickMessage('Turn lights off')"
							:disable="isProcessing"
						>
							Lights Off
						</q-btn>
						<q-btn
							size="sm"
							outline
							color="primary"
							@click="sendQuickMessage('Dim lights to 30%')"
							:disable="isProcessing"
						>
							Dim
						</q-btn>
						<q-btn
							size="sm"
							outline
							color="primary"
							@click="sendQuickMessage('Warm white lights')"
							:disable="isProcessing"
						>
							Warm White
						</q-btn>
					</div>
				</div>
			</q-card-section>

			<!-- Settings Section -->
			<q-card-section v-if="claudeStatus.hasApiKey" class="q-pt-none">
				<q-expansion-item
					icon="settings"
					label="Advanced Settings"
					header-class="text-grey-7"
					dense
				>
					<q-card flat bordered class="q-mt-sm">
						<q-card-section class="q-pa-md">
							<div class="row q-gutter-md items-center">
								<div class="col-auto">
									<q-icon name="tune" color="grey-6" />
								</div>
								<div class="col">
									<q-input
										v-model.number="maxTokens"
										type="number"
										label="Max Tokens per Request"
										dense
										outlined
										:min="100"
										:max="999"
										:step="50"
										style="width: 150px"
									>
										<template v-slot:hint>
											<span class="text-caption">
												100-999 tokens ({{
													(maxTokens * 0.00000034).toFixed(6)
												}}$ max per request)
											</span>
										</template>
									</q-input>
								</div>
								<div class="col-auto">
									<q-btn
										flat
										dense
										icon="refresh"
										color="grey-6"
										@click="resetMaxTokens"
										size="sm"
									>
										<q-tooltip>Reset to default (500)</q-tooltip>
									</q-btn>
								</div>
							</div>
						</q-card-section>
					</q-card>
				</q-expansion-item>
			</q-card-section>

			<!-- LIFX Device Info Display Section -->
			<q-card-section v-if="claudeStatus.hasApiKey" class="q-pt-none">
				<q-expansion-item
					icon="lightbulb"
					label="LIFX Device Information"
					header-class="text-grey-7"
					dense
					:default-opened="true"
				>
					<q-card flat bordered class="q-mt-sm">
						<q-card-section class="q-pa-md">
							<div class="row items-center justify-between q-mb-sm">
								<div class="text-body2 text-grey-7">
									Latest device info and command results:
								</div>
								<div class="row q-gutter-xs">
									<q-btn
										flat
										dense
										size="sm"
										icon="content_copy"
										color="primary"
										@click="copyLifxInfo"
										:disable="!lifxInfo"
									>
										<q-tooltip>Copy to clipboard</q-tooltip>
									</q-btn>
									<q-btn
										flat
										dense
										size="sm"
										icon="clear"
										color="grey-6"
										@click="clearLifxInfo"
										:disable="!lifxInfo"
									>
										<q-tooltip>Clear info</q-tooltip>
									</q-btn>
								</div>
							</div>
							<q-input
								v-model="lifxInfo"
								type="textarea"
								readonly
								outlined
								dense
								placeholder="LIFX device information will appear here when you use commands like 'list my lights' or 'show device status'..."
								:rows="8"
								class="monospace-font"
								style="font-family: 'Courier New', monospace; font-size: 13px"
							/>
						</q-card-section>
					</q-card>
				</q-expansion-item>
			</q-card-section>

			<!-- Clear Chat Button -->
			<q-card-section
				v-if="claudeStatus.hasApiKey && conversationHistory.length > 0"
				class="q-pt-none"
			>
				<q-btn
					label="Clear Chat History"
					color="grey"
					flat
					size="sm"
					@click="clearChat"
					icon="clear_all"
				/>
			</q-card-section>
		</q-card>

		<!-- Claude API Token Modal -->
		<q-dialog
			v-model="showClaudeTokenModal"
			persistent
			transition-show="scale"
			transition-hide="scale"
		>
			<q-card style="min-width: 500px">
				<q-card-section class="text-center q-pb-sm">
					<div class="text-h6 row items-center justify-center">
						<q-icon name="smart_toy" color="blue" size="md" class="q-mr-sm" />
						Claude API Key Required
					</div>
				</q-card-section>

				<q-card-section class="text-center q-pt-none">
					<p class="text-body2 text-grey-7 q-mb-sm">
						Enter your Claude API key to enable AI-powered light control.
					</p>
					<p class="text-caption text-grey-6">
						Key is stored in session only and used for lighting requests only.
					</p>
				</q-card-section>

				<q-card-section>
					<q-input
						v-model="tempClaudeToken"
						:type="showClaudePassword ? 'text' : 'password'"
						label="Claude API Key"
						placeholder="Enter your Claude API key..."
						outlined
						maxlength="200"
						class="q-mb-sm"
						:error="claudeTokenError !== ''"
						:error-message="claudeTokenError"
						@keyup.enter="setClaudeToken"
						autocomplete="off"
						spellcheck="false"
					>
						<template v-slot:append>
							<q-btn
								flat
								round
								icon="content_paste"
								size="sm"
								@click="pasteClaudeToken"
								color="primary"
								title="Paste from clipboard"
							/>
							<q-btn
								flat
								round
								icon="visibility"
								size="sm"
								@click="toggleClaudePasswordVisibility"
								:color="showClaudePassword ? 'primary' : 'grey'"
								title="Toggle password visibility"
							/>
						</template>
					</q-input>
					<div class="text-caption text-grey-6 q-mb-sm">
						💡 Tip: Use Ctrl+V (or Cmd+V on Mac) to paste, or click the paste
						button
					</div>
					<p class="text-caption text-grey-6">
						Get your API key from
						<a
							href="https://console.anthropic.com/"
							target="_blank"
							class="text-primary"
						>
							Anthropic Console
						</a>
					</p>
				</q-card-section>

				<q-card-actions align="right" class="q-pa-md">
					<q-btn
						label="Cancel"
						color="grey"
						flat
						@click="closeClaudeTokenModal"
					/>
					<q-btn
						label="Set API Key"
						color="primary"
						@click="setClaudeToken"
						:disabled="!tempClaudeToken.trim()"
					/>
				</q-card-actions>
			</q-card>
		</q-dialog>
	</div>
</template>

<script setup>
	import { ref, reactive, computed, onMounted, nextTick } from 'vue';
	import { useQuasar } from 'quasar';
	import ClaudeApiService from '../services/claudeApi.js';

	// Quasar instance
	const $q = useQuasar();

	// Props
	const props = defineProps({
		mcpServerConnected: {
			type: Boolean,
			default: false,
		},
	});

	// Reactive state
	const claudeApi = new ClaudeApiService();
	const showClaudeTokenModal = ref(false);
	const tempClaudeToken = ref('');
	const claudeTokenError = ref('');
	const showClaudePassword = ref(false);

	const claudeStatus = reactive({
		hasApiKey: false,
	});

	const conversationHistory = ref([]);
	const currentMessage = ref('');
	const isProcessing = ref(false);
	const totalTokensUsed = ref(0);
	const totalCost = ref(0);
	const maxTokens = ref(500); // Default max tokens
	const lifxInfo = ref('');
	const useSystemPrompt = ref(true); // Default enabled for safety
	const useKeywordFilter = ref(true); // Default enabled for safety

	// System prompt content for preview
	const systemPromptPreview = computed(() => {
		return `You are a comprehensive LIFX smart lighting assistant with access to the full LIFX API. You can control lights, create effects, manage scenes, and perform advanced lighting operations.

AVAILABLE CAPABILITIES:

**Basic Light Control:**
- set-state: Turn lights on/off, change colors, adjust brightness
- list-lights: Get information about available lights
- toggle-power: Toggle lights on/off
- state-delta: Make relative adjustments to light properties

**Visual Effects:**
- breathe-effect: Slow breathing/fading effect between colors
- pulse-effect: Quick pulsing/flashing effect between colors
- move-effect: Moving color patterns (for LIFX Z strips)
- morph-effect: Color morphing patterns (for LIFX Tiles)
- flame-effect: Flickering flame effect (for LIFX Tiles)
- clouds-effect: Soft cloud-like color transitions (for LIFX Tiles)
- sunrise-effect: Gradual sunrise simulation (for LIFX Tiles)
- sunset-effect: Gradual sunset simulation (for LIFX Tiles)
- effects-off: Stop any running effects

**Scene Management:**
- list-scenes: Show available scenes in user's account
- activate-scene: Activate a saved scene by UUID

**Advanced Features:**
- cycle: Cycle lights through multiple color states
- validate-color: Check if a color string is valid
- clean: Control LIFX Clean devices

**How to Use Tools:**
Always specify the 'tool' parameter first, then provide the appropriate parameters for that tool.

Examples:
- "Turn lights red" → tool: "set-state", color: "red", selector: "all"
- "Create breathing effect with blue and green" → tool: "breathe-effect", color: "blue", from_color: "green", cycles: 10
- "Create infinite breathing effect" → tool: "breathe-effect", color: "red", from_color: "blue" (omit cycles parameter for infinite)
- "Start a sunrise effect" → tool: "sunrise-effect", duration: 300 (5 minutes)
- "List all my lights" → tool: "list-lights", selector: "all"
- "Activate bedroom scene" → tool: "activate-scene", scene_uuid: "[uuid from list-scenes]"

**Important Guidelines:**
- ALWAYS focus on the CURRENT user request - ignore previous conversation context if it conflicts
- ALWAYS use the control_lifx_lights tool when users want to control lights
- ALWAYS provide a friendly confirmation message after using the tool
- For MULTI-STEP requests: Use multiple tool calls in a single response to accomplish all requested actions
- For effects, suggest appropriate durations and parameters
- For infinite effects (breathe, pulse, etc.), OMIT the 'cycles' parameter entirely - do not set it to "infinite"
- If asked about anything non-lighting related, respond: "Sorry, I can only help with controlling your LIFX lights."
- Be creative with effects - you have access to the full LIFX API!
- PAY ATTENTION: If user says "blue", use blue - not any other color from previous requests

**Multi-Step Example:**
- "Turn lights blue then breathe red to green" → Use TWO tool calls: 
  1. tool: "set-state", color: "blue", selector: "all"
  2. tool: "breathe-effect", color: "green", from_color: "red", cycles: 5

**Light Selectors:**
- "all" - All lights in account
- "label:Kitchen" - Lights labeled "Kitchen" 
- "group:Living Room" - Lights in "Living Room" group
- "id:d073d5..." - Specific light by ID

**Color Formats:**
- Named colors: "red", "blue", "green", "purple", "pink", "orange", "yellow", "white"
- Hex codes: "#ff0000", "#00ff00"
- HSB: "hue:120 saturation:1.0 brightness:0.5"
- Kelvin: "kelvin:3500" (warm white to cool white: 2500-9000K)

You have full access to create amazing lighting experiences!`;
	});

	// Computed properties
	const estimatedCost = computed(() => totalCost.value);

	// Methods
	const openClaudeTokenModal = () => {
		tempClaudeToken.value = '';
		claudeTokenError.value = '';
		showClaudePassword.value = false;
		showClaudeTokenModal.value = true;
	};

	const closeClaudeTokenModal = () => {
		showClaudeTokenModal.value = false;
		tempClaudeToken.value = '';
		claudeTokenError.value = '';
		showClaudePassword.value = false;
	};

	const pasteClaudeToken = async () => {
		try {
			if (navigator.clipboard && navigator.clipboard.readText) {
				const text = await navigator.clipboard.readText();
				tempClaudeToken.value = text.trim();
				claudeTokenError.value = '';
			} else {
				claudeTokenError.value =
					'Please use Ctrl+V (or Cmd+V) to paste your API key';
			}
		} catch (error) {
			claudeTokenError.value =
				'Unable to access clipboard. Please use Ctrl+V (or Cmd+V) to paste';
		}
	};

	const toggleClaudePasswordVisibility = () => {
		showClaudePassword.value = !showClaudePassword.value;
	};

	const setClaudeToken = () => {
		if (!tempClaudeToken.value.trim()) {
			claudeTokenError.value = 'API key is required';
			return;
		}

		// Basic validation
		if (tempClaudeToken.value.length < 20) {
			claudeTokenError.value = 'API key appears to be too short';
			return;
		}

		// Store token in session storage
		sessionStorage.setItem('claude_api_key', tempClaudeToken.value);
		claudeApi.setApiKey(tempClaudeToken.value);
		claudeStatus.hasApiKey = true;

		closeClaudeTokenModal();
	};

	const sendMessage = async () => {
		if (!currentMessage.value.trim() || isProcessing.value) return;
		if (!claudeStatus.hasApiKey) {
			openClaudeTokenModal();
			return;
		}

		const userMessage = currentMessage.value.trim();
		currentMessage.value = '';
		isProcessing.value = true;

		// Check if message will be filtered BEFORE adding to history
		const willBeFiltered = !claudeApi.isLightingRelated(userMessage);

		// Add user message to history
		const messageEntry = {
			role: 'user',
			content: userMessage,
			timestamp: new Date().toISOString(),
		};

		conversationHistory.value.push(messageEntry);

		try {
			// Get conversation context (both user and assistant messages)
			// Exclude the current message since it doesn't have a response yet
			const context = [];
			const previousMessages = conversationHistory.value.slice(-11, -1); // Get previous messages, excluding current one

			for (const msg of previousMessages) {
				// Only include messages that are complete (have both user message and assistant response)
				if (!msg.filtered && msg.response && msg.response.trim()) {
					context.push({ role: 'user', content: msg.content });
					context.push({ role: 'assistant', content: msg.response });
				}
			}

			// Debug: Log the context being sent
			console.log('Conversation context being sent:', context);

			const result = await claudeApi.sendMessage(
				userMessage,
				context, // Send proper conversation history
				maxTokens.value, // Pass user-configured max tokens
				useSystemPrompt.value, // Pass system prompt preference
				useKeywordFilter.value // Pass keyword filter preference
			);

			// Update the last message with the response
			const lastMessage =
				conversationHistory.value[conversationHistory.value.length - 1];
			lastMessage.response = result.response;
			lastMessage.tokensUsed = result.totalTokens || 0; // Fix NaN issue
			lastMessage.filtered = result.filtered;
			lastMessage.toolResults = result.toolResults || [];

			// If there were tool results, add details about the actions taken
			if (result.toolResults && result.toolResults.length > 0) {
				const toolSuccess = result.toolResults.some((r) => r.success);
				const toolErrors = result.toolResults.filter((r) => r.error);

				if (toolSuccess) {
					lastMessage.actionTaken = true;
				}
				if (toolErrors.length > 0) {
					lastMessage.actionError = toolErrors.map((e) => e.error).join(', ');
				}

				// Capture LIFX information for display (especially for list-lights, etc.)
				result.toolResults.forEach((toolResult) => {
					console.log('Tool result:', toolResult); // Debug log
					if (toolResult.lifxData && toolResult.lifxData.trim()) {
						console.log('Found lifxData:', toolResult.lifxData); // Debug log
						// Update the LIFX info display with formatted data
						const timestamp = new Date().toLocaleTimeString();
						const newInfo = `[${timestamp}] ${toolResult.lifxData}\n`;
						lifxInfo.value += newInfo;

						// Keep only last 5000 characters to prevent overflow
						if (lifxInfo.value.length > 5000) {
							lifxInfo.value = lifxInfo.value.substring(
								lifxInfo.value.length - 5000
							);
						}
					} else {
						console.log('No lifxData found in tool result'); // Debug log
					}
				});
			}

			// Update totals (fix NaN by ensuring numbers)
			const tokensToAdd = result.totalTokens || 0;
			console.log('=== DETAILED TOKEN DEBUG ===');
			console.log('Raw result object:', result);
			console.log('result.totalTokens:', result.totalTokens);
			console.log('result.inputTokens:', result.inputTokens);
			console.log('result.tokensUsed:', result.tokensUsed);
			console.log('tokensToAdd (calculated):', tokensToAdd);
			console.log('Current totalTokensUsed.value:', totalTokensUsed.value);
			console.log('Token counting debug:', {
				totalTokens: result.totalTokens,
				inputTokens: result.inputTokens,
				outputTokens: result.tokensUsed,
				tokensToAdd: tokensToAdd,
				currentTotal: totalTokensUsed.value,
				newTotal: totalTokensUsed.value + tokensToAdd,
			});
			console.log('=== END TOKEN DEBUG ===');

			totalTokensUsed.value += tokensToAdd;
			totalCost.value += claudeApi.getEstimatedCost(
				result.inputTokens || 0,
				result.tokensUsed || 0
			);
		} catch (error) {
			const lastMessage =
				conversationHistory.value[conversationHistory.value.length - 1];
			lastMessage.response = `Error: ${error.message}`;
			lastMessage.tokensUsed = 0;
		} finally {
			isProcessing.value = false;

			// Auto-scroll to bottom
			nextTick(() => {
				const chatContainer = document.querySelector(
					'.chat-container .q-card-section'
				);
				if (chatContainer) {
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			});
		}
	};

	const sendQuickMessage = (message) => {
		currentMessage.value = message;
		sendMessage();
	};

	const clearChat = () => {
		conversationHistory.value = [];
		totalTokensUsed.value = 0;
		totalCost.value = 0;
	};

	const resetMaxTokens = () => {
		maxTokens.value = 500;
	};

	const copyLifxInfo = async () => {
		try {
			await navigator.clipboard.writeText(lifxInfo.value);
			$q.notify({
				type: 'positive',
				message: 'LIFX info copied to clipboard',
				timeout: 2000,
				position: 'top-right',
			});
		} catch (err) {
			console.error('Failed to copy: ', err);
			$q.notify({
				type: 'negative',
				message: 'Failed to copy LIFX info',
				timeout: 2000,
				position: 'top-right',
			});
		}
	};

	const clearLifxInfo = () => {
		lifxInfo.value = '';
	};

	const onSystemPromptToggle = (enabled) => {
		// Update the reactive value immediately
		useSystemPrompt.value = enabled;

		// Save preference to session storage
		sessionStorage.setItem('use_system_prompt', enabled.toString());

		// Use the $q instance properly
		if ($q && $q.notify) {
			$q.notify({
				type: enabled ? 'positive' : 'warning',
				message: enabled
					? 'System prompt enabled - Claude will stay focused on lighting control'
					: 'System prompt disabled - Claude may respond to any topic',
				timeout: 3000,
				position: 'top-right',
			});
		} else {
			console.log('System prompt toggled:', enabled ? 'enabled' : 'disabled');
		}
	};

	const onKeywordFilterToggle = (enabled) => {
		// Update the reactive value immediately
		useKeywordFilter.value = enabled;

		// Save preference to session storage
		sessionStorage.setItem('use_keyword_filter', enabled.toString());

		// Use the $q instance properly
		if ($q && $q.notify) {
			$q.notify({
				type: enabled ? 'positive' : 'warning',
				message: enabled
					? 'Keyword filter enabled - Non-lighting requests will be blocked'
					: 'Keyword filter disabled - All requests will be sent to Claude',
				timeout: 3000,
				position: 'top-right',
			});
		} else {
			console.log('Keyword filter toggled:', enabled ? 'enabled' : 'disabled');
		}
	};

	// Lifecycle
	onMounted(() => {
		// Check for existing Claude API key
		const existingKey = sessionStorage.getItem('claude_api_key');
		if (existingKey) {
			claudeApi.setApiKey(existingKey);
			claudeStatus.hasApiKey = true;
		}

		// Load system prompt preference (default to true for safety)
		const savedPromptSetting = sessionStorage.getItem('use_system_prompt');
		if (savedPromptSetting !== null) {
			useSystemPrompt.value = savedPromptSetting === 'true';
		}

		// Load keyword filter preference (default to true for safety)
		const savedFilterSetting = sessionStorage.getItem('use_keyword_filter');
		if (savedFilterSetting !== null) {
			useKeywordFilter.value = savedFilterSetting === 'true';
		}
	});
</script>

<style scoped>
	.chat-container {
		border: 1px solid #e0e0e0;
	}

	.lifx-info-display {
		background-color: #f9f9f9;
		border-radius: 8px;
		padding: 10px;
		overflow-x: auto;
	}
</style>
