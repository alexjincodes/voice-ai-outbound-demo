// VAPI Configuration - Loaded from server
let VAPI_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.vapi.ai',
  assistantId: ''
};

let PHONE_CONFIG = {
  phoneNumberId: ''
};

// Demo mode flag
let isDemoMode = false;

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const config = await response.json();
    
    VAPI_CONFIG = {
      apiKey: config.vapi.apiKey,
      baseUrl: config.vapi.baseUrl,
      assistantId: config.vapi.assistantId
    };
    
    PHONE_CONFIG = {
      phoneNumberId: config.vapi.phoneNumberId
    };
    
    console.log('Configuration loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return false;
  }
}

// DOM Elements
const agentNameInput = document.getElementById('agentName');
const agentDescriptionInput = document.getElementById('agentDescription');
const phoneNumberInput = document.getElementById('phoneNumber');
const agentGoalSelect = document.getElementById('agentGoal');
const startCallBtn = document.getElementById('startCall');
const statusDisplay = document.getElementById('statusDisplay');
const logContent = document.getElementById('logContent');
const previewName = document.getElementById('previewName');
const previewDescription = document.getElementById('previewDescription');

// Real-time preview updates
agentNameInput.addEventListener('input', updatePreview);
agentDescriptionInput.addEventListener('input', updatePreview);

function updatePreview() {
  const name = agentNameInput.value.trim() || 'Agent Name';
  const description = agentDescriptionInput.value.trim() || 'Agent description will appear here...';
  previewName.textContent = name;
  previewDescription.textContent = description;
}

function updateStatus(status, message) {
  statusDisplay.className = `status-${status}`;
  statusDisplay.querySelector('span').textContent = message;
}

function addLogEntry(message) {
  const entry = document.createElement('p');
  entry.className = 'log-entry';
  entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
}

function validateForm() {
  const name = agentNameInput.value.trim();
  const description = agentDescriptionInput.value.trim();
  const phone = phoneNumberInput.value.trim();

  if (!name) {
    alert('Please enter an agent name');
    return false;
  }
  if (!description) {
    alert('Please enter an agent description');
    return false;
  }
  if (!phone) {
    alert('Please enter a phone number');
    return false;
  }

  // Basic phone number validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    alert('Please enter a valid phone number');
    return false;
  }

  return true;
}

async function createVAPIAssistant() {
  const agentName = agentNameInput.value.trim() || 'AI Assistant';
  const agentDesc = agentDescriptionInput.value.trim() || 'A helpful AI assistant';
  
  const assistantData = {
    name: agentName,
    model: {
      provider: "openai",
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are ${agentName}. ${agentDesc}`
        }
      ]
    },
    voice: {
      provider: "11labs",
      voiceId: "paula"
    },
    firstMessage: `Hello! This is ${agentName}. How can I help you today?`
  };

  try {
    addLogEntry('Creating custom AI assistant...');
    
    const response = await fetch(`${VAPI_CONFIG.baseUrl}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMsg = errorData.message || errorData.error || response.statusText;
      throw new Error(`Assistant creation failed (${response.status}): ${errorMsg}`);
    }

    const result = await response.json();
    addLogEntry('AI Assistant created successfully');
    return result.id;
  } catch (error) {
    console.error('Assistant creation error:', error);
    addLogEntry(`Error creating assistant: ${error.message}`);
    throw error;
  }
}

// Initiate call via VAPI using your Twilio number as the "from" number
async function initiateVAPICall(assistantId, phoneNumber) {
  const callData = {
    assistantId: assistantId,
    phoneNumberId: PHONE_CONFIG.phoneNumberId,
    customer: {
      number: phoneNumber
    }
  };

  addLogEntry(`Initiating call to ${phoneNumber}`);
  addLogEntry(`Using assistant: ${assistantId.substring(0, 8)}...`);

  try {
    const response = await fetch(`${VAPI_CONFIG.baseUrl}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const errorMsg = errorData.message || errorData.error || response.statusText;
      
      if (response.status === 401) {
        throw new Error('Invalid VAPI API key - check configuration');
      } else if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMsg}`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      } else {
        throw new Error(`Call failed (${response.status}): ${errorMsg}`);
      }
    }

    const result = await response.json();
    addLogEntry('Outbound call initiated successfully');
    return result;
  } catch (error) {
    console.error('Call initiation error:', error);
    addLogEntry(`Call initiation failed: ${error.message}`);
    throw error;
  }
}

async function initiateOutboundCall() {
  if (!validateForm()) return;

  // Disable button to prevent multiple clicks
  startCallBtn.disabled = true;
  startCallBtn.querySelector('.btn-text').textContent = 'Initiating Call...';

  try {
    updateStatus('calling', 'Preparing AI assistant...');
    addLogEntry('Starting outbound call process');
    addLogEntry(`Configuring agent: ${agentNameInput.value.trim()}`);
    addLogEntry(`Target number: ${phoneNumberInput.value.trim()}`);
    addLogEntry(`Call objective: ${agentGoalSelect.value}`);

    if (isDemoMode) {
      // Demo mode - simulation
      addLogEntry('🎭 Running demonstration (VAPI not configured)');
      await simulateCallProcess();
    } else {
      // Real VAPI implementation
      addLogEntry('🚀 Making real VAPI call');
      
      let assistantId = VAPI_CONFIG.assistantId;
      
      // If no pre-configured assistant ID, create a new one
      if (!assistantId) {
        assistantId = await createVAPIAssistant();
      } else {
        addLogEntry('Using pre-configured assistant');
      }
      
      const callResult = await initiateVAPICall(assistantId, phoneNumberInput.value.trim());

      updateStatus('connected', 'Call in progress...');
      addLogEntry(`Call ID: ${callResult.id}`);
      addLogEntry('Monitoring call status...');
      monitorCallStatus(callResult.id);
    }
  } catch (error) {
    updateStatus('error', 'Call failed');
    addLogEntry(`Call failed: ${error.message}`);
    console.error('Call error:', error);
    
    // Fall back to demo mode on error only if we were trying real calls
    if (!isDemoMode) {
      addLogEntry('⚠️ Falling back to demonstration mode');
      setTimeout(async () => {
        await simulateCallProcess();
      }, 2000);
    }
  } finally {
    setTimeout(() => {
      startCallBtn.disabled = false;
      startCallBtn.querySelector('.btn-text').textContent = 'Start Outbound Call';
    }, 3000);
  }
}

// Simulate call process for demo purposes
async function simulateCallProcess() {
  const agentName = agentNameInput.value.trim() || 'Agent';
  const phoneNumber = phoneNumberInput.value.trim();
  
  return new Promise((resolve) => {
    setTimeout(() => {
      updateStatus('calling', 'Dialing number...');
      addLogEntry(`Dialing ${phoneNumber}`);
    }, 1000);

    setTimeout(() => {
      updateStatus('connected', 'Call connected - AI speaking');
      addLogEntry('Call answered - AI assistant active');
    }, 3000);

    setTimeout(() => {
      addLogEntry(`AI (${agentName}): Hello! This is ${agentName}. How can I help you today?`);
    }, 4000);

    setTimeout(() => {
      addLogEntry('Customer: Hi, I received a call from you...');
    }, 6000);

    setTimeout(() => {
      addLogEntry(`AI (${agentName}): I understand. Let me help you with that...`);
    }, 8000);

    setTimeout(() => {
      addLogEntry('Customer: That sounds interesting, tell me more.');
    }, 10000);

    setTimeout(() => {
      updateStatus('idle', 'Call completed');
      addLogEntry('Call ended - Duration: 2:47');
      addLogEntry('Call summary: Successful contact, customer interested');
      resolve();
    }, 12000);
  });
}

// Monitor call status (for real implementation)
async function monitorCallStatus(callId) {
  const checkStatus = async () => {
    try {
      const response = await fetch(`${VAPI_CONFIG.baseUrl}/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`
        }
      });

      if (response.ok) {
        const callData = await response.json();

        switch (callData.status) {
          case 'ringing':
            updateStatus('calling', 'Phone ringing...');
            break;
          case 'in-progress':
            updateStatus('connected', 'Call in progress');
            break;
          case 'ended':
            updateStatus('idle', 'Call completed');
            addLogEntry(`Call ended - Duration: ${callData.duration || 'Unknown'}`);
            return; // Stop monitoring
          case 'failed':
            updateStatus('error', 'Call failed');
            addLogEntry(`Call failed: ${callData.endedReason || 'Unknown error'}`);
            return; // Stop monitoring
        }

        setTimeout(checkStatus, 2000);
      }
    } catch (error) {
      addLogEntry(`Status check error: ${error.message}`);
    }
  };

  checkStatus();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function () {
  addLogEntry('Outbound Agent Demo ready');
  updatePreview();
  
  // Add event listener for the start call button
  if (startCallBtn) {
    startCallBtn.addEventListener('click', initiateOutboundCall);
    console.log('Button event listener added');
  } else {
    console.error('Start call button not found');
  }
  
  // Try to load configuration on startup
  const configLoaded = await loadConfig();
  if (configLoaded && VAPI_CONFIG.apiKey && PHONE_CONFIG.phoneNumberId) {
    addLogEntry('✅ VAPI configuration loaded - Real calls enabled');
    isDemoMode = false;
  } else {
    addLogEntry('⚠️  VAPI not configured - Demo mode enabled');
    isDemoMode = true;
  }
});
