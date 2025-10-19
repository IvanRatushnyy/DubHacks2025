let chatHistory = [];
let isProcessing = false;

// Check server health and update status
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (data.mcpConnected) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = `Connected (${data.availableTools} tools)`;
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'MCP Not Connected';
        }
    } catch (error) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Server Error';
    }
}

// Load available tools
async function loadTools() {
    try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        
        const toolsList = document.getElementById('tools-list');
        if (data.tools && data.tools.length > 0) {
            toolsList.innerHTML = data.tools.map(tool => 
                `<span class="tool-badge" title="${tool.description}">${tool.name}</span>`
            ).join('');
        } else {
            toolsList.innerHTML = '<span style="color: #6b7280;">No tools available</span>';
        }
    } catch (error) {
        console.error('Error loading tools:', error);
    }
}

// Add message to chat
function addMessage(role, content) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format the content with proper rendering for links, images, and markdown
    let formattedContent = formatMessageContent(content);
    
    contentDiv.innerHTML = formattedContent;
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="message-link">$1 <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M10.5 0h-9C.675 0 0 .675 0 1.5v9c0 .825.675 1.5 1.5 1.5h9c.825 0 1.5-.675 1.5-1.5v-9c0-.825-.675-1.5-1.5-1.5zM9 9H3V3h6v6z"/><path d="M6.5 5.5L9 3M9 3H7M9 3v2"/></svg></a>'
    );
    
    // Format plain URLs (http/https)
    formatted = formatted.replace(
        /(?<!["'=])(https?:\/\/[^\s<]+)(?![^<]*>)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1 <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M10.5 0h-9C.675 0 0 .675 0 1.5v9c0 .825.675 1.5 1.5 1.5h9c.825 0 1.5-.675 1.5-1.5v-9c0-.825-.675-1.5-1.5-1.5zM9 9H3V3h6v6z"/><path d="M6.5 5.5L9 3M9 3H7M9 3v2"/></svg></a>'
    );
    
    return formatted;
}

// Add loading indicator
function addLoadingMessage() {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'loading-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span class="loading"></span> <span class="loading"></span> <span class="loading"></span>';
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove loading indicator
function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Send message
async function sendMessage() {
    if (isProcessing) return;
    
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    isProcessing = true;
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;
    
    // Add user message
    addMessage('user', message);
    input.value = '';
    
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
                history: chatHistory
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
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        input.focus();
    }
}

// Handle Enter key
document.getElementById('message-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
document.getElementById('message-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

// Initialize
checkHealth();
loadTools();
setInterval(checkHealth, 10000); // Check every 10 seconds
