# LIFX MCP Demo - Copilot Instructions v1.0
*Created: December 2024 | Last Updated: [Date when updated]*

## 🎯 Project Vision
Create a modern Vue 3 + Quasar SPA that demonstrates Claude AI integration with LIFX MCP server for smart lighting control. This is a learning/demo project intended for GitHub sharing and Reddit community education, showcasing how to properly implement MCP (Model Context Protocol) with Claude API for real-world smart home automation.

## 🏗️ Architecture Overview
**Claude-Native MCP Approach (Approach 2):**
- LIFX MCP Server runs locally as separate process
- Vue 3 web app communicates with Claude API
- Claude API communicates directly with MCP server
- User sends natural language → Claude interprets → Claude calls MCP tools → Results displayed

**Flow:** User Input → Vue App → Claude API → MCP Server → LIFX Lights → Response Chain Back

## 🛠️ Core Technology Stack
- **Frontend:** Vue 3 (Composition API preferred)
- **UI Framework:** Quasar Framework (modern, responsive design)
- **Development:** VS Code on MacBook M2
- **Version Control:** Git + GitHub
- **MCP Server:** LIFX API MCP Server (https://mcp.so/server/lifx-api-mcp-server/furey)
- **AI Integration:** Claude API (Anthropic)
- **Communication:** WebSocket for real-time updates, HTTP for API calls

## 🔧 Core Features (The Big 5 Ideas)

### 1. LIFX Token Management
- Password field for LIFX API token storage
- Session-only storage (no persistence)
- Modal UI for token entry with clear instructions
- Link to LIFX Cloud Settings for token generation
- Token status indicator in UI

### 2. MCP Server Status & Output
- Real-time server status monitoring
- Live server output/logs display
- Server control buttons (Start/Stop/Restart)
- Connection status indicators
- Educational value: show what's happening behind the scenes

### 3. Claude API Token Management
- Password field for Claude API token (same pattern as LIFX)
- Session-only storage
- Clear instructions for obtaining Claude API access
- Token validation and status display

### 4. Smart Request Filtering
- System prompt engineering to restrict Claude to lightbulb-only requests
- Pre-filtering of user input for lightbulb-related queries
- Graceful rejection of off-topic requests
- Cost control through scope limitation
- Example system prompt: "You are a smart lightbulb assistant. Only respond to requests that relate to controlling LIFX lights..."

### 5. Token Usage Counter
- Display estimated token consumption per request
- Running total of tokens used in session
- Cost estimation (if feasible via Claude API)
- Educational component showing AI resource management
- Real-time usage feedback

## 🎨 Design Principles
- **Modern & Clean:** Contemporary web design with Quasar components
- **Educational Focus:** Clear indication of what's happening at each step
- **Responsive:** Works well on desktop and mobile
- **Accessible:** Proper contrast, semantic markup
- **Intuitive:** Self-explanatory interface for non-technical users

## 💾 Development Environment
- **OS:** MacOS (M2 MacBook)
- **IDE:** VS Code with relevant extensions
- **Package Manager:** npm or yarn
- **Hardware:** LIFX A19 lightbulb for testing
- **Git Workflow:** Feature branches, clear commit messages

## 🚀 Project Structure (Suggested)
```
lifx-mcp-demo/
├── src/
│   ├── components/
│   │   ├── TokenManager.vue
│   │   ├── ServerStatus.vue
│   │   ├── LightControls.vue
│   │   └── TokenCounter.vue
│   ├── services/
│   │   ├── claudeApi.js
│   │   ├── mcpServer.js
│   │   └── tokenManager.js
│   ├── composables/
│   │   ├── useTokens.js
│   │   └── useServerStatus.js
│   └── App.vue
├── public/
├── copilot-instructions.md
└── README.md
```

## 🎯 Primary Learning Goals
1. **MCP Integration:** Understand how Claude + MCP servers work together
2. **Token Management:** Secure, session-based API key handling
3. **Real-time Updates:** WebSocket integration for live server status
4. **AI Cost Control:** Responsible AI usage with scope limitations
5. **Vue 3 + Quasar:** Modern frontend development patterns

## 📝 Development Notes
- Start with basic token management and server connection
- Build UI components incrementally
- Test with actual LIFX hardware throughout development
- Document learning process for community sharing
- Keep server output logs visible for educational value

## 🔄 Change Log
*[Update this section when making significant changes]*

### v1.0 - Initial Setup
- Established project vision and architecture
- Defined core features (Big 5 Ideas)
- Set technology stack and development environment

## 🚨 Important Reminders
- **Security:** Tokens are session-only, never persist to localStorage
- **Cost Control:** Implement request filtering to prevent excessive Claude API usage
- **Documentation:** Keep README updated for GitHub community
- **Testing:** Always test with real LIFX hardware
- **Learning Focus:** This is a demo/educational project, not production software

## 🤝 Community Sharing Goals
- **GitHub:** Complete working example with clear setup instructions
- **Reddit:** Educational post showing MCP + Claude integration
- **Documentation:** Bridge the gap between "here's an MCP server" and "here's how to use it"
- **Learning Resource:** Help others avoid the setup confusion I experienced

---
*This file should be updated as the project evolves. Always keep it current with your latest understanding and implementation decisions.*