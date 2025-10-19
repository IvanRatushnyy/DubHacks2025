# DEA Visualization App with AI Chat

A powerful visualization tool for Differential Expression Analysis (DEA) results with integrated AI chat powered by Google Gemini and STRING database protein-protein interaction analysis.

## Features

### 📊 Visualization
- **Interactive Volcano Plot**: Upload CSV files with DEA results and visualize them
- **Dynamic Thresholds**: Adjust log2FC and p-value thresholds in real-time
- **Selection Tools**: Lasso and box selection to choose genes of interest
- **Responsive Design**: Split-panel interface with chat (35%) and visualization (65%)

### 💬 AI Chat Assistant
- **Gemini-Powered**: Intelligent conversation about your data
- **STRING Integration**: Access to protein-protein interaction networks via MCP
- **Context-Aware**: AI knows which genes you've selected on the plot
- **Network Analysis**: Ask about pathways, enrichment, and interactions

### 🧬 STRING Database Tools
When properly configured, you can:
- Get protein-protein interaction networks for selected genes
- Perform functional enrichment analysis
- Query protein information
- Analyze biological pathways

## Quick Start

### Prerequisites
1. Node.js installed (v18 or higher)
2. Python installed (for STRING MCP server)
3. Gemini API key from Google AI Studio

### Setup

1. **Install Dependencies** (from parent `llm` folder):
   ```powershell
   cd ..
   npm install
   ```

2. **Configure Environment** (in parent `llm` folder):
   - Copy `.env.example` to `.env`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. **Setup STRING MCP** (optional, for protein interaction analysis):
   ```powershell
   cd ../string-mcp
   pip install -r requirements.txt
   # Follow string-mcp/README.md for API configuration
   ```

### Running the App

```powershell
# From the viz-app folder
.\start-viz.ps1
```

Then open your browser to: **http://localhost:3001**

## Usage

### 1. Upload DEA Data
- Click the blue upload button (bottom-right of visualization panel)
- Select a CSV file with DEA results
- Required columns: `log2FoldChange`, `padj` (or similar variants)

### 2. Explore the Volcano Plot
- **Zoom**: Scroll or use Plotly controls
- **Pan**: Click and drag
- **Select**: Use lasso or box select tools to choose genes
- **Adjust Thresholds**: Use the threshold controls above the plot

### 3. Chat with AI
- Type questions in the chat input at the bottom of the left panel
- Ask about your data, selected genes, or biology in general
- Examples:
  - "What can you tell me about the upregulated genes?"
  - "Analyze the interaction network for my selected genes"
  - "What pathways are enriched in these genes?"

### 4. Context-Aware Analysis
- When you select genes on the plot, the AI automatically knows about them
- Selected genes are passed to the STRING database for network analysis
- The AI can interpret results and provide biological insights

## Expected CSV Format

Your DEA results file should have these columns (or similar):

```csv
gene,log2FoldChange,padj,pvalue,baseMean
GENE1,3.5,0.001,0.0001,1000
GENE2,-2.8,0.005,0.001,500
GENE3,1.2,0.15,0.08,300
```

**Key columns:**
- Gene identifier (first column or named `gene`, `Gene`, `ID`, etc.)
- `log2FoldChange` (or `log2FC`, `logFC`)
- `padj` (or `adj_pval`, `FDR`, `pvalue`)

## Architecture

```
viz-app/
├── server.js          # Express server with Gemini + MCP integration
├── app.js             # Frontend logic (data, plot, chat)
├── index.html         # UI structure
├── styles.css         # Styling
├── start-viz.ps1      # Startup script
└── README.md          # This file

Connected to:
├── ../string-mcp/     # STRING database MCP server
├── ../.env            # API keys and configuration
└── ../node_modules/   # Shared dependencies
```

## Technical Details

### Backend (server.js)
- **Express** server on port 3001
- **Gemini 2.0 Flash** for AI chat
- **MCP Client** for STRING database integration
- Function calling to invoke STRING tools

### Frontend (app.js)
- **Plotly.js** for interactive volcano plots
- **Vanilla JavaScript** for performance
- **RESTful API** communication with backend
- **Real-time** threshold updates with debouncing

### Styling (styles.css)
- **Inter Tight** font family
- **Material Symbols** icons
- **Minimalist** design with subtle shadows
- **Responsive** layout with flexbox

## Troubleshooting

### Server won't start
- Check that `.env` file exists in parent `llm` folder
- Verify `GEMINI_API_KEY` is set
- Run `npm install` in parent folder

### MCP not connected
- Ensure Python is installed and in PATH
- Install STRING MCP requirements: `pip install -r ../string-mcp/requirements.txt`
- Configure STRING API key (see `string-mcp/README.md`)
- App works without MCP, just without STRING tools

### Plot not showing
- Verify CSV has correct column names
- Check browser console for errors
- Ensure data has valid numeric values

### Chat not working
- Make sure server is running (`start-viz.ps1`)
- Check network tab in browser dev tools
- Verify Gemini API key is valid

## API Endpoints

- `POST /api/chat` - Send chat message, get AI response
- `GET /api/health` - Check server and MCP status
- `GET /api/tools` - List available STRING tools

## Development

### Adding new features
1. Backend changes: Edit `server.js`
2. Frontend logic: Edit `app.js`
3. UI changes: Edit `index.html` and `styles.css`

### Testing STRING tools
```javascript
// In browser console after selecting genes:
window.getSelectedGenes()
```

## Credits

- **Plotly.js** for visualization
- **Google Gemini** for AI chat
- **STRING Database** for protein interactions
- **Model Context Protocol (MCP)** for tool integration

## License

MIT License - See parent folder for details
