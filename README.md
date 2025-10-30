# SaGene - RNA-seq DEA Visualization Platform

An interactive visualization platform for RNA-seq Differential Expression Analysis (DEA) results, powered by Google's Gemini AI with Model Context Protocol (MCP) integration to access STRING protein database tools.

## Features

- Interactive volcano plot visualization with Plotly.js
- AI-powered chat interface with Gemini
- Access to STRING database protein interaction tools
- Automatic context extraction from DEA result files
- MCP integration for biological tool calling
- Modern, responsive two-column layout

## STRING MCP Tools

The app connects to the STRING MCP server which provides:
- Protein identifier resolution
- Interaction network retrieval
- Homology lookups across species
- Evidence links for protein-protein interactions
- Functional enrichment analysis
- Curated functional annotations
- Query proteins by functional terms

## Setup

### 1. Install Dependencies

```bash
cd llm
npm install
```

### 2. Set up STRING MCP Server

Clone and set up the STRING MCP server:

```bash
# From the llm directory
git clone https://github.com/meringlab/string-mcp.git
cd string-mcp
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the `llm` directory:

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

### 4. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file

## Running the App

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Usage

1. Open your browser to `http://localhost:3000`
2. Upload a DEA results CSV file (must include columns: gene, log2FoldChange, padj)
3. The app will automatically extract context from the filename if formatted as: `{disease}_{groupA}_vs_{groupB}.csv`
4. Interact with the volcano plot to explore differentially expressed genes
5. Use the AI chat to ask questions about specific genes, pathways, or protein interactions

Example questions:
- "What are the interactions for TP53?"
- "Find proteins related to apoptosis"
- "Show me the protein network for BRCA1"
- "What is the functional enrichment for genes involved in DNA repair?"

## Architecture

- **Frontend**: Vanilla JavaScript with Plotly.js visualization
- **Backend**: Node.js with Express
- **AI**: Google Gemini 2.0 Flash
- **MCP**: Model Context Protocol SDK for tool integration
- **Tools**: STRING database via MCP server

## Troubleshooting

### MCP Not Connected

If the status shows "MCP Not Connected":

1. Ensure Python is installed and available in PATH
2. Check that the STRING MCP server is properly set up in `llm/string-mcp/`
3. Verify `requirements.txt` dependencies are installed: `pip install -r string-mcp/requirements.txt`
4. Check server console for error messages

### Gemini API Errors

- Verify your API key is correct in `.env`
- Check your API quota at [Google AI Studio](https://makersuite.google.com/)
- Ensure you have internet connectivity

### Port Already in Use

If port 3000 is already in use, change the `PORT` in `.env`:

```
PORT=3001
```

## License

MIT
