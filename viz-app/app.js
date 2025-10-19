// Global data storage
let deaData = null;
let processedPlotData = null; // Store processed data for selection
let selectedGenes = []; // Store selected genes

// Chat state
let chatHistory = [];
let isProcessing = false;

// User-configurable cutoffs (matching volcano app)
const PVAL_CUTOFF = 0.01;         // adjusted p-value threshold for significance
const LOG2FC_CUTOFF = 2.0;       // absolute log2 fold-change threshold

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const vizContent = document.getElementById('vizContent');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DEA Visualization App initialized');
    
    // Upload button click handler
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Make empty state clickable for upload
    const emptyState = document.querySelector('.clickable-upload');
    if (emptyState) {
        emptyState.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // File input change handler
    fileInput.addEventListener('change', handleFileUpload);
    
    // Send button click handler
    sendBtn.addEventListener('click', sendMessage);
    
    // Enter key handler for chat input
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Check server health
    checkHealth();
    
    // Clear placeholder messages
    chatMessages.innerHTML = '';
    addMessage('assistant', 'Hello! I\'m your bioinformatics assistant. Upload a CSV file with DEA results to get started, or ask me any questions about your data analysis.');
});

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
    }
    
    console.log('File selected:', file.name);
    console.log('File size:', (file.size / 1024).toFixed(2), 'KB');
    
    try {
        // Read file
        const text = await file.text();
        
        // Parse CSV
        const parsedData = parseCSV(text);
        
        // Store data globally
        deaData = parsedData;
        
        // Log data structure to console
        console.log('=== DEA Data Structure ===');
        console.log('Total rows:', parsedData.length);
        console.log('Columns:', parsedData.length > 0 ? Object.keys(parsedData[0]) : []);
        console.log('Sample data (first 5 rows):');
        console.table(parsedData.slice(0, 5));
        console.log('Full dataset:', parsedData);
        
        // Analyze data
        const stats = analyzeData(parsedData);
        console.log('Data statistics:', stats);
        
        // Display data preview
        displayDataPreview(file.name, stats);
        
        // Create volcano plot
        createVolcanoPlot(parsedData);
        
        // Reset file input
        fileInput.value = '';
        
    } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Please make sure it\'s a valid CSV file.');
    }
}

// Parse CSV text into array of objects
function parseCSV(text) {
    const lines = text.trim().split('\n');
    
    if (lines.length === 0) {
        throw new Error('Empty CSV file');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = parseCSVLine(line);
        
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                // Try to convert to number if possible
                row[header] = isNaN(value) ? value : parseFloat(value);
            });
            data.push(row);
        }
    }
    
    return data;
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
}

// Analyze data and extract statistics
function analyzeData(data) {
    if (!data || data.length === 0) {
        return null;
    }
    
    const stats = {
        totalGenes: data.length,
        columns: Object.keys(data[0]),
        numericColumns: []
    };
    
    // Identify numeric columns
    const firstRow = data[0];
    for (const key in firstRow) {
        if (typeof firstRow[key] === 'number') {
            stats.numericColumns.push(key);
        }
    }
    
    // Try to identify DEA-specific columns
    const lowerCaseColumns = stats.columns.map(c => c.toLowerCase());
    
    // Find log2FoldChange column
    const log2FCIndex = lowerCaseColumns.findIndex(c => 
        c.includes('log2') && c.includes('fold') || c.includes('log2fc') || c === 'log2fc'
    );
    if (log2FCIndex !== -1) {
        stats.log2FoldChangeColumn = stats.columns[log2FCIndex];
        const values = data.map(row => row[stats.log2FoldChangeColumn]).filter(v => !isNaN(v));
        stats.upregulated = values.filter(v => v > 0).length;
        stats.downregulated = values.filter(v => v < 0).length;
    }
    
    // Find p-value or padj column
    const padjIndex = lowerCaseColumns.findIndex(c => 
        c.includes('padj') || c.includes('p.adj') || c.includes('fdr') || c.includes('pvalue')
    );
    if (padjIndex !== -1) {
        stats.padjColumn = stats.columns[padjIndex];
        const significantThreshold = 0.05;
        stats.significant = data.filter(row => row[stats.padjColumn] < significantThreshold).length;
    }
    
    return stats;
}

// Display data preview in the visualization panel
function displayDataPreview(filename, stats) {
    const html = `
        <div class="threshold-controls">
            <div class="threshold-title">Threshold:</div>
            <div class="threshold-input-group">
                <label for="log2fcThreshold">log2FC</label>
                <input type="number" id="log2fcThreshold" value="2.0" step="0.1" min="0" />
            </div>
            <div class="threshold-input-group">
                <label for="pvalThreshold">-log10(p)</label>
                <input type="number" id="pvalThreshold" value="2" step="0.1" min="0" />
            </div>
        </div>
        
        <div id="volcanoPlotContainer" style="width: 100%; height: 600px; margin-bottom: 24px;"></div>
    `;
    
    vizContent.innerHTML = html;
    
    // Add event listeners for threshold changes
    setupThresholdListeners();
    
    // Show success state on upload button
    showUploadSuccess();
}

// Setup threshold input listeners
function setupThresholdListeners() {
    const log2fcInput = document.getElementById('log2fcThreshold');
    const pvalInput = document.getElementById('pvalThreshold');
    
    if (log2fcInput && pvalInput) {
        // Debounce function to avoid too many updates
        let debounceTimer;
        const handleThresholdChange = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (deaData) {
                    console.log('Updating thresholds:', {
                        log2FC: parseFloat(log2fcInput.value),
                        negLog10P: parseFloat(pvalInput.value)
                    });
                    createVolcanoPlot(deaData);
                }
            }, 500); // Wait 500ms after user stops typing
        };
        
        log2fcInput.addEventListener('input', handleThresholdChange);
        pvalInput.addEventListener('input', handleThresholdChange);
    }
}

// Create volcano plot using Plotly.js
function createVolcanoPlot(data) {
    // Get current thresholds from inputs (or use defaults)
    const log2fcInput = document.getElementById('log2fcThreshold');
    const pvalInput = document.getElementById('pvalThreshold');
    
    const currentLog2FC = log2fcInput ? parseFloat(log2fcInput.value) : LOG2FC_CUTOFF;
    const currentNegLog10P = pvalInput ? parseFloat(pvalInput.value) : -Math.log10(PVAL_CUTOFF);
    
    // Convert -log10(p) threshold back to p-value
    const currentPvalCutoff = Math.pow(10, -currentNegLog10P);
    
    console.log('Creating volcano plot with thresholds:', {
        log2FC: currentLog2FC,
        pvalue: currentPvalCutoff,
        negLog10P: currentNegLog10P
    });
    
    // Process data and classify according to cutoffs
    const processedData = data.map(row => {
        // Try to find gene identifier column
        const gene = row['Unnamed: 0'] || row[''] || row['gene'] || row['Gene'] || row['ID'] || 'Unknown';
        const log2FC = parseFloat(row.log2FoldChange || row.log2FC || row.logFC);
        const padj = parseFloat(row.padj || row.adj_pval || row.FDR);
        const negLog10Padj = padj > 0 && isFinite(padj) ? -Math.log10(padj) : null;

        // Default category
        let category = 'Not significant';
        if (isFinite(padj) && isFinite(log2FC) && isFinite(negLog10Padj)) {
            if (padj <= currentPvalCutoff && log2FC >= currentLog2FC) {
                category = 'Upregulated';
            } else if (padj <= currentPvalCutoff && log2FC <= -currentLog2FC) {
                category = 'Downregulated';
            }
        }

        return {
            gene: gene,
            log2FC: log2FC,
            padj: padj,
            negLog10Padj: negLog10Padj,
            category: category,
            isSignificant: category !== 'Not significant'
        };
    }).filter(d => 
        d.negLog10Padj !== null && 
        isFinite(d.negLog10Padj) && 
        isFinite(d.log2FC) && 
        !isNaN(d.log2FC)
    );

    // If there's no valid data, show error message
    if (!processedData || processedData.length === 0) {
        const container = document.getElementById('volcanoPlotContainer');
        if (container) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #dc2626; font-size: 16px;">No valid data to plot. Please check CSV column names (expected: log2FoldChange and padj).</div>';
        }
        console.warn('No valid data to plot.');
        return;
    }

    // Store processed data globally for selection handling
    processedPlotData = processedData;

    // Separate by category
    const upGenes = processedData.filter(d => d.category === 'Upregulated');
    const downGenes = processedData.filter(d => d.category === 'Downregulated');
    const nsGenes = processedData.filter(d => d.category === 'Not significant');

    console.log(`Volcano plot categories: ${nsGenes.length} not significant, ${upGenes.length} upregulated, ${downGenes.length} downregulated`);

    // Create traces with performance optimizations
    // Trace for not-significant genes
    const traceNS = {
        x: nsGenes.map(d => d.log2FC),
        y: nsGenes.map(d => d.negLog10Padj),
        mode: 'markers',
        type: 'scattergl',
        name: 'Not significant',
        marker: { color: 'gray', size: 4, opacity: 0.5 },
        text: nsGenes.map(d => d.gene),
        hovertemplate: '<b>%{text}</b><br>' + 'log2FC: %{x:.3f}<br>' + '-log10(padj): %{y:.3f}<br>' + '<extra></extra>',
        selected: { marker: { color: 'gray', size: 6 } },
        unselected: { marker: { opacity: 0.3 } }
    };

    // Trace for upregulated
    const traceUp = {
        x: upGenes.map(d => d.log2FC),
        y: upGenes.map(d => d.negLog10Padj),
        mode: 'markers',
        type: 'scattergl',
        name: 'Upregulated',
        marker: { color: '#dc2626', size: 6, opacity: 0.8 },
        text: upGenes.map(d => d.gene),
        hovertemplate: '<b>%{text}</b><br>' + 'log2FC: %{x:.3f}<br>' + '-log10(padj): %{y:.3f}<br>' + '<extra></extra>',
        selected: { marker: { color: '#dc2626', size: 8 } },
        unselected: { marker: { opacity: 0.3 } }
    };

    // Trace for downregulated
    const traceDown = {
        x: downGenes.map(d => d.log2FC),
        y: downGenes.map(d => d.negLog10Padj),
        mode: 'markers',
        type: 'scattergl',
        name: 'Downregulated',
        marker: { color: '#2563eb', size: 6, opacity: 0.8 },
        text: downGenes.map(d => d.gene),
        hovertemplate: '<b>%{text}</b><br>' + 'log2FC: %{x:.3f}<br>' + '-log10(padj): %{y:.3f}<br>' + '<extra></extra>',
        selected: { marker: { color: '#2563eb', size: 8 } },
        unselected: { marker: { opacity: 0.3 } }
    };

    // Layout
    const layout = {
        title: {
            text: 'Volcano Plot - Differential Expression Analysis',
            font: { size: 20, family: 'Inter Tight, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' },
            y: 0.95
        },
        xaxis: {
            title: {
                text: 'log2 Fold Change',
                font: { family: 'Inter Tight, sans-serif' }
            },
            zeroline: true,
            zerolinewidth: 1,
            zerolinecolor: '#DDD',
            gridcolor: '#EEE',
            tickfont: { family: 'Inter Tight, sans-serif' }
        },
        yaxis: {
            title: {
                text: '-log10(adjusted p-value)',
                font: { family: 'Inter Tight, sans-serif' }
            },
            zeroline: false,
            gridcolor: '#EEE',
            tickfont: { family: 'Inter Tight, sans-serif' }
        },
        shapes: [
            // Vertical line at positive log2FC threshold
            {
                type: 'line',
                x0: currentLog2FC,
                y0: 0,
                x1: currentLog2FC,
                y1: 1,
                yref: 'paper',
                line: {
                    color: '#66666E',
                    width: 1,
                    dash: 'dash'
                }
            },
            // Vertical line at negative log2FC threshold
            {
                type: 'line',
                x0: -currentLog2FC,
                y0: 0,
                x1: -currentLog2FC,
                y1: 1,
                yref: 'paper',
                line: {
                    color: '#66666E',
                    width: 1,
                    dash: 'dash'
                }
            },
            // Horizontal line at -log10(p) threshold
            {
                type: 'line',
                x0: 0,
                y0: currentNegLog10P,
                x1: 1,
                y1: currentNegLog10P,
                xref: 'paper',
                line: {
                    color: '#66666E',
                    width: 1,
                    dash: 'dash'
                }
            }
        ],
        hovermode: 'closest',
        showlegend: true,
        legend: {
            x: 1,
            y: 1,
            xanchor: 'right',
            yanchor: 'top',
            orientation: 'h',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#CCC',
            borderwidth: 1,
            font: { family: 'Inter Tight, sans-serif' }
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        margin: { l: 80, r: 50, t: 80, b: 80 },
        font: { family: 'Inter Tight, sans-serif' }
    };

    // Config
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: [],
        doubleClick: 'reset'
    };

    // Plot
    Plotly.newPlot('volcanoPlotContainer', [traceNS, traceDown, traceUp], layout, config).then(() => {
        console.log('Volcano plot rendered successfully');
        
        // Add selection event listener
        const plotDiv = document.getElementById('volcanoPlotContainer');
        plotDiv.on('plotly_selected', function(eventData) {
            handlePlotSelection(eventData);
        });
        
        // Add deselect event listener
        plotDiv.on('plotly_deselect', function() {
            selectedGenes = [];
            console.log('Selection cleared');
        });
    }).catch(error => {
        console.error('Error rendering volcano plot:', error);
    });
}

// Handle plot selection events (lasso or box select)
function handlePlotSelection(eventData) {
    if (!eventData || !eventData.points || eventData.points.length === 0) {
        selectedGenes = [];
        console.log('No points selected');
        return;
    }
    
    // Extract selected genes from the event data
    selectedGenes = eventData.points.map(point => {
        // Get the gene name from the text property
        const geneName = point.text;
        const log2FC = point.x;
        const negLog10Padj = point.y;
        
        // Find the full data for this gene
        const geneData = processedPlotData.find(d => 
            d.gene === geneName && 
            Math.abs(d.log2FC - log2FC) < 0.0001 && 
            Math.abs(d.negLog10Padj - negLog10Padj) < 0.0001
        );
        
        return geneData || {
            gene: geneName,
            log2FC: log2FC,
            negLog10Padj: negLog10Padj,
            padj: Math.pow(10, -negLog10Padj)
        };
    });
    
    // Log selected genes to console
    console.log('=== SELECTED GENES ===');
    console.log(`Total selected: ${selectedGenes.length}`);
    console.log('Selected genes:', selectedGenes);
    console.table(selectedGenes.map(g => ({
        Gene: g.gene,
        log2FC: g.log2FC?.toFixed(3),
        'padj': g.padj?.toExponential(3),
        Category: g.category
    })));
}

// Show upload success state
function showUploadSuccess() {
    const uploadIcon = uploadBtn.querySelector('.material-symbols-outlined');
    
    // Quick transition in
    uploadBtn.style.transition = 'background 0.5s ease-in';
    uploadIcon.style.transition = 'all 0.5s ease-in';

    // Change to check icon and green background
    uploadIcon.textContent = 'check';
    uploadBtn.style.background = '#10b981';
    
    // Fade back after 1.5 seconds with slower transition
    setTimeout(() => {
        uploadBtn.style.transition = 'background 0.5s ease-out';
        uploadIcon.style.transition = 'all 0.5s ease-out';

        uploadIcon.textContent = 'upload';
        uploadBtn.style.background = '#0496FF';
    }, 1500);
}

// ============================================
// CHAT FUNCTIONALITY
// ============================================

// Check server health
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('Server status:', data);
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Add message to chat
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentP = document.createElement('p');
    contentP.innerHTML = formatMessageContent(content);
    
    messageDiv.appendChild(contentP);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message content with links, images, and markdown
function formatMessageContent(content) {
    // Convert markdown-style formatting
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Detect and format image URLs (especially STRING network images)
    formatted = formatted.replace(
        /\[Image of (.*?)\]\((https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp)[^\s\)]*)\)/gi,
        '<div class="image-container"><img src="$2" alt="$1" class="message-image" loading="lazy"><p class="image-caption">$1</p></div>'
    );
    
    // Detect standalone image URLs
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)[^\s]*)/gi,
        '<div class="image-container"><img src="$1" alt="Network visualization" class="message-image" loading="lazy"></div>'
    );
    
    // Format markdown-style links [text](url)
    formatted = formatted.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>'
    );
    
    // Format plain URLs (http/https)
    formatted = formatted.replace(
        /(?<!["'=])(https?:\/\/[^\s<]+)(?![^<]*>)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>'
    );
    
    return formatted;
}

// Add loading indicator
function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant generating';
    messageDiv.id = 'loading-message';
    
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'generating-indicator';
    indicatorDiv.innerHTML = `
        <span class="material-symbols-outlined">autorenew</span>
        <span>Generating</span>
    `;
    
    messageDiv.appendChild(indicatorDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove loading indicator
function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Send message to chat
async function sendMessage() {
    if (isProcessing) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    isProcessing = true;
    sendBtn.disabled = true;
    
    // Add user message
    addMessage('user', message);
    chatInput.value = '';
    
    // Add loading indicator
    addLoadingMessage();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory,
                selectedGenes: selectedGenes // Include selected genes in context
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response');
        }
        
        const data = await response.json();
        
        // Remove loading indicator
        removeLoadingMessage();
        
        // Add assistant response
        addMessage('assistant', data.response);
        
        // Update history
        chatHistory = data.history;
        
    } catch (error) {
        removeLoadingMessage();
        addMessage('assistant', 'Sorry, I encountered an error. Please make sure the server is running (use start-viz.ps1) and try again.');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Export data for external use
window.getDeaData = () => deaData;
window.getSelectedGenes = () => selectedGenes;
window.getProcessedPlotData = () => processedPlotData;
