// VAPI Configuration - Replace with your actual VAPI credentials
const VAPI_CONFIG = {
  apiKey: '9a26f651-d163-48fe-97f1-69e534282719', // Use PRIVATE key for outbound calls (WARNING: Not secure in frontend!)
  baseUrl: 'https://api.vapi.ai', // Standard VAPI base URL
  assistantId: '4f3a7283-fdd0-46bf-838b-a5258376c41b' // Replace with your actual assistant ID (if you already have one)
};

// Phone Number Configuration
// NOTE: Use the UUID/ID of your phone number from VAPI dashboard, not the actual phone number
const PHONE_CONFIG = {
  phoneNumberId: '59364f07-5295-4cab-ac4c-f2f3af95d1d5' // Replace with the UUID of your connected Twilio number from VAPI dashboard
};

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
  const assistantData = {
    name: agentNameInput.value.trim(),
    model: {
      provider: "openai",
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are ${agentNameInput.value.trim()}. ${agentDescriptionInput.value.trim()}`
        }
      ]
    },
    voice: {
      provider: "11labs",
      voiceId: "paula"
    },
    firstMessage: `Hello! This is ${agentNameInput.value.trim()}. How can I help you today?`
  };

  try {
    const response = await fetch(`${VAPI_CONFIG.baseUrl}/assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VAPI Assistant creation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    addLogEntry('AI Assistant created successfully');
    return result.id;
  } catch (error) {
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

  console.log('Making VAPI call with data:', callData);
  console.log('API endpoint:', `${VAPI_CONFIG.baseUrl}/call`);
  addLogEntry(`Debug: Calling ${phoneNumber} using assistant ${assistantId}`);

  try {
    const response = await fetch(`${VAPI_CONFIG.baseUrl}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`VAPI Call initiation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Success response:', result);
    addLogEntry('Outbound call initiated');
    return result;
  } catch (error) {
    console.error('Call error:', error);
    addLogEntry(`Error initiating call: ${error.message}`);
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

    // Real implementation - Making actual VAPI calls
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
  } catch (error) {
    updateStatus('error', 'Call failed');
    addLogEntry(`Call failed: ${error.message}`);
    console.error('Call error:', error);
  } finally {
    setTimeout(() => {
      startCallBtn.disabled = false;
      startCallBtn.querySelector('.btn-text').textContent = 'Start Outbound Call';
    }, 3000);
  }
}

// Simulate call process for demo purposes
async function simulateCallProcess() {
  return new Promise((resolve) => {
    setTimeout(() => {
      updateStatus('calling', 'Dialing number...');
      addLogEntry('Dialing target number');
    }, 1000);

    setTimeout(() => {
      updateStatus('connected', 'Call connected - AI speaking');
      addLogEntry('Call answered - AI assistant active');
    }, 3000);

    setTimeout(() => {
      addLogEntry('AI: Hello! This is Sarah from ABC Company...');
    }, 4000);

    setTimeout(() => {
      addLogEntry('Customer response detected');
    }, 7000);

    setTimeout(() => {
      addLogEntry('AI: I understand. Let me help you with that...');
    }, 8000);

    setTimeout(() => {
      updateStatus('idle', 'Call completed');
      addLogEntry('Call ended - Duration: 2:34');
      addLogEntry('Call summary: Successful contact, follow-up scheduled');
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
document.addEventListener('DOMContentLoaded', function () {
  addLogEntry('Outbound Agent Demo ready');
  updatePreview();
});
