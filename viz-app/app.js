// Global data storage
let deaData = null;
let processedPlotData = null; // Store processed data for selection
let selectedGenes = []; // Store selected genes

// Chat state
let chatHistory = [];
let isProcessing = false;

// Context variable - structured JSON for AI chat context
let context = {
    "selection": null,
    "disease-type": null,
    "comparison-groups": null
};

// Context pills state (for UI management)
let contextPillsState = {
    selection: { active: false },
    cancerType: { active: false, value: 'Lung' },
    comparison: { active: false, value: 'Adenocarcinoma vs. Squamous Cell Carcinoma' }
};

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
    
    // Initialize context pills
    initializeContextPills();
    
    // Clear placeholder messages
    chatMessages.innerHTML = '';
    addMessage('assistant', 'Hello! I\'m your bioinformatics assistant. Upload a CSV file with DEA results to start exploring, I can answer any questions about your data!');
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
    
    // Parse filename for disease type and comparison groups
    parseFilenameForContext(file.name);
    
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

// Parse filename to extract disease type and comparison groups
// Expected format: diseaseType_groupA_vs_groupB.csv
// Example: lung_adenocarcinoma_vs_squamous_cell_carcinoma.csv
function parseFilenameForContext(filename) {
    const cancerTypePill = document.getElementById('cancerTypePill');
    const comparisonPill = document.getElementById('comparisonPill');
    
    // Remove .csv extension
    const nameWithoutExt = filename.replace('.csv', '');
    
    // Check if filename contains underscores (indicating it might be in the expected format)
    if (!nameWithoutExt.includes('_')) {
        console.log('Filename not in expected format - pills will remain empty');
        clearPills(cancerTypePill, comparisonPill);
        return;
    }
    
    // Split by underscore
    const parts = nameWithoutExt.split('_');
    
    // Check if we have at least 4 parts and contains 'vs'
    const vsIndex = parts.findIndex(p => p.toLowerCase() === 'vs');
    
    if (vsIndex === -1 || vsIndex === 0 || vsIndex === parts.length - 1) {
        console.log('Filename not in expected format (no valid "vs" separator) - pills will remain empty');
        clearPills(cancerTypePill, comparisonPill);
        return;
    }
    
    // Disease type: everything before 'vs' (excluding the last part before 'vs')
    const diseaseTypeParts = parts.slice(0, vsIndex - 1);
    
    // If no disease type parts, format is invalid
    if (diseaseTypeParts.length === 0) {
        console.log('Filename not in expected format (no disease type) - pills will remain empty');
        clearPills(cancerTypePill, comparisonPill);
        return;
    }
    
    const diseaseType = diseaseTypeParts.join(' ').replace(/\b\w/g, c => c.toUpperCase());
    
    // Group A: part before 'vs'
    const groupA = parts[vsIndex - 1].replace(/\b\w/g, c => c.toUpperCase());
    
    // Group B: everything after 'vs'
    const groupBParts = parts.slice(vsIndex + 1);
    const groupB = groupBParts.join(' ').replace(/\b\w/g, c => c.toUpperCase());
    
    // Comparison text: "Group A vs. Group B"
    const comparisonText = `${groupA} vs. ${groupB}`;
    
    console.log('Parsed filename:', { diseaseType, groupA, groupB, comparisonText });
    
    // Update the pills
    if (cancerTypePill && diseaseType) {
        const input = cancerTypePill.querySelector('.pill-input');
        input.value = diseaseType;
        contextPillsState.cancerType.value = diseaseType;
        autoResizeInput(input);
    }
    
    if (comparisonPill && comparisonText) {
        const input = comparisonPill.querySelector('.pill-input');
        input.value = comparisonText;
        contextPillsState.comparison.value = comparisonText;
        autoResizeInput(input);
        
        // Update volcano plot title if data is already loaded
        if (deaData && deaData.length > 0) {
            updateVolcanoPlotTitle(comparisonText);
        }
    }
    
    // Update disabled states
    updatePillDisabledStates();
}

// Helper function to clear pill values
function clearPills(cancerTypePill, comparisonPill) {
    if (cancerTypePill) {
        const input = cancerTypePill.querySelector('.pill-input');
        input.value = '';
        contextPillsState.cancerType.value = '';
        autoResizeInput(input);
    }
    
    if (comparisonPill) {
        const input = comparisonPill.querySelector('.pill-input');
        input.value = '';
        contextPillsState.comparison.value = '';
        autoResizeInput(input);
    }
    
    // Update disabled states to grey out the pills
    updatePillDisabledStates();
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
            <div class="threshold-inputs">
                <div class="threshold-input-group">
                    <label for="log2fcThreshold">log2FC</label>
                    <input type="number" id="log2fcThreshold" value="2.0" step="0.1" min="0" />
                </div>
                <div class="threshold-input-group">
                    <label for="pvalThreshold">-log10(p)</label>
                    <input type="number" id="pvalThreshold" value="2" step="0.1" min="0" />
                </div>
            </div>
        </div>
        
        <div id="volcanoPlotContainer" style="width: 100%; height: calc(100vh - 180px);"></div>
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
            text: contextPillsState.comparison.value 
                ? `${contextPillsState.comparison.value}` 
                : 'Differential Expression Analysis',
            font: { size: 20, family: 'Inter Tight, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' },
            y: 0.942
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
        
        // Set default drag mode to box select
        const plotDiv = document.getElementById('volcanoPlotContainer');
        Plotly.relayout(plotDiv, { dragmode: 'select' });
        
        // Show context pills container when plot is created
        const pillsContainer = document.querySelector('.pills-scroll-container');
        if (pillsContainer) {
            pillsContainer.classList.add('visible');
        }
        
        // Add selection and deselection event listeners
        plotDiv.on('plotly_selected', function(eventData) {
            handlePlotSelection(eventData);
        });
        
        plotDiv.on('plotly_deselect', function() {
            selectedGenes = [];
            console.log('Selection cleared');
            updateSelectionPill();
            autoDeselectSelectionPill();
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
        
        // Auto-deselect the selection pill and clear context
        autoDeselectSelectionPill();
        
        // Update disabled states
        updatePillDisabledStates();
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
            padj: Math.pow(10, -negLog10Padj),
            category: 'Unknown',
            isSignificant: false
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
    
    // Update selection pill
    updateSelectionPill();
    
    // Update disabled states
    updatePillDisabledStates();
    
    // If selection pill is active, update context immediately
    if (contextPillsState.selection.active) {
        updateSelectionContext();
    }
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
// CONTEXT PILLS FUNCTIONALITY
// ============================================

function initializeContextPills() {
    const selectionPill = document.getElementById('selectionPill');
    const cancerTypePill = document.getElementById('cancerTypePill');
    const comparisonPill = document.getElementById('comparisonPill');
    
    // Selection pill click handler - only trigger on icon click
    selectionPill.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill-action')) {
            togglePill(selectionPill, 'selection');
        }
    });
    
    // Disease type pill handlers - only trigger on icon click
    cancerTypePill.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill-action')) {
            togglePill(cancerTypePill, 'cancerType');
        }
    });
    
    const cancerTypeInput = cancerTypePill.querySelector('.pill-input');
    cancerTypeInput.addEventListener('input', (e) => {
        contextPillsState.cancerType.value = e.target.value;
        autoResizeInput(e.target);
        updatePillDisabledStates(); // Update disabled state when input changes
        
        // Update context if pill is active
        if (contextPillsState.cancerType.active) {
            context["disease-type"] = e.target.value;
            console.log('Disease-type context updated:', context["disease-type"]);
        }
    });
    
    // Comparison pill handlers - only trigger on icon click
    comparisonPill.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill-action')) {
            togglePill(comparisonPill, 'comparison');
        }
    });
    
    const comparisonInput = comparisonPill.querySelector('.pill-input');
    comparisonInput.addEventListener('input', (e) => {
        contextPillsState.comparison.value = e.target.value;
        autoResizeInput(e.target);
        updateVolcanoPlotTitle(e.target.value);
        updatePillDisabledStates(); // Update disabled state when input changes
        
        // Update context if pill is active
        if (contextPillsState.comparison.active) {
            context["comparison-groups"] = e.target.value;
            console.log('Comparison-groups context updated:', context["comparison-groups"]);
        }
    });
    
    // Initialize input widths
    autoResizeInput(cancerTypeInput);
    autoResizeInput(comparisonInput);
    
    // Initialize disabled states
    updatePillDisabledStates();
}

function togglePill(pillElement, type) {
    // Check if pill is disabled
    if (pillElement.classList.contains('disabled')) {
        console.log(`Cannot toggle ${type} pill - disabled (no data available)`);
        return;
    }
    
    const isSelected = pillElement.classList.contains('selected');
    const actionIcon = pillElement.querySelector('.pill-action');
    
    // Special handling for selection pill - don't allow selection if no genes
    if (type === 'selection' && !isSelected && selectedGenes.length === 0) {
        console.log('Cannot select - no genes selected on plot');
        return;
    }
    
    if (isSelected) {
        // Deselect
        pillElement.classList.remove('selected');
        pillElement.classList.add('deselected');
        actionIcon.textContent = 'add';
        contextPillsState[type].active = false;
        
        // Clear context based on type
        if (type === 'selection') {
            context["selection"] = null;
            console.log('Selection pill deselected');
        } else if (type === 'cancerType') {
            context["disease-type"] = null;
            console.log('Disease-type context cleared');
        } else if (type === 'comparison') {
            context["comparison-groups"] = null;
            console.log('Comparison-groups context cleared');
        }
    } else {
        // Select
        pillElement.classList.remove('deselected');
        pillElement.classList.add('selected');
        actionIcon.textContent = 'close';
        contextPillsState[type].active = true;
        
        // Add to context based on type
        if (type === 'selection') {
            updateSelectionContext();
        } else if (type === 'cancerType') {
            context["disease-type"] = contextPillsState.cancerType.value;
            console.log('Disease-type context updated:', context["disease-type"]);
        } else if (type === 'comparison') {
            context["comparison-groups"] = contextPillsState.comparison.value;
            console.log('Comparison-groups context updated:', context["comparison-groups"]);
        }
    }
    
    console.log('=== CONTEXT VARIABLE ===');
    console.log(JSON.stringify(context, null, 2));
}

function updateSelectionContext() {
    if (selectedGenes.length > 0) {
        // Format genes for context (matching the structure you provided)
        context["selection"] = selectedGenes.map(g => ({
            gene: g.gene,
            log2FC: g.log2FC,
            padj: g.padj,
            negLog10Padj: g.negLog10Padj,
            category: g.category,
            isSignificant: g.isSignificant
        }));
        console.log('Selection context updated with', selectedGenes.length, 'genes');
        console.log(JSON.stringify(context["selection"], null, 2));
    } else {
        context["selection"] = null;
        console.log('Selection context cleared - no genes selected');
    }
}

function autoDeselectSelectionPill() {
    const selectionPill = document.getElementById('selectionPill');
    if (!selectionPill) return;
    
    const isSelected = selectionPill.classList.contains('selected');
    if (isSelected) {
        const actionIcon = selectionPill.querySelector('.pill-action');
        selectionPill.classList.remove('selected');
        selectionPill.classList.add('deselected');
        actionIcon.textContent = 'add';
        contextPillsState.selection.active = false;
    }
    
    // Clear selection context
    context["selection"] = null;
    console.log('Selection pill auto-deselected - no points selected');
    console.log('=== CONTEXT VARIABLE ===');
    console.log(JSON.stringify(context, null, 2));
}

function autoResizeInput(input) {
    // Create temporary span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.font = window.getComputedStyle(input).font;
    span.textContent = input.value || input.placeholder;
    document.body.appendChild(span);
    
    const width = span.offsetWidth + 4; // Add minimal padding
    input.style.width = Math.max(width, 30) + 'px'; // Reduced from 40px to 30px
    
    document.body.removeChild(span);
}

function updatePillDisabledStates() {
    const selectionPill = document.getElementById('selectionPill');
    const cancerTypePill = document.getElementById('cancerTypePill');
    const comparisonPill = document.getElementById('comparisonPill');
    
    if (!selectionPill || !cancerTypePill || !comparisonPill) return;
    
    // Selection pill: disabled if no genes selected
    if (selectedGenes.length === 0) {
        selectionPill.classList.add('disabled');
        selectionPill.classList.remove('selected', 'deselected');
    } else {
        selectionPill.classList.remove('disabled');
        // Restore to deselected state if it was disabled
        if (!selectionPill.classList.contains('selected')) {
            selectionPill.classList.add('deselected');
        }
    }
    
    // Cancer type pill: disabled if input is empty
    const cancerTypeInput = cancerTypePill.querySelector('.pill-input');
    if (!cancerTypeInput.value.trim()) {
        cancerTypePill.classList.add('disabled');
        cancerTypePill.classList.remove('selected', 'deselected');
    } else {
        cancerTypePill.classList.remove('disabled');
        if (!cancerTypePill.classList.contains('selected')) {
            cancerTypePill.classList.add('deselected');
        }
    }
    
    // Comparison pill: disabled if input is empty
    const comparisonInput = comparisonPill.querySelector('.pill-input');
    if (!comparisonInput.value.trim()) {
        comparisonPill.classList.add('disabled');
        comparisonPill.classList.remove('selected', 'deselected');
    } else {
        comparisonPill.classList.remove('disabled');
        if (!comparisonPill.classList.contains('selected')) {
            comparisonPill.classList.add('deselected');
        }
    }
}

function updateSelectionPill() {
    const selectionPill = document.getElementById('selectionPill');
    if (!selectionPill) return;
    
    const pillText = selectionPill.querySelector('.pill-text');
    const count = selectedGenes.length;
    
    pillText.textContent = `Selection: ${count} gene${count !== 1 ? 's' : ''}`;
}

function updateVolcanoPlotTitle(comparisonText) {
    // Update the volcano plot title if it exists
    const plotDiv = document.getElementById('volcanoPlotContainer');
    if (plotDiv && typeof Plotly !== 'undefined') {
        Plotly.relayout(plotDiv, {
            'title.text': comparisonText
        });
    }
}

function getContextForChat() {
    // Check if any context is active
    const hasSelection = context["selection"] !== null && Array.isArray(context["selection"]) && context["selection"].length > 0;
    const hasDiseaseType = context["disease-type"] !== null;
    const hasComparison = context["comparison-groups"] !== null;
    
    if (hasSelection || hasDiseaseType || hasComparison) {
        return {
            "selection": context["selection"],
            "disease-type": context["disease-type"],
            "comparison-groups": context["comparison-groups"]
        };
    }
    
    return null;
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
    // Convert markdown-style formatting (but preserve image syntax)
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Handle markdown linked images: [![alt](image_url)](link_url)
    formatted = formatted.replace(
        /\[!\[([^\]]*)\]\((https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp)[^\s\)]*)\)\]\((https?:\/\/[^\s\)]+)\)/gi,
        '<div class="image-container"><a href="$3" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1" class="message-image" loading="lazy"></a></div>'
    );
    
    // Handle standard markdown images: ![alt](image_url)
    formatted = formatted.replace(
        /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp)[^\s\)]*)\)/gi,
        '<div class="image-container"><img src="$2" alt="$1" class="message-image" loading="lazy"></div>'
    );
    
    // Detect and format image URLs with descriptive text like "Image of X"
    formatted = formatted.replace(
        /\[Image of (.*?)\]\((https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp)[^\s\)]*)\)/gi,
        '<div class="image-container"><img src="$2" alt="$1" class="message-image" loading="lazy"></div>'
    );
    
    // Detect standalone image URLs
    formatted = formatted.replace(
        /(?<!["'=src])(https?:\/\/[^\s<]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<]*)?)/gi,
        '<div class="image-container"><img src="$1" alt="Network visualization" class="message-image" loading="lazy"></div>'
    );
    
    // Format markdown-style links [text](url) - must come after image processing
    formatted = formatted.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>'
    );
    
    // Format plain URLs (http/https) - must come last
    formatted = formatted.replace(
        /(?<!["'=src])(https?:\/\/[^\s<]+)(?![^<]*>|[^<]*<\/a>)/g,
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
    
    // Get active context from pills
    const pillContext = getContextForChat();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory,
                selectedGenes: selectedGenes, // Include selected genes in context
                context: pillContext // Include active pill context
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
