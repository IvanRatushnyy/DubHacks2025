# Quick Start Guide

## Setup Complete

All dependencies have been installed. Now follow these final steps:

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

## Step 2: Add Your API Key

Open the file `.env` in the `llm` folder and replace `your_gemini_api_key_here` with your actual API key:

```
GEMINI_API_KEY=AIza...your_actual_key_here
PORT=3000
```

## Step 3: Start the Server

Run this command:

```bash
npm start
```

## Step 4: Open the App

Open your browser to: **http://localhost:3000**

## Step 5: Upload DEA Results

1. Click the "Upload CSV" button in the top left
2. Select your DEA results file (must include columns: gene, log2FoldChange, padj)
3. The filename will be parsed automatically if formatted as: `{disease}_{groupA}_vs_{groupB}.csv`
4. Explore the interactive volcano plot
5. Use the chat interface to ask questions about specific genes or pathways

## Example Questions to Ask

Try these questions to test the STRING MCP integration:

1. "What are the interactions for TP53?"
   - Gets protein-protein interactions for the TP53 tumor suppressor gene

2. "Find proteins related to apoptosis"
   - Searches for proteins involved in programmed cell death

3. "Show me the protein network for BRCA1"
   - Retrieves interaction networks for the breast cancer gene

4. "What is the functional enrichment for genes involved in DNA repair?"
   - Performs enrichment analysis for DNA repair pathways

5. "Tell me about homologs of TP53 across species"
   - Finds protein homologs in different organisms

## Troubleshooting

### MCP Not Connected
- Check that all Python dependencies are installed
- Verify the STRING MCP server is in `llm/string-mcp/`
- Look at the server console for error messages

### Gemini API Errors
- Verify your API key is correct in `.env`
- Check your API quota at Google AI Studio
- Ensure you have internet connectivity

### Port Already in Use
Change the `PORT` in `.env` to a different number:
```
PORT=3001
```

## Project Structure

```
llm/
├── public/              # Application files
│   ├── index.html      # Main interface
│   ├── styles.css      # Styling
│   ├── app.js          # Client-side logic
│   └── server.js       # Node.js server
├── string-mcp/         # STRING MCP server (Python)
├── package.json        # Dependencies
├── .env               # Your API key (DO NOT COMMIT!)
└── README.md          # Full documentation
```

## Features

- Interactive volcano plot visualization with Plotly.js
- AI-powered chat interface with Gemini 2.0 Flash
- STRING database protein interaction tools
- Automatic context extraction from filenames
- Real-time tool execution
- Modern, responsive two-column design

## Learn More

- [Gemini API Documentation](https://ai.google.dev/docs)
- [STRING Database](https://string-db.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**Ready to start?** Run `npm start` and open http://localhost:3000
