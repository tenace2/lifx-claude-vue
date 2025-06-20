#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Server state
let mcpServerProcess = null;
let mcpServerLogs = [];
let mcpServerStatus = {
	running: false,
	connected: false,
	pid: null,
	startTime: null,
};

// Global map to track pending MCP requests
const pendingMcpRequests = new Map();

// Helper function to add log entry
function addLogEntry(level, message) {
	const timestamp = new Date().toISOString();
	const entry = { timestamp, level, message };
	mcpServerLogs.push(entry);

	// Keep only last 200 entries
	if (mcpServerLogs.length > 200) {
		mcpServerLogs = mcpServerLogs.slice(-200);
	}

	console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// Start MCP server
function startMcpServer(lifxToken) {
	if (mcpServerProcess) {
		addLogEntry('warn', 'MCP server is already running');
		return false;
	}

	try {
		addLogEntry('info', 'Starting LIFX MCP server...');

		// Path to the MCP server
		const serverPath = path.join(
			__dirname,
			'..',
			'lifx-mcp-server',
			'lifx-api-mcp-server.js'
		);

		// Set environment variables
		const env = {
			...process.env,
			CONFIG_API_TOKEN: lifxToken,
			CONFIG_LOG_LEVEL: 'verbose',
		};

		// Spawn the MCP server process
		mcpServerProcess = spawn('node', [serverPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
			env: env,
			cwd: path.join(__dirname, '..', 'lifx-mcp-server'),
		});

		mcpServerStatus.running = true;
		mcpServerStatus.pid = mcpServerProcess.pid;
		mcpServerStatus.startTime = new Date().toISOString();

		addLogEntry('info', `MCP server started with PID: ${mcpServerProcess.pid}`);

		// Handle server output
		mcpServerProcess.stdout.on('data', (data) => {
			const output = data.toString().trim();
			if (output) {
				// Parse LIFX MCP server logs
				const lines = output.split('\n');
				lines.forEach((line) => {
					if (line.includes('[LIFX MCP]')) {
						const cleanLine = line.replace('[LIFX MCP]', '').trim();
						addLogEntry('info', cleanLine);

						// Check for connection status
						if (cleanLine.includes('LIFX API MCP Server running')) {
							mcpServerStatus.connected = true;
							addLogEntry('success', 'MCP server connected and ready!');
						}
					} else if (line.trim()) {
						// Check if this is a JSON-RPC response
						if (
							line.startsWith('{') &&
							(line.includes('"jsonrpc"') || line.includes('"id"'))
						) {
							addLogEntry('info', `Received JSON-RPC response: ${line}`);
							handleMcpResponse(line);
						} else {
							addLogEntry('info', line.trim());
						}
					}
				});
			}
		});

		mcpServerProcess.stderr.on('data', (data) => {
			const output = data.toString().trim();
			if (output) {
				// Parse LIFX MCP server logs from stderr too
				const lines = output.split('\n');
				lines.forEach((line) => {
					if (line.includes('[LIFX MCP]')) {
						const cleanLine = line.replace('[LIFX MCP]', '').trim();
						addLogEntry('info', cleanLine);

						// Check for connection status
						if (cleanLine.includes('LIFX API MCP Server running')) {
							mcpServerStatus.connected = true;
							addLogEntry('success', 'MCP server connected and ready!');
						}
					} else if (line.trim()) {
						addLogEntry('error', line.trim());
					}
				});
			}
		});

		// Handle server exit
		mcpServerProcess.on('close', (code) => {
			addLogEntry('info', `MCP server process exited with code ${code}`);
			mcpServerStatus.running = false;
			mcpServerStatus.connected = false;
			mcpServerStatus.pid = null;
			mcpServerStatus.startTime = null;
			mcpServerProcess = null;
		});

		mcpServerProcess.on('error', (error) => {
			addLogEntry('error', `MCP server error: ${error.message}`);
			mcpServerStatus.running = false;
			mcpServerStatus.connected = false;
			mcpServerStatus.pid = null;
			mcpServerStatus.startTime = null;
			mcpServerProcess = null;
		});

		return true;
	} catch (error) {
		addLogEntry('error', `Failed to start MCP server: ${error.message}`);
		mcpServerStatus.running = false;
		mcpServerStatus.connected = false;
		return false;
	}
}

// Stop MCP server
function stopMcpServer() {
	if (!mcpServerProcess) {
		addLogEntry('warn', 'No MCP server process to stop');
		return false;
	}

	addLogEntry('info', 'Stopping MCP server...');

	try {
		// Send SIGTERM to gracefully shutdown
		mcpServerProcess.kill('SIGTERM');

		// Force kill after 5 seconds if still running
		setTimeout(() => {
			if (mcpServerProcess && !mcpServerProcess.killed) {
				addLogEntry('warn', 'Force killing MCP server process...');
				mcpServerProcess.kill('SIGKILL');
			}
		}, 5000);

		return true;
	} catch (error) {
		addLogEntry('error', `Error stopping MCP server: ${error.message}`);
		return false;
	}
}

// API Routes
app.get('/api/status', (req, res) => {
	res.json({
		status: mcpServerStatus,
		logs: mcpServerLogs.slice(-50), // Return last 50 log entries
	});
});

app.post('/api/start', (req, res) => {
	const { lifxToken } = req.body;

	if (!lifxToken) {
		return res.status(400).json({ error: 'LIFX token is required' });
	}

	const success = startMcpServer(lifxToken);

	if (success) {
		res.json({
			message: 'MCP server start initiated',
			status: mcpServerStatus,
		});
	} else {
		res.status(500).json({ error: 'Failed to start MCP server' });
	}
});

app.post('/api/stop', (req, res) => {
	const success = stopMcpServer();

	if (success) {
		res.json({ message: 'MCP server stop initiated' });
	} else {
		res.status(500).json({ error: 'Failed to stop MCP server' });
	}
});

app.post('/api/restart', (req, res) => {
	const { lifxToken } = req.body;

	if (!lifxToken) {
		return res.status(400).json({ error: 'LIFX token is required' });
	}

	addLogEntry('info', 'Restarting MCP server...');

	stopMcpServer();

	// Wait for server to stop before restarting
	setTimeout(() => {
		startMcpServer(lifxToken);
	}, 2000);

	res.json({ message: 'MCP server restart initiated' });
});

// Clear server logs endpoint
app.post('/api/clear-logs', (req, res) => {
	try {
		mcpServerLogs.length = 0; // Clear the logs array
		addLogEntry('info', 'Server logs cleared by user');
		res.json({
			message: 'Server logs cleared successfully',
			logsCount: mcpServerLogs.length,
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to clear server logs' });
	}
});

app.get('/api/logs', (req, res) => {
	const limit = parseInt(req.query.limit) || 100;
	res.json({
		logs: mcpServerLogs.slice(-limit),
		total: mcpServerLogs.length,
	});
});

// Send command to MCP server
app.post('/api/mcp-command', (req, res) => {
	const { command } = req.body;

	if (!command) {
		return res.status(400).json({ error: 'Command is required' });
	}

	if (!mcpServerProcess || !mcpServerStatus.running) {
		return res.status(503).json({ error: 'MCP server is not running' });
	}

	try {
		addLogEntry('info', `Sending MCP command: ${command}`);

		// Parse the command to get tool name and arguments
		const parts = command.split(' ');
		const toolName = parts[0];
		const args = parseCommand(command);

		// Create a JSON-RPC request for the MCP server
		const request = {
			jsonrpc: '2.0',
			id: Date.now(),
			method: 'tools/call',
			params: {
				name: toolName,
				arguments: args,
			},
		};

		// Send the request to the MCP server
		mcpServerProcess.stdin.write(JSON.stringify(request) + '\n');

		// For now, return a simple response
		// In a real implementation, you'd want to capture the response from stdout
		res.json({
			message: 'Command sent to MCP server',
			command: command,
			result: 'Command executed (check server logs for details)',
		});
	} catch (error) {
		addLogEntry('error', `Error sending MCP command: ${error.message}`);
		res.status(500).json({ error: 'Failed to send command to MCP server' });
	}
});

// Helper function to parse simple commands into MCP tool arguments
function parseCommand(command) {
	// Simple parser for commands like "set-state selector:all color:blue power:on"
	const parts = command.split(' ');
	const toolName = parts[0];
	const args = {};

	// Parse key:value pairs
	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		if (part.includes(':')) {
			const [key, value] = part.split(':', 2);

			// Convert numeric values to numbers for specific parameters
			if (
				['duration', 'cycles', 'brightness', 'period', 'kelvin'].includes(key)
			) {
				const numValue = parseFloat(value);
				if (!isNaN(numValue)) {
					args[key] = numValue;
				} else {
					args[key] = value; // Keep as string if not a valid number
				}
			} else if (['fast', 'persist', 'power_on'].includes(key)) {
				// Convert boolean values
				args[key] = value.toLowerCase() === 'true';
			} else {
				args[key] = value;
			}
		}
	}

	return args;
}

// Structured LIFX command endpoint for Claude integration
app.post('/api/lifx-command', (req, res) => {
	const {
		action,
		selector = 'all',
		power,
		color,
		brightness,
		kelvin,
		duration = 1,
	} = req.body;

	if (!action) {
		return res.status(400).json({ error: 'Action is required' });
	}

	if (!mcpServerProcess || !mcpServerStatus.running) {
		return res.status(503).json({ error: 'MCP server is not running' });
	}

	try {
		let mcpCommand;
		let description;

		// Build MCP command based on action type
		switch (action) {
			case 'power':
				if (!power) {
					return res.status(400).json({
						error: 'Power state (on/off) is required for power action',
					});
				}
				mcpCommand = {
					jsonrpc: '2.0',
					id: Date.now(),
					method: 'tools/call',
					params: {
						name: 'set-state',
						arguments: {
							selector: selector,
							power: power,
							duration: duration,
						},
					},
				};
				description = `Turn ${selector} lights ${power}`;
				break;

			case 'color':
				if (!color) {
					return res
						.status(400)
						.json({ error: 'Color is required for color action' });
				}

				const colorArgs = {
					selector: selector,
					color: color,
					duration: duration,
				};

				// Add kelvin if specified for white colors
				if (kelvin) {
					colorArgs.kelvin = kelvin;
				}

				mcpCommand = {
					jsonrpc: '2.0',
					id: Date.now(),
					method: 'tools/call',
					params: {
						name: 'set-state',
						arguments: colorArgs,
					},
				};
				description = `Set ${selector} lights to ${color}${
					kelvin ? ` (${kelvin}K)` : ''
				}`;
				break;

			case 'brightness':
				if (brightness === undefined || brightness === null) {
					return res.status(400).json({
						error:
							'Brightness level (0.0-1.0) is required for brightness action',
					});
				}

				mcpCommand = {
					jsonrpc: '2.0',
					id: Date.now(),
					method: 'tools/call',
					params: {
						name: 'set-state',
						arguments: {
							selector: selector,
							brightness: brightness,
							duration: duration,
						},
					},
				};
				description = `Set ${selector} lights brightness to ${Math.round(
					brightness * 100
				)}%`;
				break;

			default:
				return res.status(400).json({ error: `Unsupported action: ${action}` });
		}

		addLogEntry('info', `Executing light command: ${description}`);

		// Send the command to the MCP server
		mcpServerProcess.stdin.write(JSON.stringify(mcpCommand) + '\n');

		res.json({
			success: true,
			message: description,
			details: {
				action: action,
				selector: selector,
				command: mcpCommand.params.arguments,
			},
		});
	} catch (error) {
		addLogEntry('error', `Error executing light command: ${error.message}`);
		res.status(500).json({ error: 'Failed to execute light command' });
	}
});

// Health check
app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		mcpServer: mcpServerStatus,
	});
});

// Graceful shutdown
process.on('SIGTERM', () => {
	addLogEntry('info', 'Received SIGTERM, shutting down gracefully...');
	if (mcpServerProcess) {
		stopMcpServer();
	}
	process.exit(0);
});

process.on('SIGINT', () => {
	addLogEntry('info', 'Received SIGINT, shutting down gracefully...');
	if (mcpServerProcess) {
		stopMcpServer();
	}
	process.exit(0);
});

// Start the server
app.listen(port, () => {
	addLogEntry('info', `MCP Server Manager listening on port ${port}`);
	addLogEntry('info', `Health check: http://localhost:${port}/health`);
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
	const {
		message,
		conversationHistory = [],
		apiKey,
		maxTokens = 500,
		useSystemPrompt: rawUseSystemPrompt = true,
	} = req.body;

	// Explicitly convert to boolean to handle string "false" case
	const useSystemPrompt =
		rawUseSystemPrompt === true ||
		rawUseSystemPrompt === 'true' ||
		rawUseSystemPrompt === '1';

	// More explicit conversion - only enable if explicitly true
	// const useSystemPrompt = !!(rawUseSystemPrompt === true || rawUseSystemPrompt === 'true');

	addLogEntry(
		'info',
		`RAW useSystemPrompt: ${rawUseSystemPrompt} (${typeof rawUseSystemPrompt})`
	);
	addLogEntry(
		'info',
		`PROCESSED useSystemPrompt: ${useSystemPrompt} (${typeof useSystemPrompt})`
	);
	addLogEntry(
		'info',
		`Boolean check: ${rawUseSystemPrompt} === true? ${
			rawUseSystemPrompt === true
		}`
	);
	addLogEntry(
		'info',
		`String check: ${rawUseSystemPrompt} === 'true'? ${
			rawUseSystemPrompt === 'true'
		}`
	);

	if (!message) {
		return res.status(400).json({ error: 'Message is required' });
	}

	if (!apiKey) {
		return res.status(400).json({ error: 'Claude API key is required' });
	}

	try {
		addLogEntry('info', `Claude API request: ${message.substring(0, 200)}...`);
		addLogEntry(
			'info',
			`Conversation context: ${JSON.stringify(conversationHistory.slice(-2))}`
		);
		addLogEntry(
			'info',
			`System prompt: ${useSystemPrompt ? 'enabled' : 'disabled'}`
		);

		const requestBody = {
			model: 'claude-3-haiku-20240307',
			max_tokens: maxTokens, // Use user-configured value
			messages: [
				...conversationHistory,
				{
					role: 'user',
					content: message,
				},
			],
			tools: [
				{
					name: 'control_lifx_lights',
					description:
						'Comprehensive LIFX light control with full API access - basic controls, effects, scenes, and advanced features',
					input_schema: {
						type: 'object',
						properties: {
							tool: {
								type: 'string',
								enum: [
									'set-state',
									'list-lights',
									'toggle-power',
									'state-delta',
									'breathe-effect',
									'pulse-effect',
									'move-effect',
									'morph-effect',
									'flame-effect',
									'clouds-effect',
									'sunrise-effect',
									'sunset-effect',
									'effects-off',
									'list-scenes',
									'activate-scene',
									'cycle',
									'validate-color',
									'clean',
								],
								description: 'Which LIFX tool to use',
							},
							selector: {
								type: 'string',
								default: 'all',
								description:
									'Light selector (all, id:xxx, label:name, group:name, etc.)',
							},
							// Basic state control parameters
							power: {
								type: 'string',
								enum: ['on', 'off'],
								description: 'Power state for set-state or toggle-power',
							},
							color: {
								type: 'string',
								description:
									'Color (red, blue, #ff0000, hue:120, kelvin:3500, etc.)',
							},
							brightness: {
								type: 'number',
								minimum: 0,
								maximum: 1,
								description: 'Brightness level (0.0 to 1.0)',
							},
							duration: {
								type: 'number',
								minimum: 0,
								description: 'Transition/effect duration in seconds',
							},
							fast: {
								type: 'boolean',
								description: 'Execute fast (skip state validation)',
							},
							// Effect-specific parameters
							from_color: {
								type: 'string',
								description: 'Starting color for breathe/pulse effects',
							},
							period: {
								type: 'number',
								description: 'Time in seconds for one effect cycle',
							},
							cycles: {
								type: 'number',
								description: 'Number of effect cycles (omit for infinite)',
							},
							persist: {
								type: 'boolean',
								description: 'Keep final color when effect ends',
							},
							power_on: {
								type: 'boolean',
								default: true,
								description: 'Turn lights on if currently off',
							},
							// Move effect
							direction: {
								type: 'string',
								enum: ['forward', 'backward'],
								description: 'Direction for move effect or cycle',
							},
							// Morph effect
							palette: {
								type: 'array',
								items: { type: 'string' },
								description: 'Array of colors for morph effect',
							},
							// Scene control
							scene_uuid: {
								type: 'string',
								description: 'UUID of scene to activate',
							},
							// Cycle control
							states: {
								type: 'array',
								description: 'Array of state objects for cycling',
							},
							// State delta parameters
							hue: {
								type: 'number',
								minimum: -360,
								maximum: 360,
								description: 'Hue adjustment in degrees',
							},
							saturation: {
								type: 'number',
								minimum: -1,
								maximum: 1,
								description: 'Saturation adjustment',
							},
							kelvin: {
								type: 'number',
								description: 'Kelvin adjustment',
							},
							infrared: {
								type: 'number',
								minimum: 0,
								maximum: 1,
								description: 'Infrared brightness',
							},
							// Clean parameters
							stop: {
								type: 'boolean',
								description: 'Stop cleaning cycle',
							},
							// Color validation
							string: {
								type: 'string',
								description: 'Color string to validate',
							},
							// Sunrise/sunset specific
							soft_off: {
								type: 'boolean',
								description: 'Soft power off after sunset',
							},
							min_saturation: {
								type: 'number',
								minimum: 0,
								maximum: 1,
								description: 'Minimum saturation for clouds effect',
							},
							power_off: {
								type: 'boolean',
								description: 'Also power off lights when turning effects off',
							},
						},
						required: ['tool'],
					},
				},
			],
		};

		// Add system prompt only if enabled
		addLogEntry('info', `=== SYSTEM PROMPT DEBUG ===`);
		addLogEntry('info', `useSystemPrompt value: ${useSystemPrompt}`);
		addLogEntry('info', `useSystemPrompt type: ${typeof useSystemPrompt}`);
		addLogEntry('info', `useSystemPrompt truthiness: ${!!useSystemPrompt}`);
		addLogEntry('info', `About to check if condition...`);

		if (useSystemPrompt) {
			addLogEntry('info', `ADDING system prompt to requestBody`);
			requestBody.system = `You are a comprehensive LIFX smart lighting assistant with access to the full LIFX API. You can control lights, create effects, manage scenes, and perform advanced lighting operations.

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
		} else {
			addLogEntry('info', `NOT adding system prompt to requestBody`);
		}
		addLogEntry('info', `=== END SYSTEM PROMPT DEBUG ===`);

		// Make request to Claude API
		const toolSchemaSize = JSON.stringify(requestBody.tools).length;
		const systemPromptSize = requestBody.system ? requestBody.system.length : 0;
		const messageSize = JSON.stringify(requestBody.messages).length;

		addLogEntry('info', `=== TOKEN BREAKDOWN ===`);
		addLogEntry(
			'info',
			`Tool schema size: ~${Math.round(
				toolSchemaSize / 4
			)} tokens (${toolSchemaSize} chars)`
		);
		addLogEntry(
			'info',
			`System prompt size: ~${Math.round(
				systemPromptSize / 4
			)} tokens (${systemPromptSize} chars)`
		);
		addLogEntry(
			'info',
			`Messages size: ~${Math.round(
				messageSize / 4
			)} tokens (${messageSize} chars)`
		);
		addLogEntry(
			'info',
			`Estimated total input tokens: ~${Math.round(
				(toolSchemaSize + systemPromptSize + messageSize) / 4
			)}`
		);
		addLogEntry('info', `=== END TOKEN BREAKDOWN ===`);

		addLogEntry(
			'info',
			`REQUEST BODY DEBUG: ${JSON.stringify({
				hasSystem: !!requestBody.system,
				systemLength: requestBody.system ? requestBody.system.length : 0,
				messageCount: requestBody.messages.length,
				useSystemPrompt: useSystemPrompt,
			})}`
		);

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			addLogEntry(
				'error',
				`Claude API error: ${response.status} - ${
					errorData.error?.message || 'Unknown error'
				}`
			);
			return res.status(response.status).json({
				error: `Claude API error: ${
					errorData.error?.message || 'Unknown error'
				}`,
			});
		}

		const data = await response.json();
		addLogEntry(
			'info',
			`Claude API response received, tokens: ${data.usage?.output_tokens || 0}`
		);
		addLogEntry(
			'info',
			`Claude full response: ${JSON.stringify(data.content)}`
		);

		// Check if Claude wants to use tools
		const toolUse = data.content?.find(
			(content) => content.type === 'tool_use'
		);
		let toolResults = [];

		if (toolUse && toolUse.name === 'control_lifx_lights') {
			addLogEntry(
				'info',
				`Claude wants to control lights: ${JSON.stringify(toolUse.input)}`
			);

			// Execute the light control via MCP server
			try {
				const { tool, ...params } = toolUse.input;

				// Process parameters to fix types (similar to parseCommand)
				const processedParams = processClaudeParameters(params);

				addLogEntry('info', `About to execute MCP command: ${tool}`);

				// Execute MCP command and wait for response
				const mcpResponse = await executeMcpCommand(tool, processedParams);

				addLogEntry(
					'info',
					`MCP command response received: ${JSON.stringify(mcpResponse)}`
				);

				if (mcpResponse.success) {
					toolResults.push({
						tool_use_id: toolUse.id,
						success: true,
						message:
							mcpResponse.message || `Executed ${tool} command successfully`,
						details: { tool, params },
						lifxData: mcpResponse.content || mcpResponse.data, // Include actual response data
					});
					addLogEntry(
						'info',
						`MCP command executed: ${tool} - ${mcpResponse.message}`
					);
				} else {
					toolResults.push({
						tool_use_id: toolUse.id,
						success: false,
						error: mcpResponse.error || 'MCP command failed',
					});
					addLogEntry(
						'error',
						`MCP command failed: ${tool} - ${mcpResponse.error}`
					);
				}
			} catch (error) {
				toolResults.push({
					tool_use_id: toolUse.id,
					success: false,
					error: error.message,
				});
				addLogEntry('error', `MCP command error: ${error.message}`);
			}
		}

		const responseData = {
			response:
				data.content?.find((content) => content.type === 'text')?.text ||
				(toolResults.length > 0 && toolResults[0].success
					? `✅ ${
							toolResults[0].message || 'Light control executed successfully'
					  }`
					: 'Command processed'),
			tokensUsed: data.usage?.output_tokens || 0,
			inputTokens: data.usage?.input_tokens || 0,
			totalTokens:
				(data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
			toolResults: toolResults,
			model: requestBody.model,
		};

		addLogEntry('info', `=== RESPONSE DEBUG ===`);
		addLogEntry('info', `Claude usage data: ${JSON.stringify(data.usage)}`);
		addLogEntry(
			'info',
			`Response data being sent: ${JSON.stringify(responseData)}`
		);
		addLogEntry('info', `=== END RESPONSE DEBUG ===`);

		res.json(responseData);
	} catch (error) {
		addLogEntry('error', `Claude API proxy error: ${error.message}`);
		res
			.status(500)
			.json({ error: `Failed to process Claude request: ${error.message}` });
	}
});

// Helper function to process Claude tool parameters and fix types
function processClaudeParameters(params) {
	const processed = {};

	for (const [key, value] of Object.entries(params)) {
		// Handle cycles parameter - remove if set to "infinite"
		if (key === 'cycles' && value === 'infinite') {
			// Skip adding this parameter - omit it for infinite cycles
			continue;
		}

		// Convert numeric values to numbers for specific parameters
		if (
			['duration', 'cycles', 'brightness', 'period', 'kelvin'].includes(key)
		) {
			const numValue = typeof value === 'string' ? parseFloat(value) : value;
			if (!isNaN(numValue)) {
				processed[key] = numValue;
			} else {
				processed[key] = value; // Keep as-is if not a valid number
			}
		} else if (['fast', 'persist'].includes(key)) {
			// Convert boolean values to strings as MCP server expects 'true'/'false' strings
			if (typeof value === 'boolean') {
				processed[key] = value.toString();
			} else if (typeof value === 'string') {
				processed[key] = value.toLowerCase() === 'true' ? 'true' : 'false';
			} else {
				processed[key] = 'false';
			}
		} else if (key === 'power_on') {
			// MCP server expects power_on as string 'true'/'false', not boolean
			if (typeof value === 'boolean') {
				processed[key] = value.toString();
			} else if (typeof value === 'string') {
				processed[key] = value.toLowerCase() === 'true' ? 'true' : 'false';
			} else {
				processed[key] = 'true'; // default
			}
		} else {
			processed[key] = value;
		}
	}

	// Add default selector if missing
	if (!processed.selector) {
		processed.selector = 'all';
	}

	return processed;
}

// Get recent LIFX-related logs for display
app.get('/api/lifx-info', (req, res) => {
	try {
		// Filter logs for LIFX device information
		const lifxLogs = mcpServerLogs
			.filter((log) => {
				const msg = log.message.toLowerCase();
				return (
					msg.includes('lights found') ||
					msg.includes('operation results') ||
					msg.includes('id:') ||
					msg.includes('color') ||
					msg.includes('brightness') ||
					msg.includes('power:') ||
					msg.includes('kelvin') ||
					msg.includes('hue') ||
					msg.includes('saturation') ||
					(log.message.startsWith('{') && log.message.includes('result'))
				);
			})
			.slice(-10) // Last 10 relevant entries
			.map((log) => `[${log.timestamp}] ${log.message}`)
			.join('\n');

		res.json({
			lifxInfo: lifxLogs,
		});
	} catch (error) {
		console.error('Error getting LIFX info:', error);
		res.status(500).json({ error: 'Failed to get LIFX information' });
	}
});

// Function to execute MCP command and wait for response
async function executeMcpCommand(tool, processedParams) {
	return new Promise((resolve, reject) => {
		if (!mcpServerProcess) {
			reject(new Error('MCP server not running'));
			return;
		}

		const requestId = Date.now(); // Use timestamp as unique ID (integer only)

		const mcpCommand = {
			jsonrpc: '2.0',
			id: requestId,
			method: 'tools/call',
			params: {
				name: tool,
				arguments: processedParams,
			},
		};

		// Store the resolve/reject functions for this request
		pendingMcpRequests.set(requestId, { resolve, reject, tool });

		// Set timeout for the request (10 seconds)
		const timeoutId = setTimeout(() => {
			pendingMcpRequests.delete(requestId);
			reject(new Error(`MCP command timeout: ${tool}`));
		}, 10000);

		// Store timeout ID so we can cancel it when response comes
		pendingMcpRequests.get(requestId).timeoutId = timeoutId;

		addLogEntry(
			'info',
			`Sending MCP command: ${tool} ${JSON.stringify(
				processedParams
			)} with ID: ${requestId}`
		);

		// Send the command to the MCP server
		try {
			mcpServerProcess.stdin.write(JSON.stringify(mcpCommand) + '\n');
		} catch (error) {
			clearTimeout(timeoutId);
			pendingMcpRequests.delete(requestId);
			reject(error);
		}
	});
}

// Function to handle MCP server response
function handleMcpResponse(response) {
	addLogEntry('info', `handleMcpResponse called with: ${response}`);
	try {
		const data = JSON.parse(response);
		addLogEntry('info', `Parsed response data: ${JSON.stringify(data)}`);
		addLogEntry(
			'info',
			`Pending requests: ${JSON.stringify(
				Array.from(pendingMcpRequests.keys())
			)}`
		);

		if (data.id && pendingMcpRequests.has(data.id)) {
			addLogEntry('info', `Found pending request for ID: ${data.id}`);
			const { resolve, reject, tool, timeoutId } = pendingMcpRequests.get(
				data.id
			);

			// Clear timeout and remove from pending requests
			clearTimeout(timeoutId);
			pendingMcpRequests.delete(data.id);

			if (data.error) {
				addLogEntry(
					'error',
					`MCP server error for ${tool}: ${JSON.stringify(data.error)}`
				);
				resolve({
					success: false,
					error: data.error.message || 'MCP server error',
					tool,
				});
			} else if (data.result) {
				// Process the result based on tool type
				let message = `${tool} executed successfully`;
				let content = '';

				if (data.result.content) {
					if (Array.isArray(data.result.content)) {
						content = data.result.content
							.map((item) => item.text || JSON.stringify(item))
							.join('\n');
					} else {
						content =
							data.result.content.text || JSON.stringify(data.result.content);
					}
				}

				// For list-lights and similar info commands, include the data
				if (
					tool === 'list-lights' ||
					tool === 'get-light' ||
					tool.includes('list') ||
					tool.includes('get')
				) {
					message = `${tool} completed`;
				}

				addLogEntry(
					'info',
					`MCP response for ${tool}: ${content.substring(0, 100)}...`
				);

				resolve({
					success: true,
					message,
					content,
					data: data.result,
					tool,
				});
			} else {
				resolve({
					success: true,
					message: `${tool} executed (no result data)`,
					tool,
				});
			}
		} else {
			addLogEntry('info', `No pending request found for ID: ${data.id}`);
		}
	} catch (error) {
		addLogEntry('error', `Failed to parse MCP response: ${error.message}`);
	}
}
