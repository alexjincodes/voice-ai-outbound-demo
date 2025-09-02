// Professional Call Analytics Dashboard JavaScript

// Configuration - Loaded from server
let DASHBOARD_CONFIG = {
    vapiApiKey: '',
    vapiBaseUrl: 'https://api.vapi.ai',
    vapiAssistantId: '',
    vapiPhoneNumberId: '',
    refreshInterval: 30000 // 30 seconds
};

// Load configuration from server
async function loadDashboardConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        DASHBOARD_CONFIG.vapiApiKey = config.vapi.apiKey;
        DASHBOARD_CONFIG.vapiBaseUrl = config.vapi.baseUrl;
        DASHBOARD_CONFIG.vapiAssistantId = config.vapi.assistantId;
        DASHBOARD_CONFIG.vapiPhoneNumberId = config.vapi.phoneNumberId;
        
        console.log('Dashboard configuration loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load dashboard configuration:', error);
        return false;
    }
}

// Global state
let callsData = [];
let filteredCalls = [];
let currentCallId = null;
let refreshTimer = null;

// Bulk calling state
let contactLists = [];
let currentContactList = null;
let activeCampaigns = [];
let currentCampaign = null;

// DOM Elements
const totalCallsEl = document.getElementById('totalCalls');
const avgDurationEl = document.getElementById('avgDuration');
const successRateEl = document.getElementById('successRate');
const todayCallsEl = document.getElementById('todayCalls');
const callsListEl = document.getElementById('callsList');
const statusFilterEl = document.getElementById('statusFilter');
const dateFilterEl = document.getElementById('dateFilter');
const callModal = document.getElementById('callModal');
const refreshBtn = document.getElementById('refreshData');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard initializing...');
    
    // Load configuration first
    const configLoaded = await loadDashboardConfig();
    if (!configLoaded) {
        showToast('Failed to load configuration', 'error');
    }
    
    initializeDashboard();
    setupEventListeners();
    loadCallData();
    loadContactLists();
    loadCampaigns();
    startAutoRefresh();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('loading');
        loadCallData().finally(() => {
            refreshBtn.classList.remove('loading');
        });
    });

    // Filters
    statusFilterEl.addEventListener('change', applyFilters);
    dateFilterEl.addEventListener('change', applyFilters);

    // Modal close
    window.addEventListener('click', (event) => {
        if (event.target === callModal) {
            closeModal();
        }
    });

    // Tag input
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                addTag(e.target.value.trim());
                e.target.value = '';
            }
        });
    }
}

// Initialize Dashboard
function initializeDashboard() {
    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    dateFilterEl.value = today;
    
    showToast('Dashboard initialized successfully', 'success');
}

// Load Call Data from VAPI
async function loadCallData() {
    try {
        console.log('Loading call data from VAPI...');
        
        const response = await fetch(`${DASHBOARD_CONFIG.vapiBaseUrl}/call`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${DASHBOARD_CONFIG.vapiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load calls: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        callsData = Array.isArray(data) ? data : [];
        
        console.log(`Loaded ${callsData.length} calls from VAPI`);
        
        // If no data from API, use sample data for demo
        if (callsData.length === 0) {
            callsData = generateSampleData();
            console.log('Using sample data for demo');
        }
        
        applyFilters();
        updateStats();
        showToast(`Loaded ${callsData.length} calls`, 'success');
        
    } catch (error) {
        console.error('Error loading call data:', error);
        
        // Use sample data as fallback
        callsData = generateSampleData();
        applyFilters();
        updateStats();
        showToast('Using sample data - check API connection', 'error');
    }
}

// Generate Sample Data (for demo purposes)
function generateSampleData() {
    const sampleCalls = [
        {
            id: '1',
            customerNumber: '+1234567890',
            customerName: 'John Smith',
            duration: 245,
            status: 'completed',
            createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            endedAt: new Date(Date.now() - 3595000).toISOString(),
            assistantId: 'assistant-1',
            transcript: 'Agent: Hello, this is Sarah from ABC Company. How are you today?\nCustomer: Hi Sarah, I\'m doing well, thank you.\nAgent: Great! I\'m calling to tell you about our new product line...\nCustomer: That sounds interesting. Can you tell me more?\nAgent: Absolutely! Our new product offers amazing features that can help streamline your business processes...',
            summary: 'Successful product introduction call with interested customer',
            outcome: 'appointment_scheduled',
            nextActions: 'Follow up with product demo on Friday at 2 PM'
        },
        {
            id: '2',
            customerNumber: '+1987654321',
            customerName: 'Jane Doe',
            duration: 180,
            status: 'completed',
            createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            endedAt: new Date(Date.now() - 7020000).toISOString(),
            assistantId: 'assistant-1',
            transcript: 'Agent: Hello, this is Sarah from ABC Company.\nCustomer: I\'m not interested in any sales calls.\nAgent: I understand, but this is actually about a service you inquired about last week.\nCustomer: Oh, which service was that?\nAgent: The consultation service for business optimization...',
            summary: 'Customer initially resistant but became interested in consultation',
            outcome: 'information_provided',
            nextActions: 'Send information packet via email'
        },
        {
            id: '3',
            customerNumber: '+1555666777',
            customerName: 'Mike Johnson',
            duration: 0,
            status: 'failed',
            createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
            endedAt: new Date(Date.now() - 10800000).toISOString(),
            assistantId: 'assistant-1',
            transcript: '',
            summary: 'Call failed - no answer',
            outcome: 'callback_requested',
            nextActions: 'Retry call tomorrow afternoon'
        }
    ];
    return sampleCalls;
}

// Apply Filters
function applyFilters() {
    const statusFilter = statusFilterEl.value;
    const dateFilter = dateFilterEl.value;
    
    filteredCalls = callsData.filter(call => {
        // Status filter
        if (statusFilter !== 'all' && call.status !== statusFilter) {
            return false;
        }
        
        // Date filter
        if (dateFilter) {
            const callDate = new Date(call.createdAt).toISOString().split('T')[0];
            if (callDate !== dateFilter) {
                return false;
            }
        }
        
        return true;
    });
    
    renderCallsList();
}

// Update Statistics
function updateStats() {
    const totalCalls = callsData.length;
    const completedCalls = callsData.filter(call => call.status === 'completed');
    const todayCalls = callsData.filter(call => {
        const today = new Date().toISOString().split('T')[0];
        const callDate = new Date(call.createdAt).toISOString().split('T')[0];
        return callDate === today;
    });
    
    // Total calls
    totalCallsEl.textContent = totalCalls;
    
    // Average duration
    const avgDuration = completedCalls.length > 0 
        ? Math.round(completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCalls.length)
        : 0;
    avgDurationEl.textContent = formatDuration(avgDuration);
    
    // Success rate
    const successRate = totalCalls > 0 
        ? Math.round((completedCalls.length / totalCalls) * 100)
        : 0;
    successRateEl.textContent = `${successRate}%`;
    
    // Today's calls
    todayCallsEl.textContent = todayCalls.length;
}

// Render Calls List
function renderCallsList() {
    if (filteredCalls.length === 0) {
        callsListEl.innerHTML = `
            <div class="call-item" style="text-align: center; padding: 2rem;">
                <p style="color: #6b7280; font-size: 1.1rem;">No calls found matching your filters</p>
                <p style="color: #9ca3af; font-size: 0.9rem; margin-top: 0.5rem;">Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }
    
    const callsHtml = filteredCalls.map(call => `
        <div class="call-item" onclick="openCallDetails('${call.id}')">
            <div class="call-header">
                <div class="call-info">
                    <h4>${call.customerName || 'Unknown Customer'}</h4>
                    <p>${call.customerNumber}</p>
                </div>
                <div class="call-meta">
                    <span class="status-badge status-${call.status}">${call.status}</span>
                    <span class="call-duration">${formatDuration(call.duration || 0)}</span>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #6b7280;">
                <span>${formatDateTime(call.createdAt)}</span>
                <span>Click to view details →</span>
            </div>
        </div>
    `).join('');
    
    callsListEl.innerHTML = callsHtml;
}

// Open Call Details Modal
function openCallDetails(callId) {
    currentCallId = callId;
    const call = callsData.find(c => c.id === callId);
    
    if (!call) {
        showToast('Call not found', 'error');
        return;
    }
    
    // Populate modal with call data
    populateCallModal(call);
    
    // Show modal
    callModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Populate Call Modal
function populateCallModal(call) {
    // Basic info
    document.getElementById('customerName').value = call.customerName || '';
    document.getElementById('customerPhone').textContent = call.customerNumber || '';
    document.getElementById('callDuration').textContent = formatDuration(call.duration || 0);
    document.getElementById('callStatus').textContent = call.status || '';
    document.getElementById('callStatus').className = `status-badge status-${call.status || 'unknown'}`;
    document.getElementById('callDateTime').textContent = formatDateTime(call.createdAt);
    document.getElementById('agentName').textContent = 'AI Assistant Sarah';
    
    // Summary and outcome
    document.getElementById('mainSummary').value = call.summary || '';
    document.getElementById('callOutcome').value = call.outcome || '';
    document.getElementById('callPriority').value = call.priority || 'medium';
    document.getElementById('nextActions').value = call.nextActions || '';
    
    // Follow-up date
    const followupDate = call.followupDate ? new Date(call.followupDate).toISOString().split('T')[0] : '';
    document.getElementById('followupDate').value = followupDate;
    
    // Transcription
    const transcriptionEl = document.getElementById('transcriptionContent');
    transcriptionEl.innerHTML = call.transcript 
        ? `<pre>${call.transcript}</pre>`
        : '<p style="color: #6b7280; font-style: italic;">No transcription available for this call</p>';
    
    // Tags
    renderTags(call.tags || []);
}

// Close Modal
function closeModal() {
    callModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentCallId = null;
}

// Save Call Data
function saveCallData() {
    if (!currentCallId) return;
    
    const call = callsData.find(c => c.id === currentCallId);
    if (!call) return;
    
    // Get form data
    call.customerName = document.getElementById('customerName').value;
    call.summary = document.getElementById('mainSummary').value;
    call.outcome = document.getElementById('callOutcome').value;
    call.priority = document.getElementById('callPriority').value;
    call.nextActions = document.getElementById('nextActions').value;
    call.followupDate = document.getElementById('followupDate').value;
    
    // Save tags
    const tags = Array.from(document.querySelectorAll('.tag')).map(tag => 
        tag.textContent.replace('×', '').trim()
    );
    call.tags = tags;
    
    // Update display
    renderCallsList();
    showToast('Call data saved successfully', 'success');
    
    console.log('Saved call data:', call);
}

// Tags functionality
function renderTags(tags) {
    const tagsList = document.getElementById('tagsList');
    tagsList.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <span class="remove-tag" onclick="removeTag('${tag}')">&times;</span>
        </span>
    `).join('');
}

function addTag(tagText) {
    const tagsList = document.getElementById('tagsList');
    const existingTags = Array.from(tagsList.querySelectorAll('.tag')).map(tag => 
        tag.textContent.replace('×', '').trim()
    );
    
    if (!existingTags.includes(tagText)) {
        const tagHtml = `
            <span class="tag">
                ${tagText}
                <span class="remove-tag" onclick="removeTag('${tagText}')">&times;</span>
            </span>
        `;
        tagsList.insertAdjacentHTML('beforeend', tagHtml);
    }
}

function removeTag(tagText) {
    const tags = document.querySelectorAll('.tag');
    tags.forEach(tag => {
        if (tag.textContent.replace('×', '').trim() === tagText) {
            tag.remove();
        }
    });
}

// Export Transcription
function exportTranscription() {
    if (!currentCallId) return;
    
    const call = callsData.find(c => c.id === currentCallId);
    if (!call || !call.transcript) {
        showToast('No transcription to export', 'error');
        return;
    }
    
    const blob = new Blob([call.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-transcript-${call.id}-${formatDate(call.createdAt)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Transcription exported', 'success');
}

// Search Transcription
function searchTranscription() {
    const searchTerm = prompt('Enter search term:');
    if (!searchTerm) return;
    
    const transcriptionEl = document.getElementById('transcriptionContent');
    const content = transcriptionEl.textContent;
    
    if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
        // Highlight search term
        const highlightedContent = content.replace(
            new RegExp(searchTerm, 'gi'),
            `<mark>$&</mark>`
        );
        transcriptionEl.innerHTML = `<pre>${highlightedContent}</pre>`;
        showToast(`Found "${searchTerm}" in transcription`, 'success');
    } else {
        showToast(`"${searchTerm}" not found in transcription`, 'error');
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    refreshTimer = setInterval(() => {
        loadCallData();
    }, DASHBOARD_CONFIG.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// Utility Functions
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateString) {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// BULK CALLING & CONTACT MANAGEMENT FEATURES
// ============================================

// Tab Management
function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load data based on tab
    if (tabName === 'contacts') {
        renderContactLists();
    } else if (tabName === 'campaigns') {
        renderCampaigns();
    }
}

// Contact List Management
function loadContactLists() {
    // Load from localStorage or create sample data
    const stored = localStorage.getItem('contactLists');
    if (stored) {
        contactLists = JSON.parse(stored);
    } else {
        contactLists = [
            {
                id: 'list_1',
                name: 'Q1 2024 Prospects',
                description: 'High-value prospects for Q1 campaign',
                contacts: [
                    {
                        id: 'c1',
                        name: 'Alice Johnson',
                        phone: '+1234567890',
                        email: 'alice@example.com',
                        context: 'Interested in premium package, previous customer',
                        priority: 'high',
                        status: 'pending'
                    },
                    {
                        id: 'c2',
                        name: 'Bob Smith',
                        phone: '+1987654321',
                        email: 'bob@example.com',
                        context: 'New lead from website form, looking for basic plan',
                        priority: 'medium',
                        status: 'pending'
                    }
                ],
                createdAt: new Date().toISOString()
            }
        ];
        saveContactLists();
    }
}

function saveContactLists() {
    localStorage.setItem('contactLists', JSON.stringify(contactLists));
}

function renderContactLists() {
    const grid = document.getElementById('contactListsGrid');
    
    if (contactLists.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-address-book" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No Contact Lists</h3>
                <p>Upload a CSV file or add contacts manually to get started</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = contactLists.map(list => `
        <div class="contact-list-card" onclick="viewContactList('${list.id}')">
            <div class="list-header">
                <div class="list-info">
                    <h3>${list.name}</h3>
                    <p>${list.description || 'No description'}</p>
                </div>
                <div class="list-actions" onclick="event.stopPropagation()">
                    <button class="btn-secondary" onclick="deleteContactList('${list.id}')" style="padding: 0.5rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="list-stats">
                <div class="list-stat">
                    <span>${list.contacts.length}</span>
                    <label>Contacts</label>
                </div>
                <div class="list-stat">
                    <span>${list.contacts.filter(c => c.status === 'pending').length}</span>
                    <label>Pending</label>
                </div>
                <div class="list-stat">
                    <span>${list.contacts.filter(c => c.status === 'completed').length}</span>
                    <label>Called</label>
                </div>
            </div>
        </div>
    `).join('');
}

function viewContactList(listId) {
    currentContactList = contactLists.find(list => list.id === listId);
    if (!currentContactList) return;
    
    document.getElementById('contactListsGrid').style.display = 'none';
    document.getElementById('contactsTableSection').style.display = 'block';
    document.getElementById('contactListTitle').textContent = currentContactList.name;
    
    renderContactsTable();
}

function renderContactsTable() {
    const tbody = document.getElementById('contactsTableBody');
    
    tbody.innerHTML = currentContactList.contacts.map(contact => `
        <tr>
            <td><input type="checkbox" class="contact-checkbox" data-contact-id="${contact.id}"></td>
            <td>${contact.name}</td>
            <td>${contact.phone}</td>
            <td>${contact.email || '-'}</td>
            <td title="${contact.context}">${contact.context ? (contact.context.length > 50 ? contact.context.substring(0, 50) + '...' : contact.context) : '-'}</td>
            <td><span class="contact-status status-${contact.status}">${contact.status}</span></td>
            <td>
                <button class="btn-secondary" onclick="editContact('${contact.id}')" style="padding: 0.5rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="deleteContact('${contact.id}')" style="padding: 0.5rem; margin-left: 0.25rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function goBackToLists() {
    document.getElementById('contactListsGrid').style.display = 'grid';
    document.getElementById('contactsTableSection').style.display = 'none';
    currentContactList = null;
}

// CSV Upload Functions
function downloadTemplate() {
    const csvContent = "name,phone,email,context,priority\nJohn Doe,+1234567890,john@example.com,Interested in premium package,high\nJane Smith,+1987654321,jane@example.com,Previous customer follow-up,medium";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact-template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('csvFileInput').value = '';
    document.getElementById('listName').value = '';
    document.getElementById('uploadBtn').disabled = true;
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    document.getElementById('uploadArea').classList.add('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    document.getElementById('uploadArea').classList.remove('drag-over');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect({ target: { files } });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        document.getElementById('uploadBtn').disabled = false;
        showToast('CSV file selected. Enter a list name to continue.', 'success');
    } else {
        showToast('Please select a valid CSV file', 'error');
        document.getElementById('uploadBtn').disabled = true;
    }
}

function uploadContacts() {
    const fileInput = document.getElementById('csvFileInput');
    const listName = document.getElementById('listName').value.trim();
    
    if (!fileInput.files[0] || !listName) {
        showToast('Please select a CSV file and enter a list name', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].toLowerCase().split(',');
            
            // Validate required columns
            if (!headers.includes('name') || !headers.includes('phone')) {
                showToast('CSV must include "name" and "phone" columns', 'error');
                return;
            }
            
            const contacts = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = line.split(',');
                const contact = {
                    id: 'c_' + Date.now() + '_' + i,
                    name: values[headers.indexOf('name')] || '',
                    phone: values[headers.indexOf('phone')] || '',
                    email: values[headers.indexOf('email')] || '',
                    context: values[headers.indexOf('context')] || '',
                    priority: values[headers.indexOf('priority')] || 'medium',
                    status: 'pending'
                };
                
                if (contact.name && contact.phone) {
                    contacts.push(contact);
                }
            }
            
            if (contacts.length === 0) {
                showToast('No valid contacts found in CSV', 'error');
                return;
            }
            
            // Create new contact list
            const newList = {
                id: 'list_' + Date.now(),
                name: listName,
                description: `Uploaded ${contacts.length} contacts`,
                contacts: contacts,
                createdAt: new Date().toISOString()
            };
            
            contactLists.push(newList);
            saveContactLists();
            renderContactLists();
            closeUploadModal();
            
            showToast(`Successfully uploaded ${contacts.length} contacts to "${listName}"`, 'success');
            
        } catch (error) {
            showToast('Error parsing CSV file: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Add Contact Functions
function showAddContactModal() {
    // Populate contact list dropdown
    const select = document.getElementById('contactList');
    select.innerHTML = '<option value="">Select a list or create new</option>' +
        contactLists.map(list => `<option value="${list.id}">${list.name}</option>`).join('');
    
    document.getElementById('addContactModal').style.display = 'block';
}

function closeAddContactModal() {
    document.getElementById('addContactModal').style.display = 'none';
    // Reset form
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactContext').value = '';
    document.getElementById('contactPriority').value = 'medium';
    document.getElementById('contactList').value = '';
    document.getElementById('newListName').value = '';
}

function addContact() {
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const context = document.getElementById('contactContext').value.trim();
    const priority = document.getElementById('contactPriority').value;
    const listId = document.getElementById('contactList').value;
    const newListName = document.getElementById('newListName').value.trim();
    
    if (!name || !phone) {
        showToast('Name and phone number are required', 'error');
        return;
    }
    
    const contact = {
        id: 'c_' + Date.now(),
        name,
        phone,
        email,
        context,
        priority,
        status: 'pending'
    };
    
    let targetList;
    
    if (newListName) {
        // Create new list
        targetList = {
            id: 'list_' + Date.now(),
            name: newListName,
            description: 'Manually created list',
            contacts: [contact],
            createdAt: new Date().toISOString()
        };
        contactLists.push(targetList);
    } else if (listId) {
        // Add to existing list
        targetList = contactLists.find(list => list.id === listId);
        if (targetList) {
            targetList.contacts.push(contact);
        }
    } else {
        showToast('Please select a list or enter a new list name', 'error');
        return;
    }
    
    saveContactLists();
    renderContactLists();
    
    // If currently viewing a list, refresh the table
    if (currentContactList && (currentContactList.id === listId || newListName)) {
        if (newListName) {
            currentContactList = targetList;
        }
        renderContactsTable();
    }
    
    closeAddContactModal();
    showToast('Contact added successfully', 'success');
}

// Campaign Management
function loadCampaigns() {
    const stored = localStorage.getItem('activeCampaigns');
    if (stored) {
        activeCampaigns = JSON.parse(stored);
    } else {
        activeCampaigns = [];
    }
}

function saveCampaigns() {
    localStorage.setItem('activeCampaigns', JSON.stringify(activeCampaigns));
}

function renderCampaigns() {
    const grid = document.getElementById('campaignsGrid');
    
    if (activeCampaigns.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-bullhorn" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No Active Campaigns</h3>
                <p>Create your first campaign to start bulk calling</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = activeCampaigns.map(campaign => `
        <div class="campaign-card" onclick="viewCampaign('${campaign.id}')">
            <div class="campaign-header">
                <div class="campaign-title">${campaign.name}</div>
                <span class="campaign-status status-${campaign.status}">${campaign.status}</span>
            </div>
            <div class="campaign-info">
                <p><strong>Goal:</strong> ${campaign.goal}</p>
                <p><strong>Contacts:</strong> ${campaign.totalContacts}</p>
                <p><strong>Progress:</strong> ${campaign.calledContacts}/${campaign.totalContacts}</p>
                <div class="progress-bar" style="margin-top: 0.5rem;">
                    <div class="progress-fill" style="width: ${(campaign.calledContacts / campaign.totalContacts * 100)}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function showCreateCampaignModal() {
    // Populate contact list dropdown
    const select = document.getElementById('campaignContactList');
    select.innerHTML = '<option value="">Select contact list</option>' +
        contactLists.map(list => `<option value="${list.id}">${list.name} (${list.contacts.length} contacts)</option>`).join('');
    
    document.getElementById('createCampaignModal').style.display = 'block';
    
    // Schedule checkbox handler
    document.getElementById('campaignSchedule').addEventListener('change', function() {
        const timeInput = document.getElementById('campaignStartTime');
        timeInput.style.display = this.checked ? 'block' : 'none';
    });
}

function closeCampaignModal() {
    document.getElementById('createCampaignModal').style.display = 'none';
}

async function createCampaign() {
    const name = document.getElementById('campaignName').value.trim();
    const listId = document.getElementById('campaignContactList').value;
    const agent = document.getElementById('campaignAgent').value.trim();
    const goal = document.getElementById('campaignGoal').value;
    const script = document.getElementById('campaignScript').value.trim();
    const delay = parseInt(document.getElementById('campaignDelay').value);
    const retries = parseInt(document.getElementById('campaignRetries').value);
    const scheduled = document.getElementById('campaignSchedule').checked;
    const startTime = document.getElementById('campaignStartTime').value;
    
    if (!name || !listId || !agent || !script) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const contactList = contactLists.find(list => list.id === listId);
    if (!contactList) {
        showToast('Selected contact list not found', 'error');
        return;
    }
    
    const campaign = {
        id: 'campaign_' + Date.now(),
        name,
        listId,
        listName: contactList.name,
        agent,
        goal,
        script,
        delay,
        retries,
        totalContacts: contactList.contacts.length,
        calledContacts: 0,
        successfulCalls: 0,
        failedCalls: 0,
        status: scheduled ? 'scheduled' : 'active',
        startTime: scheduled ? startTime : new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    activeCampaigns.push(campaign);
    saveCampaigns();
    renderCampaigns();
    closeCampaignModal();
    
    showToast(`Campaign "${name}" created successfully`, 'success');
    
    // If not scheduled, start immediately
    if (!scheduled) {
        startCampaignCalling(campaign);
    }
}

async function startCampaignCalling(campaign) {
    currentCampaign = campaign;
    
    // Show progress view
    document.getElementById('campaignsGrid').style.display = 'none';
    document.getElementById('campaignProgress').style.display = 'block';
    document.getElementById('campaignTitle').textContent = campaign.name;
    
    updateCampaignProgress();
    
    const contactList = contactLists.find(list => list.id === campaign.listId);
    if (!contactList) {
        showToast('Contact list not found', 'error');
        return;
    }
    
    // Start calling contacts
    for (let i = 0; i < contactList.contacts.length; i++) {
        if (campaign.status !== 'active') break;
        
        const contact = contactList.contacts[i];
        if (contact.status === 'completed') continue;
        
        try {
            contact.status = 'calling';
            renderContactsTable(); // Update if viewing the contacts
            
            addCampaignLog(`Calling ${contact.name} (${contact.phone})...`, 'info');
            
            // Make the actual call using VAPI
            await makeVAPICampaignCall(campaign, contact);
            
            contact.status = 'completed';
            campaign.calledContacts++;
            campaign.successfulCalls++;
            
            addCampaignLog(`✓ Successfully called ${contact.name}`, 'success');
            
        } catch (error) {
            contact.status = 'failed';
            campaign.calledContacts++;
            campaign.failedCalls++;
            
            addCampaignLog(`✗ Failed to call ${contact.name}: ${error.message}`, 'error');
        }
        
        updateCampaignProgress();
        
        // Wait before next call
        if (i < contactList.contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, campaign.delay * 1000));
        }
    }
    
    // Campaign completed
    campaign.status = 'completed';
    saveCampaigns();
    saveContactLists();
    addCampaignLog('Campaign completed!', 'success');
    updateCampaignProgress();
}

async function makeVAPICampaignCall(campaign, contact) {
    // Create a dynamic assistant with the campaign script and contact context
    const assistantData = {
        name: campaign.agent,
        model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `${campaign.script}\n\nContact Context: ${contact.context}\nContact Name: ${contact.name}\nContact Email: ${contact.email}`
                }
            ]
        },
        voice: {
            provider: "11labs",
            voiceId: "paula"
        },
        firstMessage: `Hello ${contact.name}, this is ${campaign.agent}. How are you today?`
    };
    
    // Create assistant
    const assistantResponse = await fetch(`${DASHBOARD_CONFIG.vapiBaseUrl}/assistant`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DASHBOARD_CONFIG.vapiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistantData)
    });
    
    if (!assistantResponse.ok) {
        const errorText = await assistantResponse.text();
        throw new Error(`Assistant creation failed: ${assistantResponse.status} - ${errorText}`);
    }
    
    const assistant = await assistantResponse.json();
    
    // Initiate call
    const callData = {
        assistantId: assistant.id,
        phoneNumberId: DASHBOARD_CONFIG.vapiPhoneNumberId,
        customer: {
            number: contact.phone
        }
    };
    
    const callResponse = await fetch(`${DASHBOARD_CONFIG.vapiBaseUrl}/call`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DASHBOARD_CONFIG.vapiApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(callData)
    });
    
    if (!callResponse.ok) {
        const errorText = await callResponse.text();
        throw new Error(`Call initiation failed: ${callResponse.status} - ${errorText}`);
    }
    
    const callResult = await callResponse.json();
    return callResult;
}

function updateCampaignProgress() {
    if (!currentCampaign) return;
    
    document.getElementById('totalContacts').textContent = currentCampaign.totalContacts;
    document.getElementById('calledContacts').textContent = currentCampaign.calledContacts;
    document.getElementById('successfulCalls').textContent = currentCampaign.successfulCalls;
    document.getElementById('failedCalls').textContent = currentCampaign.failedCalls;
    
    const progress = (currentCampaign.calledContacts / currentCampaign.totalContacts) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function addCampaignLog(message, type = 'info') {
    const logContainer = document.getElementById('callLogLive');
    const entry = document.createElement('div');
    entry.className = `call-log-entry ${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function pauseCampaign() {
    if (currentCampaign) {
        currentCampaign.status = currentCampaign.status === 'active' ? 'paused' : 'active';
        document.getElementById('pauseBtn').innerHTML = 
            currentCampaign.status === 'active' ? 
            '<i class="fas fa-pause"></i> Pause' : 
            '<i class="fas fa-play"></i> Resume';
        saveCampaigns();
    }
}

function stopCampaign() {
    if (currentCampaign) {
        currentCampaign.status = 'stopped';
        saveCampaigns();
        addCampaignLog('Campaign stopped by user', 'info');
    }
}

// Utility Functions for Bulk Features
function toggleAllContacts(checkbox) {
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

function exportContacts() {
    if (!currentContactList) return;
    
    const csv = 'name,phone,email,context,priority,status\n' +
        currentContactList.contacts.map(contact => 
            `"${contact.name}","${contact.phone}","${contact.email}","${contact.context}","${contact.priority}","${contact.status}"`
        ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentContactList.name.replace(/[^a-z0-9]/gi, '_')}_contacts.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Contacts exported successfully', 'success');
}

function startBulkCalling() {
    if (!currentContactList) return;
    
    const selectedCheckboxes = document.querySelectorAll('.contact-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('Please select contacts to call', 'error');
        return;
    }
    
    // Create a quick campaign for selected contacts
    const selectedContacts = Array.from(selectedCheckboxes).map(cb => 
        currentContactList.contacts.find(contact => contact.id === cb.dataset.contactId)
    ).filter(contact => contact);
    
    if (selectedContacts.length === 0) return;
    
    // Show create campaign modal with pre-selected list
    showCreateCampaignModal();
    document.getElementById('campaignName').value = `${currentContactList.name} - Bulk Call`;
    document.getElementById('campaignContactList').value = currentContactList.id;
}

// Export functions for global access
window.openCallDetails = openCallDetails;
window.closeModal = closeModal;
window.saveCallData = saveCallData;
window.exportTranscription = exportTranscription;
window.searchTranscription = searchTranscription;
window.removeTag = removeTag;

// Export bulk calling functions
window.switchTab = switchTab;
window.downloadTemplate = downloadTemplate;
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleFileSelect = handleFileSelect;
window.uploadContacts = uploadContacts;
window.showAddContactModal = showAddContactModal;
window.closeAddContactModal = closeAddContactModal;
window.addContact = addContact;
window.viewContactList = viewContactList;
window.goBackToLists = goBackToLists;
window.toggleAllContacts = toggleAllContacts;
window.exportContacts = exportContacts;
window.startBulkCalling = startBulkCalling;
window.showCreateCampaignModal = showCreateCampaignModal;
window.closeCampaignModal = closeCampaignModal;
window.createCampaign = createCampaign;
window.pauseCampaign = pauseCampaign;
window.stopCampaign = stopCampaign;