import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MCP Client for STRING
let mcpClient = null;
let mcpTransport = null;
let availableTools = [];

// Initialize MCP connection to STRING server
async function initMCP() {
  try {
    // Path to the STRING MCP server
    const serverPath = join(__dirname, '..', 'string-mcp', 'server.py');
    const serverDir = join(__dirname, '..', 'string-mcp');
    
    console.log('Attempting to connect to STRING MCP server at:', serverPath);
    
    // Create transport (use 'py' on Windows, set cwd to server directory)
    mcpTransport = new StdioClientTransport({
      command: 'py',
      args: [serverPath],
      cwd: serverDir,  // Set working directory to string-mcp folder
    });

    // Create client
    mcpClient = new Client({
      name: 'viz-app-client',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Connect to the server
    await mcpClient.connect(mcpTransport);
    
    // List available tools
    const toolsResponse = await mcpClient.listTools();
    availableTools = toolsResponse.tools || [];
    
    console.log(`✓ Connected to STRING MCP server with ${availableTools.length} tools available`);
    console.log('Available tools:', availableTools.map(t => t.name).join(', '));
    
    return true;
  } catch (error) {
    console.error('Failed to initialize MCP:', error.message);
    console.log('Chat will work without MCP tools. Make sure STRING MCP server is set up.');
    return false;
  }
}

// Convert MCP tools to Gemini function declarations
function convertMCPToolsToGeminiFunctions() {
  return availableTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema || {
      type: 'object',
      properties: {},
      required: []
    }
  }));
}

// Call MCP tool
async function callMCPTool(toolName, args) {
  try {
    const response = await mcpClient.callTool({
      name: toolName,
      arguments: args
    });
    return response.content;
  } catch (error) {
    console.error(`Error calling MCP tool ${toolName}:`, error);
    return [{ type: 'text', text: `Error calling tool: ${error.message}` }];
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], selectedGenes = [], context = null, apiKey = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received message:', message);
    console.log('Selected genes:', selectedGenes.length);
    console.log('Active context:', JSON.stringify(context, null, 2));
    console.log('MCP Client connected:', !!mcpClient);
    console.log('Custom API key provided:', !!apiKey);

    // Use custom API key if provided, otherwise use environment variable
    const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKeyToUse) {
      return res.status(400).json({ error: 'API key is required. Please provide one in the input field or set GEMINI_API_KEY in .env file.' });
    }
    
    // Initialize Gemini with the appropriate API key
    const genAIInstance = new GoogleGenerativeAI(apiKeyToUse);

    // Build system instruction that includes context from pills
    let systemInstruction = `You are a bioinformatics assistant specialized in analyzing differential expression analysis (DEA) results. You have access to STRING database tools for protein-protein interaction analysis.`;
    
    // Add context from pills if active
    if (context) {
      // Add disease type context
      if (context["disease-type"]) {
        systemInstruction += `\n\nDISEASE TYPE: ${context["disease-type"]}`;
      }
      
      // Add comparison groups context
      if (context["comparison-groups"]) {
        systemInstruction += `\n\nCOMPARISON GROUPS: ${context["comparison-groups"]}`;
      }
      
      // Add gene selection context with detailed information
      if (context["selection"] && Array.isArray(context["selection"]) && context["selection"].length > 0) {
        const genes = context["selection"];
        systemInstruction += `\n\nSELECTED GENES FROM VOLCANO PLOT (${genes.length} genes):`;
        
        // Add detailed gene information
        genes.forEach((gene, index) => {
          if (index < 20) { // Limit to first 20 genes for system instruction
            systemInstruction += `\n- ${gene.gene}: log2FC=${gene.log2FC?.toFixed(2)}, padj=${gene.padj?.toExponential(2)}, category=${gene.category}`;
          }
        });
        
        if (genes.length > 20) {
          systemInstruction += `\n... and ${genes.length - 20} more genes`;
        }
        
        // Add summary statistics
        const upregulated = genes.filter(g => g.category === 'Upregulated').length;
        const downregulated = genes.filter(g => g.category === 'Downregulated').length;
        const notSignificant = genes.filter(g => g.category === 'Not significant').length;
        
        systemInstruction += `\n\nSUMMARY: ${upregulated} upregulated, ${downregulated} downregulated, ${notSignificant} not significant`;
      }
    } else if (selectedGenes && selectedGenes.length > 0) {
      // Fallback to old method if no context pills active
      systemInstruction += `\n\nThe user has currently selected ${selectedGenes.length} genes from the volcano plot: ${selectedGenes.map(g => g.gene).slice(0, 10).join(', ')}${selectedGenes.length > 10 ? '...' : ''}`;
    }
    
    console.log('=== SYSTEM INSTRUCTION ===');
    console.log(systemInstruction);
    console.log('=========================');

    // Initialize model - Use Gemini 2.5 Flash which has higher RPD limits
    const modelConfig = {
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction
    };
    
    // Only add tools if MCP is connected
    if (mcpClient && availableTools.length > 0) {
      modelConfig.tools = [{ functionDeclarations: convertMCPToolsToGeminiFunctions() }];
    }
    
    const model = genAIInstance.getGenerativeModel(modelConfig);

    console.log('Model initialized with', mcpClient ? availableTools.length : 0, 'tools');

    // Build chat history
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    // Send message
    console.log('Sending message to Gemini...');
    let result = await chat.sendMessage(message);
    let response = result.response;
    console.log('Response candidates:', response.candidates?.length || 0);
    
    console.log('Initial response received');
    
    // Handle function calls (MCP tool calls)
    let iterationCount = 0;
    const maxIterations = 5; // Prevent infinite loops
    
    // Check if there are function calls to handle
    const hasFunctionCalls = () => {
      try {
        const calls = response.functionCalls?.();
        return calls && Array.isArray(calls) && calls.length > 0;
      } catch (e) {
        return false;
      }
    };
    
    while (hasFunctionCalls() && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`Function call iteration ${iterationCount}`);
      
      const functionCalls = response.functionCalls();
      const functionResponses = [];

      for (const call of functionCalls) {
        console.log(`Calling MCP tool: ${call.name} with args:`, JSON.stringify(call.args));
        
        try {
          const toolResult = await callMCPTool(call.name, call.args);
          
          // Convert MCP response to Gemini function response format
          const textContent = toolResult
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('\n');

          console.log(`Tool result: ${textContent.substring(0, 200)}...`);

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: textContent }
            }
          });
        } catch (toolError) {
          console.error(`Error calling tool ${call.name}:`, toolError);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { error: toolError.message }
            }
          });
        }
      }

      // Send function responses back to model
      console.log('Sending function responses back to model');
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const text = response.text();
    console.log('Final response generated:', text.substring(0, 100) + '...');

    res.json({
      response: text,
      history: [
        ...history,
        { role: 'user', content: message },
        { role: 'model', content: text }
      ]
    });

  } catch (error) {
    console.error('Chat error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mcpConnected: mcpClient !== null,
    availableTools: availableTools.length,
    hasApiKey: !!process.env.GEMINI_API_KEY
  });
});

// Get available tools endpoint
app.get('/api/tools', (req, res) => {
  res.json({ 
    tools: availableTools.map(t => ({
      name: t.name,
      description: t.description
    }))
  });
});

// Start server
async function startServer() {
  // Try to initialize MCP (non-blocking)
  await initMCP();
  
  app.listen(PORT, () => {
    console.log(`\n✓ Viz App Server running on http://localhost:${PORT}`);
    console.log(`✓ Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
    if (mcpClient) {
      console.log(`✓ STRING MCP connected with ${availableTools.length} tools\n`);
    } else {
      console.log(`⚠ STRING MCP not connected - chat will work without tools\n`);
    }
  });
}

startServer();

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  if (mcpClient) {
    await mcpClient.close();
  }
  process.exit(0);
});
