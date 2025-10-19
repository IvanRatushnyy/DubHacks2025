# 🚀 Quick Start Guide - DEA Viz App with AI Chat

## Prerequisites Checklist
- ✅ Node.js installed (check: `node --version`)
- ✅ Python installed (check: `py --version`) 
- ✅ Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## 5-Minute Setup

### Step 1: Install Dependencies
```powershell
# From the llm folder (parent of viz-app)
cd c:\Users\natal\OneDrive\Desktop\Testing\llm
npm install
```

### Step 2: Configure API Key
```powershell
# Create .env file from example
Copy-Item .env.example .env

# Edit .env and add your Gemini API key
notepad .env
```

In `.env`, set:
```
GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: (Optional) Setup STRING MCP
For protein-protein interaction analysis:
```powershell
cd string-mcp
pip install -r requirements.txt
# Follow string-mcp/README.md for STRING API key
cd ..
```

### Step 4: Start the Viz App
```powershell
cd viz-app
.\start-viz.ps1
```

You should see:
```
✓ Viz App Server running on http://localhost:3001
✓ Gemini API Key configured: true
✓ STRING MCP connected with X tools
```

### Step 5: Open in Browser
Navigate to: **http://localhost:3001**

## First Use

### 1. Upload DEA Data
- Click the **blue upload button** (bottom-right corner)
- Select a CSV file with DEA results
- Required columns: `log2FoldChange`, `padj`

### 2. Explore the Plot
- Use **lasso select** (toolbar) or **box select** to choose genes
- Adjust **threshold controls** above the plot
- Zoom and pan as needed

### 3. Chat with AI
In the left panel, try:
- "What can you tell me about the data?"
- "Analyze the upregulated genes"
- Select some genes and ask: "Tell me about these genes"
- "Get the protein interaction network for my selection"

## Example Workflow

```
1. Upload: deseq2_results_significant.csv
   → See volcano plot with colored points

2. Adjust thresholds:
   → log2FC: 2.0
   → -log10(p): 2.0
   
3. Select genes:
   → Use lasso tool to select top-right cluster
   → Check console: selectedGenes array populated

4. Chat:
   User: "What pathways are these genes involved in?"
   AI: *Analyzes genes and provides pathway information*
   
5. Deep dive:
   User: "Show me the interaction network"
   AI: *Calls STRING MCP, returns network visualization*
```

## Troubleshooting

### "Server Error" when chatting
**Fix:** Make sure the server is running (`.\start-viz.ps1`)

### "MCP Not Connected" 
**Fix:** App works fine without MCP! You just won't have STRING tools.
To fix: Setup Python and `pip install -r ../string-mcp/requirements.txt`

### Plot not showing after upload
**Fix:** Check CSV has these columns:
- Gene names (first column or named `gene`)
- `log2FoldChange` (or `log2FC`)
- `padj` (or `pvalue`)

### Can't find .env file
**Fix:** Create it in the `llm` folder (parent of viz-app):
```powershell
cd ..
Copy-Item .env.example .env
```

## Data Format

Your CSV should look like this:

```csv
gene,log2FoldChange,padj,pvalue,baseMean
TP53,3.45,0.0001,0.00001,5000
BRCA1,-2.87,0.0023,0.0001,3200
MYC,4.12,0.00005,0.000001,8900
```

## Tips & Tricks

### 1. Context-Aware Chat
When you select genes, the AI automatically knows about them!
- Select genes → Ask "analyze these"
- No need to list gene names

### 2. Selected Genes in Console
```javascript
// In browser console:
window.getSelectedGenes()
// Returns: Array of selected gene objects
```

### 3. Export for Further Analysis
Selected genes are logged to console in table format:
- Select genes → Open DevTools (F12) → Console tab
- See formatted table with gene info

### 4. Multiple Questions
Chat history is maintained throughout your session:
- Ask follow-up questions
- Reference previous answers
- Build on conversation

### 5. Markdown in Chat
AI responses support:
- **Bold text**
- *Italic text*
- `code blocks`
- [Links](https://example.com)
- Images (STRING networks appear automatically)

## Keyboard Shortcuts

- `Enter` → Send chat message
- `Shift+Enter` → New line in chat input
- `Ctrl+Scroll` → Zoom plot
- `Double-click plot` → Reset zoom

## What to Ask the AI

### General Questions
- "Explain differential expression analysis"
- "What does log2FC mean?"
- "How do I interpret the p-values?"

### Data Analysis
- "Summarize the DEA results"
- "Which genes are most significant?"
- "Are there more upregulated or downregulated genes?"

### Selected Genes (after selection)
- "Tell me about these genes"
- "What do these genes have in common?"
- "Show me the interaction network"
- "What pathways are enriched?"
- "Are these genes known cancer markers?"

### STRING Tools (requires MCP)
- "Get protein interactions for TP53, BRCA1, MYC"
- "Show enrichment analysis for my selected genes"
- "What proteins interact with these?"

## File Locations

```
Testing/
└── llm/
    ├── .env                    ← API keys
    ├── node_modules/           ← Dependencies
    ├── string-mcp/             ← STRING MCP server
    └── viz-app/
        ├── server.js           ← Backend
        ├── app.js              ← Frontend logic
        ├── index.html          ← UI
        ├── styles.css          ← Styling
        ├── start-viz.ps1       ← Startup script
        └── README.md           ← Full documentation
```

## Getting Help

1. **Check browser console** (F12) for frontend errors
2. **Check server logs** in PowerShell for backend errors
3. **Review README.md** for detailed documentation
4. **Check INTEGRATION.md** for architecture details

## Next Steps

Once you're comfortable with the basics:

1. Try uploading different DEA datasets
2. Experiment with threshold values
3. Compare results across analyses
4. Use STRING tools for pathway analysis
5. Build a workflow for your specific research

---

**Ready to start?** 🚀

```powershell
cd c:\Users\natal\OneDrive\Desktop\Testing\llm\viz-app
.\start-viz.ps1
```

Then visit: **http://localhost:3001**

Happy analyzing! 🧬
