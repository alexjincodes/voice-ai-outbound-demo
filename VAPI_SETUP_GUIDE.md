# Voice AI Assistant Demo - Setup Guide

## Overview
This outbound agent demo integrates with VAPI (Voice AI Platform) and TNZ (Telecom Network Solutions) to create intelligent voice assistants that can make outbound calls.

## Quick Start
1. Open `outbound-agent-demo.html` in your browser
2. Configure your agent with name and description
3. Enter target phone number
4. Click "Start Outbound Call"

## API Configuration Required

### VAPI Setup
1. Sign up at [VAPI.ai](https://vapi.ai)
2. Get your API key from the dashboard
3. Update `outbound-demo-script.js`:
   ```javascript
   const VAPI_CONFIG = {
       apiKey: 'YOUR_ACTUAL_VAPI_API_KEY',
       baseUrl: 'https://api.vapi.ai',
       assistantId: 'YOUR_ASSISTANT_ID'
   };
   ```

### TNZ Setup
1. Sign up at [TNZ.co.nz](https://tnz.co.nz)
2. Purchase a phone number for outbound calls
3. Get your API credentials
4. Update `outbound-demo-script.js`:
   ```javascript
   const TNZ_CONFIG = {
       apiKey: 'YOUR_TNZ_API_KEY',
       baseUrl: 'https://rest-api.tnz.co.nz/api/v1',
       fromNumber: 'YOUR_TNZ_PHONE_NUMBER'
   };
   ```

## Features
- ✅ Agent configuration (name, description, context)
- ✅ Real-time preview of agent settings
- ✅ Call objective selection
- ✅ Phone number validation
- ✅ Call status monitoring
- ✅ Live call log
- ✅ Responsive design

## Demo Mode
The current implementation includes a simulation mode for demonstration purposes. When you click "Start Outbound Call", it will:
1. Show the call preparation process
2. Simulate dialing and connection
3. Display sample AI conversation logs
4. Show call completion status

## Production Implementation
To use with real calls, uncomment the actual API integration code in `initiateOutboundCall()` function and ensure you have valid API keys configured.

## File Structure
```
outbound-agent-demo.html     - Main demo page
outbound-demo-styles.css     - Styling for the demo
outbound-demo-script.js      - JavaScript functionality
VAPI_SETUP_GUIDE.md         - This setup guide
```

## Customization
You can customize the agent by modifying:
- Voice provider and voice ID in VAPI configuration
- AI model (GPT-3.5-turbo, GPT-4, etc.)
- First message template
- Call objectives and goals
- UI styling and branding