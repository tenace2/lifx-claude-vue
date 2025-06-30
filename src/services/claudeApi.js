// Claude API Service
import { apiCall } from '../composables/useBackendConnection.js';

class ClaudeApiService {
	constructor() {
		this.apiKey = null;
		this.baseUrl = 'https://api.anthropic.com/v1/messages';
		this.model = 'claude-3-haiku-20240307'; // Using Haiku for cost efficiency
		this.maxTokens = 300; // Keep responses concise
		this.systemPrompt = `You are a smart lightbulb assistant for controlling LIFX smart lights. You have access to the control_lifx_lights tool to actually control the lights.

STRICT RULES:
- Only respond to requests about controlling LIFX lights (color, brightness, power, effects, scenes)
- If asked about anything else, respond exactly: "Sorry, I can only help with controlling your LIFX lights."
- Keep responses concise and focused on light control
- Always use the control_lifx_lights tool when the user wants to change light settings
- Confirm what action you took with the lights after using the tool

Available light controls via the tool:
- Turn lights on/off (action: "power", power: "on"/"off")
- Change colors (action: "color", color: "red"/"blue"/"green"/"warm white", optional kelvin for whites)
- Adjust brightness (action: "brightness", brightness: 0.0-1.0)
- Control specific lights by selector (selector: "all"/"label:bedroom"/"group:living room")

Examples:
- "Turn lights red" → use tool with action: "color", color: "red", selector: "all"
- "Dim to 30%" → use tool with action: "brightness", brightness: 0.3, selector: "all"  
- "Turn bedroom lights off" → use tool with action: "power", power: "off", selector: "label:bedroom"

Always use the tool for actual light control, then confirm the action in your response.`;
	}

	setApiKey(apiKey) {
		this.apiKey = apiKey;
	}

	hasApiKey() {
		return !!this.apiKey;
	}

	// Pre-filter messages to avoid unnecessary API calls
	isLightingRelated(message) {
		const lightingKeywords = [
			'light',
			'lights',
			'bulb',
			'lamp',
			'brightness',
			'bright',
			'dim',
			'color',
			'red',
			'blue',
			'green',
			'yellow',
			'orange',
			'purple',
			'pink',
			'white',
			'warm',
			'cool',
			'kelvin',
			'on',
			'off',
			'turn',
			'set',
			'lifx',
			'effect',
			'breathe',
			'pulse',
			'scene',
			'mood',
			'ambiance',
		];

		const lowerMessage = message.toLowerCase();

		// Use word boundaries for short keywords that might cause false positives
		const shortKeywords = ['on', 'off', 'set', 'red', 'dim'];

		return lightingKeywords.some((keyword) => {
			if (shortKeywords.includes(keyword)) {
				// Use word boundary regex for short keywords
				const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
				return wordBoundaryRegex.test(message);
			} else {
				// Use simple substring matching for longer keywords
				return lowerMessage.includes(keyword);
			}
		});
	}

	async sendMessage(
		userMessage,
		conversationHistory = [],
		maxTokens = 500,
		useSystemPrompt = true,
		useKeywordFilter = true
	) {
		if (!this.apiKey) {
			throw new Error('Claude API key not configured');
		}

		// Pre-filter: Check if message is lighting-related (independent of system prompt)
		if (useKeywordFilter && !this.isLightingRelated(userMessage)) {
			return {
				response: 'Sorry, I can only help with controlling your LIFX lights.',
				tokensUsed: 0,
				filtered: true,
			};
		}

		try {
			console.log('Sending message to Claude via backend:', userMessage);

			// TEMPORARY: Disable conversation context to isolate the issue
			// Each request will be treated independently
			const context = [];

			console.log('Context being sent to backend:', context);
			console.log('=== FRONTEND SYSTEM PROMPT DEBUG ===');
			console.log('useSystemPrompt value:', useSystemPrompt);
			console.log('useSystemPrompt type:', typeof useSystemPrompt);
			console.log('=== END FRONTEND DEBUG ===');

			// Use backend proxy with automatic port discovery
			const response = await apiCall('/api/claude', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: userMessage,
					conversationHistory: context,
					apiKey: this.apiKey,
					maxTokens: maxTokens,
					useSystemPrompt: useSystemPrompt,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Backend error: ${response.status}`);
			}

			const data = await response.json();
			console.log('Backend response:', data);
			console.log('=== TOKEN BREAKDOWN ===');
			console.log(
				`Input tokens: ${
					data.inputTokens || 0
				} (includes tool schema + system prompt + message)`
			);
			console.log(`Output tokens: ${data.tokensUsed || 0} (Claude's response)`);
			console.log(`Total tokens: ${data.totalTokens || 0}`);
			console.log(
				`Estimated cost: $${this.getEstimatedCost(
					data.inputTokens || 0,
					data.tokensUsed || 0
				).toFixed(6)}`
			);

			// Breakdown explanation
			if (data.inputTokens && data.inputTokens > 500) {
				console.log('💡 Token breakdown estimate:');
				console.log(
					'  - LIFX tool schema: ~670 tokens (enables full API access)'
				);
				if (useSystemPrompt) {
					console.log(
						'  - System prompt: ~2100 tokens (keeps Claude focused on lighting)'
					);
					console.log(
						'  - Your message: ~' +
							Math.max(data.inputTokens - 2770, 10) +
							' tokens'
					);
				} else {
					console.log(
						'  - System prompt: 0 tokens (DISABLED - saves ~2100 tokens)'
					);
					console.log(
						'  - Your message: ~' +
							Math.max(data.inputTokens - 670, 10) +
							' tokens'
					);
					console.log(
						'  - Other overhead: ~' +
							(data.inputTokens - Math.max(data.inputTokens - 670, 10) - 670) +
							' tokens (conversation formatting, etc.)'
					);
				}
			}
			console.log('=== END TOKEN BREAKDOWN ===');

			return {
				response: data.response,
				tokensUsed: data.tokensUsed || 0,
				inputTokens: data.inputTokens || 0,
				totalTokens: data.totalTokens || 0,
				filtered: false,
				model: data.model,
				toolResults: data.toolResults || [],
			};
		} catch (error) {
			console.error('Claude API Error:', error);
			throw error;
		}
	}

	// Define available light control tools for Claude
	getLightControlTools() {
		return [
			{
				name: 'control_lifx_lights',
				description:
					'Control LIFX smart lights - turn on/off, change colors, adjust brightness',
				input_schema: {
					type: 'object',
					properties: {
						action: {
							type: 'string',
							enum: ['power', 'color', 'brightness', 'effect'],
							description: 'Type of action to perform',
						},
						selector: {
							type: 'string',
							default: 'all',
							description:
								'Which lights to control (all, label:name, group:name, etc.)',
						},
						power: {
							type: 'string',
							enum: ['on', 'off'],
							description: 'Turn lights on or off',
						},
						color: {
							type: 'string',
							description: 'Color name (red, blue, green, etc.) or hex code',
						},
						brightness: {
							type: 'number',
							minimum: 0,
							maximum: 1,
							description: 'Brightness level (0.0 to 1.0)',
						},
						kelvin: {
							type: 'number',
							minimum: 2500,
							maximum: 9000,
							description: 'Color temperature in Kelvin for white lights',
						},
						duration: {
							type: 'number',
							default: 1,
							description: 'Transition duration in seconds',
						},
					},
					required: ['action'],
				},
			},
		];
	}

	// Execute light control tool
	async executeLightControlTool(toolName, params) {
		if (toolName !== 'control_lifx_lights') {
			return { error: 'Unknown tool' };
		}

		try {
			// Send command to MCP server via backend with automatic port discovery
			const response = await apiCall('/api/lifx-command', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				throw new Error(`Backend error: ${response.status}`);
			}

			const result = await response.json();
			return {
				success: true,
				message: result.message || 'Light control command executed',
				details: result.details,
			};
		} catch (error) {
			console.error('Error executing light control:', error);
			return {
				error: `Failed to control lights: ${error.message}`,
				success: false,
			};
		}
	}

	// Get estimated cost (rough calculation)
	getEstimatedCost(inputTokens, outputTokens) {
		// Claude 3 Haiku pricing (as of 2024): $0.25 per 1M input tokens, $1.25 per 1M output tokens
		const inputCost = (inputTokens / 1000000) * 0.25;
		const outputCost = (outputTokens / 1000000) * 1.25;
		return inputCost + outputCost;
	}
}

export default ClaudeApiService;
