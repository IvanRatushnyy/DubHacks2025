# Integration Summary: Gemini Chat + STRING MCP in Viz App

## What Was Done

### 1. Created Backend Server (`server.js`)
Integrated the complete Gemini + STRING MCP functionality from `llm/server.js`:

**Key Features:**
- Express server on port 3001 (configurable)
- Google Gemini 2.0 Flash for AI chat
- MCP Client for STRING database tools
- Function calling support for protein interaction queries
- Context-aware: knows about selected genes from volcano plot

**API Endpoints:**
- `POST /api/chat` - Main chat endpoint with history and selected genes
- `GET /api/health` - Server and MCP connection status
- `GET /api/tools` - List available STRING tools

### 2. Enhanced Frontend (`app.js`)
Added complete chat functionality to the existing visualization app:

**New Functions:**
- `checkHealth()` - Verify server connection
- `addMessage(role, content)` - Add chat bubbles dynamically
- `formatMessageContent(content)` - Render markdown, links, images
- `addLoadingMessage()` / `removeLoadingMessage()` - Loading states
- `sendMessage()` - Send chat with selected genes context

**Integration Points:**
- Send button now functional
- Enter key submits messages
- Selected genes automatically included in chat context
- Chat history maintained across messages

### 3. Updated UI (`index.html`)
**Changes:**
- Removed Lorem ipsum placeholder messages
- Messages now added dynamically via JavaScript
- Updated placeholder text: "Ask about your data or selected genes..."
- Clean initialization with welcome message

### 4. Enhanced Styling (`styles.css`)
**New Styles:**
- `.message.user` - User messages with blue background
- `.message.assistant` - AI messages with white background
- `@keyframes messageSlideIn` - Smooth message animations
- `.message code` - Inline code styling
- `.message-link` - Hyperlink formatting
- `.message-image` - Embedded image support (STRING networks)
- `.image-container` / `.image-caption` - Image display

### 5. Created Startup Script (`start-viz.ps1`)
**Features:**
- Environment validation
- Dependency checking
- Port configuration (3001)
- Error handling with helpful messages
- Colored console output

### 6. Documentation (`README.md`)
Comprehensive guide covering:
- Feature overview
- Setup instructions
- Usage examples
- CSV format requirements
- Architecture details
- Troubleshooting guide
- API documentation

## How It Works

### Data Flow

```
User Types Message
    ↓
Frontend (app.js)
    ↓
POST /api/chat (includes selected genes)
    ↓
Backend (server.js)
    ↓
Gemini 2.0 Flash (with system context)
    ↓
Function Calls? → MCP Client → STRING Database
    ↓
Response with markdown/links/images
    ↓
Frontend formats and displays
```

### Context Passing

When you select genes on the volcano plot and ask a question:

1. **Selection Event**: `handlePlotSelection()` updates `selectedGenes` array
2. **Chat Request**: `sendMessage()` includes selected genes in POST body
3. **System Instruction**: Server adds gene list to Gemini's context
4. **AI Awareness**: Gemini knows which genes you're interested in
5. **Tool Calls**: Can invoke STRING tools for those specific genes

### Example Interaction

```javascript
// User selects 10 genes on plot
selectedGenes = [
  { gene: 'TP53', log2FC: 3.2, padj: 0.001, category: 'Upregulated' },
  { gene: 'BRCA1', log2FC: 2.8, padj: 0.003, category: 'Upregulated' },
  // ... 8 more
]

// User asks: "Analyze these genes"

// Server builds context:
systemInstruction = `You are a bioinformatics assistant...
The user has currently selected 10 genes from the volcano plot: 
TP53, BRCA1, MYC, EGFR, ...`

// Gemini can then:
// 1. Understand which genes to analyze
// 2. Call STRING tools if needed
// 3. Provide biological insights
```

## Key Differences from Original Chat App

### Same Architecture
- ✅ Express + Gemini 2.0 Flash
- ✅ MCP Client for STRING
- ✅ Function calling support
- ✅ Chat history management
- ✅ Markdown formatting

### New Features
- ✅ **Selected genes context** - AI knows your plot selection
- ✅ **Integrated visualization** - Chat + data in one app
- ✅ **CSV upload** - Direct data loading
- ✅ **Threshold controls** - Dynamic plot updates
- ✅ **Two-panel design** - Chat (35%) + Viz (65%)

### Removed Features
- ❌ Status indicator widget (simplified)
- ❌ Tools list display (available but not shown)
- ❌ Clear chat button (can refresh page)

## Files Modified/Created

### New Files
```
viz-app/
├── server.js          ✨ Backend with Gemini + MCP
├── start-viz.ps1      ✨ Startup script
└── README.md          ✨ Documentation
```

### Modified Files
```
viz-app/
├── app.js             🔧 Added chat functions
├── index.html         🔧 Removed placeholders
└── styles.css         🔧 Added message styles

llm/
└── .env.example       🔧 Added VIZ_PORT
```

## Usage Instructions

### 1. Start the Server
```powershell
cd llm/viz-app
.\start-viz.ps1
```

### 2. Open Browser
Navigate to: http://localhost:3001

### 3. Upload Data
Click blue upload button → Select CSV with DEA results

### 4. Select Genes
Use lasso or box select on volcano plot

### 5. Chat with AI
Type: "Tell me about these selected genes"
Or: "Get interaction network for my selection"
Or: "What pathways are these genes involved in?"

## Dependencies

### Required
- `express` - Web server
- `@google/generative-ai` - Gemini SDK
- `@modelcontextprotocol/sdk` - MCP client
- `dotenv` - Environment variables

### Frontend
- Plotly.js (CDN)
- Inter Tight font (Google Fonts)
- Material Symbols (Google Icons)

### Optional
- Python + STRING MCP server (for protein interactions)

## Configuration

### Environment Variables
```bash
GEMINI_API_KEY=your_key_here   # Required
VIZ_PORT=3001                  # Optional, defaults to 3001
```

### MCP Server
Located in `../string-mcp/`
- Requires Python 3.x
- Requires STRING API key (optional)
- See `string-mcp/README.md`

## Testing

### 1. Test Chat Without MCP
- Start server
- Ask general questions
- Should work even if STRING not configured

### 2. Test Chat With Selection
- Upload CSV
- Select genes on plot
- Check console: `selectedGenes` array populated
- Ask about "selected genes" or "these genes"

### 3. Test STRING Tools
- Ensure MCP connected (check startup logs)
- Select genes
- Ask: "Show me the interaction network"
- Should see STRING API calls in server logs

## Troubleshooting

### Chat not sending messages
- Check browser console for errors
- Verify server is running on port 3001
- Check network tab: POST to `/api/chat` should succeed

### MCP not working
- Server starts fine without MCP
- Check Python installation: `py --version`
- Check STRING MCP setup: `cd ../string-mcp && py server.py`
- Review server logs for connection errors

### Selected genes not in context
- Check browser console: `window.getSelectedGenes()`
- Should return array of selected gene objects
- Server logs should show: "Selected genes: X"

## Next Steps

### Potential Enhancements
1. **Clear chat button** - Reset conversation history
2. **Export selection** - Save selected genes to CSV
3. **Send selection button** - Explicit "Analyze selected" button
4. **Status indicator** - Show MCP connection status in UI
5. **Tool usage display** - Show when STRING tools are being called
6. **Chat history persistence** - Save to localStorage
7. **Multiple file support** - Compare different DEA results
8. **Custom gene lists** - Manually input gene lists for analysis

## Summary

The Gemini chat functionality with STRING MCP is now **fully integrated** into your visualization app. The implementation follows the same architecture as the original `llm/server.js` but adds powerful context awareness through selected genes from the volcano plot. Users can now:

1. Upload and visualize DEA results
2. Interactively select genes of interest
3. Ask questions about those genes
4. Get protein interaction networks via STRING
5. Receive AI-powered biological insights

All in one seamless interface! 🎉
