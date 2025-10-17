// API Configuration
const API_BASE = window.location.origin;

// Global state
let currentDraft = {
    accountId: null,
    messageId: null,
    to: null,
    subject: null,
    body: null,
    threadId: null
};

let currentEmails = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    loadStats();
    
    // Enable Enter to send (Shift+Enter for new line)
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Enable Enter to refine draft
    document.getElementById('refinement-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            refineDraft();
        }
    });
});

// Load accounts
async function loadAccounts() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        
        const accountsList = document.getElementById('accounts-list');
        accountsList.innerHTML = '';
        
        if (data.accounts.length === 0) {
            accountsList.innerHTML = '<p style="color: #888; font-size: 13px;">No accounts added yet</p>';
        } else {
            data.accounts.forEach(account => {
                const accountDiv = document.createElement('div');
                accountDiv.className = 'account-item';
                accountDiv.innerHTML = `
                    <span class="account-email" title="${account.email}">${account.email}</span>
                    <button class="btn-remove-account" onclick="removeAccount('${account.account_id}')">×</button>
                `;
                accountsList.appendChild(accountDiv);
            });
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        document.getElementById('accounts-count').textContent = data.accounts_count;
        document.getElementById('emails-count').textContent = data.emails_indexed;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Add account
async function addAccount() {
    const accountId = prompt('Enter a unique ID for this account (e.g., "personal", "work"):');
    if (!accountId) return;
    
    addAssistantMessage('Opening browser for authentication. Please log in to your Gmail account...');
    
    try {
        const response = await fetch(`${API_BASE}/accounts/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addAssistantMessage(`✅ Successfully added account: ${data.email}`);
            loadAccounts();
            loadStats();
            
            // Fetch initial emails
            fetchEmails(accountId);
        } else {
            addAssistantMessage(`❌ Failed to add account: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        addAssistantMessage(`❌ Error adding account: ${error.message}`);
    }
}

// Remove account
async function removeAccount(accountId) {
    if (!confirm('Are you sure you want to remove this account?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            addAssistantMessage(`✅ Account removed successfully`);
            loadAccounts();
            loadStats();
        }
    } catch (error) {
        addAssistantMessage(`❌ Error removing account: ${error.message}`);
    }
}

// Fetch emails
async function fetchEmails(accountId, maxResults = 20) {
    addAssistantMessage(`📥 Fetching recent emails from ${accountId}...`);
    
    try {
        const response = await fetch(`${API_BASE}/emails/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                account_id: accountId,
                max_results: maxResults
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentEmails = data.emails;
            displayEmails(data.emails);
            loadStats();
        }
    } catch (error) {
        addAssistantMessage(`❌ Error fetching emails: ${error.message}`);
    }
}

// Display emails
function displayEmails(emails) {
    if (emails.length === 0) {
        addAssistantMessage('No emails found.');
        return;
    }
    
    let html = `<div class="email-list">`;
    html += `<p><strong>Found ${emails.length} emails:</strong></p>`;
    
    emails.slice(0, 5).forEach(email => {
        html += `
            <div class="email-item">
                <div class="email-item-header">
                    <span class="email-from">${escapeHtml(email.from)}</span>
                    <span class="email-date">${escapeHtml(email.date)}</span>
                </div>
                <div class="email-subject">${escapeHtml(email.subject)}</div>
                <div class="email-snippet">${escapeHtml(email.snippet)}</div>
                <button class="btn-draft-reply" onclick="startDraftReply('${email.account_id}', '${email.id}')">
                    Draft Reply
                </button>
            </div>
        `;
    });
    
    html += `</div>`;
    
    addAssistantMessage(html, true);
}

// Send message
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addUserMessage(message);
    input.value = '';
    
    // Show loading
    addLoadingMessage();
    
    // Process the message
    await processMessage(message);
    
    // Remove loading
    removeLoadingMessage();
}

// Process message
async function processMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check if it's a question
    if (lowerMessage.includes('?') || lowerMessage.startsWith('what') || 
        lowerMessage.startsWith('when') || lowerMessage.startsWith('who') ||
        lowerMessage.startsWith('show') || lowerMessage.startsWith('find')) {
        
        await askQuestion(message);
    }
    // Check if it's a draft request
    else if (lowerMessage.includes('draft') || lowerMessage.includes('reply')) {
        addAssistantMessage('Please select an email from the list above to draft a reply, or provide more specific instructions.');
    }
    // Check if it's a compose request
    else if (lowerMessage.includes('compose') || lowerMessage.includes('write') || 
             lowerMessage.includes('send email')) {
        await composeEmail(message);
    }
    // Check if it's a fetch request
    else if (lowerMessage.includes('fetch') || lowerMessage.includes('get emails')) {
        const accounts = await getAccounts();
        if (accounts.length > 0) {
            fetchEmails(accounts[0].account_id);
        } else {
            addAssistantMessage('Please add an account first.');
        }
    }
    else {
        await askQuestion(message);
    }
}

// Ask question
async function askQuestion(question) {
    try {
        const response = await fetch(`${API_BASE}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addAssistantMessage(data.answer);
            
            // Show sources if available
            if (data.sources && data.sources.length > 0) {
                let sourcesHtml = '<div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 8px;">';
                sourcesHtml += '<p style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Sources:</strong></p>';
                
                data.sources.slice(0, 3).forEach(source => {
                    const meta = source.metadata;
                    sourcesHtml += `<p style="font-size: 12px; color: #888; margin-bottom: 5px;">• ${escapeHtml(meta.subject)} - ${escapeHtml(meta.from)}</p>`;
                });
                
                sourcesHtml += '</div>';
                addAssistantMessage(sourcesHtml, true);
            }
        }
    } catch (error) {
        addAssistantMessage(`❌ Error: ${error.message}`);
    }
}

// Compose email
async function composeEmail(instruction) {
    try {
        const response = await fetch(`${API_BASE}/emails/compose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instruction })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Get accounts
            const accounts = await getAccounts();
            if (accounts.length === 0) {
                addAssistantMessage('Please add an account first to send emails.');
                return;
            }
            
            // Open draft modal
            currentDraft = {
                accountId: accounts[0].account_id,
                messageId: null,
                to: '',
                subject: data.subject,
                body: data.body,
                threadId: null
            };
            
            openDraftModal();
        }
    } catch (error) {
        addAssistantMessage(`❌ Error: ${error.message}`);
    }
}

// Start draft reply
async function startDraftReply(accountId, messageId) {
    const instruction = prompt('How should I reply? (e.g., "Say I\'m interested and ask for more details")');
    if (!instruction) return;
    
    addUserMessage(`Draft a reply: ${instruction}`);
    addLoadingMessage();
    
    try {
        const response = await fetch(`${API_BASE}/emails/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: accountId,
                message_id: messageId,
                instruction: instruction
            })
        });
        
        const data = await response.json();
        
        removeLoadingMessage();
        
        if (data.success) {
            const originalEmail = data.original_email;
            
            currentDraft = {
                accountId: accountId,
                messageId: messageId,
                to: originalEmail.from,
                subject: originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`,
                body: data.draft,
                threadId: originalEmail.thread_id
            };
            
            addAssistantMessage('✅ Draft created! Opening editor...');
            openDraftModal();
        }
    } catch (error) {
        removeLoadingMessage();
        addAssistantMessage(`❌ Error: ${error.message}`);
    }
}

// Open draft modal
function openDraftModal() {
    document.getElementById('draft-to').textContent = currentDraft.to;
    document.getElementById('draft-subject').textContent = currentDraft.subject;
    document.getElementById('draft-body').value = currentDraft.body;
    document.getElementById('refinement-input').value = '';
    
    document.getElementById('draft-modal').classList.add('active');
}

// Close draft modal
function closeDraftModal() {
    document.getElementById('draft-modal').classList.remove('active');
}

// Refine draft
async function refineDraft() {
    const refinementInput = document.getElementById('refinement-input');
    const instruction = refinementInput.value.trim();
    
    if (!instruction) return;
    
    refinementInput.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/emails/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: currentDraft.accountId,
                message_id: currentDraft.messageId || 'new',
                instruction: instruction,
                previous_draft: document.getElementById('draft-body').value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentDraft.body = data.draft;
            document.getElementById('draft-body').value = data.draft;
            refinementInput.value = '';
        }
    } catch (error) {
        alert(`Error refining draft: ${error.message}`);
    } finally {
        refinementInput.disabled = false;
    }
}

// Send draft
async function sendDraft() {
    // Update body from textarea
    currentDraft.body = document.getElementById('draft-body').value;
    
    // Get recipient if not set
    if (!currentDraft.to) {
        currentDraft.to = prompt('Enter recipient email address:');
        if (!currentDraft.to) return;
    }
    
    if (!confirm(`Send email to ${currentDraft.to}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: currentDraft.accountId,
                to: currentDraft.to,
                subject: currentDraft.subject,
                body: currentDraft.body,
                thread_id: currentDraft.threadId,
                message_id: currentDraft.messageId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeDraftModal();
            addAssistantMessage(`✅ Email sent successfully to ${currentDraft.to}!`);
        } else {
            alert('Failed to send email');
        }
    } catch (error) {
        alert(`Error sending email: ${error.message}`);
    }
}

// Get accounts
async function getAccounts() {
    try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        return data.accounts;
    } catch (error) {
        return [];
    }
}

// UI Helper functions
function addUserMessage(text) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addAssistantMessage(text, isHtml = false) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    if (isHtml) {
        messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
    } else {
        messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addLoadingMessage() {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant loading-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <span class="loading"></span>
            <span class="loading"></span>
            <span class="loading"></span>
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeLoadingMessage() {
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

