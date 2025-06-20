# LIFX Claude Demo (Vue.js + MCP Integration)

❤️ Hello kind people of the internet.

You will need to spend some money to do this project (about $20 to $30 bucks).

First:
Get a Lifx smart light bulb. I used the A19.
https://www.amazon.com/Tapo-Equivalent-Matter-Certified-L535E-2-Pack/dp/B0CFG9SHPQ?ref_=ast_slp_dp&th=1&psc=1

    You can also buy these at HomeDepot, or ACE Hardware ($12 bucks!) etc,
    ...these light also work with Alexa, Siri, etc.

    Suggest install the Lifx phone app and connect the lightbulb to your wifi (you'll give the light a name, which you can then see and use in your prompts). Then you can get started knowing the lightbulb is wired up.

    And of course get your Lifx API key: these are FREE!

Second:
Sign up for the Claude API key
...and yes: they will want a credit card to use the API key.

    But they have a special $5 dollar Token Burger! And once you eat up the tokens, your happy meal is done.

    But note: I input hunderds of Claude chats, and consumed thousands of tokens playing around with this app and still used less than 10 Cents worth of my token burger budget.

    And yes: there are built in Guard Rails in this app to help make sure Claude doesn't do something insane to you, or your lightbulb (see notes below).

The inspiration for this app was from Burke Holland (Stellar stuff! This guy rocks!)
Highly suggest watching this video:
https://www.youtube.com/watch?v=yUaz89m1M5w&t=100s

Just a Note on API keys.
This demo app stores the API keys (for Lifx and Claude) in password fields.
Thus, the keys are only good for your browser session.

    Keep track of your keys maybe in Notepad, etc so you can copy --> paste them.

## 🎯 Demo App

This is a demonstration application that showcases:
**Model Context Protocol (MCP)**
integration with:
**LIFX smart lights**,
and with:
**Claude AI**,
and with a modern:
**Vue.js frontend**.

This project demonstrates how to build a bridge between AI assistants and IoT devices using the MCP standard using Vue.js.

![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat&logo=vue.js&logoColor=white)
![Quasar](https://img.shields.io/badge/Quasar-16B7FB?style=flat&logo=quasar&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-FF6B35?style=flat&logo=anthropic&logoColor=white)
![LIFX](https://img.shields.io/badge/LIFX_Smart_Lights-000000?style=flat&logoColor=white)

## 🎯 What This Project Does

This application creates a **smart lighting control system** that works in three ways:

1. **Web Interface**: Modern Vue.js frontend for direct light control
2. **Claude AI Chat**: Natural language commands ("turn lights blue", "dim to 30%")
3. **MCP Integration**: Follows the Model Context Protocol standard for AI-device communication

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP     ┌──────────────────────┐    JSON-RPC     ┌─────────────────────┐    LIFX API    ┌─────────────────┐
│   Vue Frontend  │ ◄────────►  │ Backend Manager      │ ◄─────────────► │ LIFX MCP Server     │ ◄────────────► │ LIFX Smart      │
│  (Port 9003)    │             │ mcp-server-manager   │                 │ lifx-api-mcp-server │                │ Lights          │
│                 │             │ (Port 3001)          │                 │ (Child Process)     │                │                 │
└─────────────────┘             └──────────────────────┘                 └─────────────────────┘                └─────────────────┘
                                          │
                                          │ HTTP
                                          ▼
                                ┌─────────────────────┐
                                │   Claude AI API     │
                                │  (api.anthropic.com) │
                                └─────────────────────┘
```

### Component Breakdown:

- **Vue Frontend**: Modern web interface built with Vue.js + Quasar UI framework
- **Backend Manager**: Node.js server that acts as a protocol bridge (HTTP ↔ JSON-RPC)
- **LIFX MCP Server**: Implements the Model Context Protocol for LIFX device communication
- **Claude Integration**: AI assistant with natural language light control capabilities

#### Backend Server: mcp-server-manager.js

You will need to have this server working before launching the app.
To start the server (from project root):
cd server && node mcp-server-manager.js

Killing the backend server has interesting effects you can learn from,
Recommnd trying it out...To kill the server:
pkill -f "node.\*mcp-server-manager.js"

🚫 Some notes on why Vue Frontend Can't Talk Directly to MCP Server

1. JSON-RPC Protocol Mismatch
   The LIFX MCP Server uses JSON-RPC over stdio (standard input/output streams), not HTTP:
   // This is how the MCP server communicates:
   process.stdin // Receives JSON-RPC requests
   process.stdout // Sends JSON-RPC responses

Web browsers (and Vue.js) cannot directly communicate with stdio streams of external processes.
Browsers can only make HTTP requests, WebSocket connections, or similar web protocols.

2.  Process Management Limitation
    The LIFX MCP Server is a Node.js child process that needs to be:

        Spawned with specific environment variables (LIFX_TOKEN)
        Monitored for crashes/exits
        Restarted when needed
        Killed when stopping
        Browsers cannot spawn, manage, or directly communicate with OS processes for security reasons.

3.  Protocol Translation Required
    The communication happens like this:

        // Vue Frontend (HTTP/REST)
        fetch('/api/lifx/lights') // HTTP request

        // ↓ Manager translates to JSON-RPC ↓

        // LIFX MCP Server (JSON-RPC over stdio)
        {
          "jsonrpc": "2.0",
          "id": 1,
          "method": "tools/call",
          "params": {
            "name": "list_lights"
          }
        }

#### Lifx MCP Server - lifx-api-mcp-server.js

This is really just a just a JSON wrapper around the Lifx REST based API's.
But it's also a bunch more. It allows a LLM's (large language model) to have a common interface.
An MCP server has:

- Tools, in this case the endpoint apis at Lifx.
- and resources and protocols.

Supposedly the Lifx MCP server has the following capabilities and features (but to be perfectly honest, I haven't been able to really make all of this behave all that well):

🚀 LIFX MCP Server - Complete Capabilities

📊 Summary
3 Resources - Data access endpoints
3 Prompts - AI assistant templates
19 Tools - Action/control endpoints

🔧 MCP TOOLS (19 Total)
🏠 Basic Light Control
list-lights - Get all lights with filtering
set-state - Set power, color, brightness (main tool you're using)
set-states - Set multiple lights at once (batch operations)
state-delta - Relative changes (brighten by 20%, etc.)
toggle-power - Smart toggle (on if all off, off if any on)

✨ Visual Effects
breathe-effect - Slow fade in/out breathing
pulse-effect - Quick flash/strobe effect
move-effect - Moving patterns (LIFX Z strips)
morph-effect - Color morphing (LIFX Tiles)
flame-effect - Flame simulation (LIFX Tiles)
clouds-effect - Cloud patterns (LIFX Tiles)
sunrise-effect - Sunrise simulation (LIFX Tiles)
sunset-effect - Sunset simulation (LIFX Tiles)
effects-off - Stop all running effects

🎬 Scene & Advanced Control
list-scenes - Get saved scenes
activate-scene - Apply a saved scene
cycle - Cycle through color states
validate-color - Test color strings
clean - Control LIFX Clean devices

📚 MCP RESOURCES (3 Total)
lifx://lights - Live list of all lights and status
lifx://light/{selector}/state - Detailed state of specific lights
lifx://scenes - Available scenes list

🤖 MCP PROMPTS (3 Total)
effect-creator - AI-guided effect creation wizard
troubleshooter - Diagnose unresponsive lights
selector-helper - Help build correct selectors

🎯 What You're Currently Using
Your Claude integration is primarily using:

set-state tool - For basic color/power changes
LIFX HTTP API - Direct REST calls to control lights
Selectors - "all" for all lights, but supports:
label:"Kitchen Light"
group:"Living Room"
id:d073d58529b9
location:"Home"

🚀 Advanced Features You Could Add
Try these Claude commands:

"Start a slow blue breathing effect"
"Make the lights pulse red"
"Activate my morning scene"
"Turn off all effects"
"Show me troubleshooting for my lights"
The MCP server has much more capability than you're currently using - it's a full-featured LIFX control system with effects, scenes, and advanced selectors! 🎉

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **LIFX Smart Lights** on your network
- **LIFX API Token** ([Get one here](https://cloud.lifx.com/settings))
- **Claude API Key** ([Get one here](https://console.anthropic.com/)) _optional for web-only use_

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd LifxClaudeVue
   ```

2. **Install dependencies**

   ```bash
   # Install main project dependencies
   npm install

   # Install server dependencies
   cd server
   npm install
   cd ..

   # Install LIFX MCP server dependencies
   cd lifx-mcp-server
   npm install
   cd ..
   ```

3. **Start the backend server**

   ```bash
   cd server && node mcp-server-manager.js
   ```

   You should see:

   ```
   [INFO] MCP Server Manager listening on port 3001
   [INFO] Health check: http://localhost:3001/health
   ```

4. **Start the frontend** (in a new terminal)

   ```bash
   npm run dev
   # or
   quasar dev
   ```

   The app will open at `http://localhost:9003`

5. **Configure your LIFX token**
   - Open the web interface
   - Click "Configure Token"
   - Enter your LIFX API token
   - Click "Start MCP Server" to begin controlling lights

## 🎮 How to Use

### Web Interface

- **Set Token**: Configure your LIFX API token
- **Server Control**: Start/stop/restart the MCP server process
- **Server Logs**: Monitor real-time activity from both servers
- **Status Indicators**: Visual feedback on connection status

### Claude AI Chat

1. Get a Claude API key from [Anthropic Console](https://console.anthropic.com/)
2. Enter your API key in the Claude AI Assistant chat section
3. Use natural language commands:
   - "Turn all lights on"
   - "Set bedroom lights to blue"
   - "Dim the lights to 50%"
   - "Turn off the living room lights"

#### Claude AI Assistant notes:

Submittig a chat via the API key to Claude is not exactly the same as what you might be familiar with when using an AI chat bot.

    - No Memory
    Each API is request is separate from the previous: there is no memory of anything previous!

    - System Prompt Guardrail
    This demo app has some rudemenatary built in Guardrails using a System Prompt (pre-prompt), which you can turn off/on. Yes, a pre-prompt is submitted each time (no memory!) and consumes tokens, but not that many. You can play around with turning it on and off. And of course this prompt could almost no-doubt be defeated with a clever jail-break.

    - PreFiltering
    This demo app has yet more built in Guardrails using key-word Pre-filtering. This will help prevent chats from being submitted to Claude that do not have something to do with a Lifx light bulb, thus needlessly consuming Claude API tokens. Key words in include: light lamp, color, on, off, etc. (look in claudeAPI.js). However, things like "make me bacon and eggs" has a key-word "on" in the middle of "bacon", and even that can potentially trip up a filter (word boundary issues). This technology is still brittle...but that's the point of a demo app isn't it!

## 🛠️ Development

### Project Structure

```
LifxClaudeVue/
├── src/                          # Vue.js frontend source
│   ├── components/
│   │   ├── TokenManager.vue      # LIFX token and server management
│   │   └── ClaudeChat.vue        # AI chat interface
│   ├── composables/
│   │   └── useBackendStatus.js   # Shared backend status monitoring
│   └── services/
│       └── claudeApi.js          # Claude AI integration service
├── server/
│   ├── mcp-server-manager.js     # Backend server (HTTP API + MCP bridge)
│   └── package.json              # Server dependencies
├── lifx-mcp-server/              # LIFX MCP Server (submodule/external)
│   └── lifx-api-mcp-server.js    # Actual LIFX device communication
└── public/                       # Static assets
```

### Key Technologies

- **Frontend**: Vue 3, Quasar Framework, Composition API
- **Backend**: Node.js, Express.js, Child Process Management
- **Protocol**: Model Context Protocol (MCP), JSON-RPC, HTTP REST
- **AI Integration**: Claude API (Anthropic)
- **IoT**: LIFX HTTP API

### Development Commands

```bash
# Start development mode (hot-reload)
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Start backend server
cd server && node mcp-server-manager.js
```

## 🔧 Configuration

### Environment Variables

The backend server supports these environment variables:

```bash
# LIFX Configuration (can also be set via web interface)
CONFIG_API_TOKEN=your_lifx_token_here
CONFIG_LOG_LEVEL=verbose

# Server Configuration
PORT=3001
```

### Custom Settings

- **Max Tokens**: Adjustable Claude response length (cost control)
- **System Prompt**: Enable/disable AI assistant context (transparency)
- **Log Levels**: Configurable verbosity for debugging

## 📚 Model Context Protocol (MCP)

This project demonstrates the **Model Context Protocol**, a standardized way for AI assistants to interact with external tools and services.

### Key MCP Concepts:

- **Tools**: Capabilities exposed to AI (e.g., "control_lifx_lights")
- **JSON-RPC**: Communication protocol between components
- **Stdio Transport**: Standard input/output for process communication
- **Resource Management**: Lifecycle management of external services

### Learn More:

- **MCP Documentation**: [https://mcp.so/server/lifx-api-mcp-server/furey?tab=content](https://mcp.so/server/lifx-api-mcp-server/furey?tab=content)
- **LIFX MCP Server**: [https://github.com/furey/lifx-api-mcp-server](https://github.com/furey/lifx-api-mcp-server)
- **MCP Specification**: [https://spec.modelcontextprotocol.io/](https://spec.modelcontextprotocol.io/)

## 🐛 Troubleshooting

### Common Issues

**Backend server shows red indicator:**

```bash
# Make sure the backend is running
cd server && node mcp-server-manager.js
```

**"No token configured" message:**

- Get your LIFX API token from [https://cloud.lifx.com/settings](https://cloud.lifx.com/settings)
- Enter it in the web interface under "Token Management"

**Claude chat not working:**

- Verify your Claude API key is valid
- Check the browser console for error messages
- Ensure you have sufficient API credits

**LIFX lights not responding:**

- Verify lights are on the same network
- Test your LIFX token with the [LIFX API](https://api.developer.lifx.com/docs/introduction)
- Check server logs for connection errors

### Debug Mode

Enable verbose logging:

```bash
CONFIG_LOG_LEVEL=verbose node mcp-server-manager.js
```

## 🤝 Contributing

This is a demonstration project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational and demonstration purposes. Please check individual component licenses:

- Vue.js and Quasar: MIT License
- LIFX MCP Server: See [original repository](https://github.com/furey/lifx-api-mcp-server)

## 🙏 Acknowledgments

- **[Furey](https://github.com/furey/)** for the excellent LIFX MCP Server implementation
- **[Anthropic](https://www.anthropic.com/)** for Claude AI and MCP specification
- **[LIFX](https://www.lifx.com/)** for their comprehensive API
- **[Vue.js](https://vuejs.org/)** and **[Quasar](https://quasar.dev/)** communities
- [BurkeHolland](https://www.youtube.com/@BurkeHolland) for his videos

---

**Built with ❤️ as a learning project to explore MCP, AI integration, and modern web development.**
