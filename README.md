# Voice AI Outbound Demo

A professional outbound calling platform with AI voice agents, bulk calling capabilities, and comprehensive call analytics.

## 🚀 Features

- **Outbound AI Calling** - Make calls with intelligent voice agents
- **Bulk Calling Campaigns** - Upload contact lists and run automated campaigns  
- **Call Analytics Dashboard** - Track calls, view transcripts, manage contacts
- **Contact Management** - CSV upload, individual contacts, context tracking
- **Real-time Monitoring** - Live campaign progress and call logs

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **AI Platform**: VAPI.ai
- **Deployment**: Render
- **Storage**: Browser LocalStorage

## 📦 Installation

### Local Development

1. **Clone or download the files**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure your VAPI credentials:**
   - Copy `.env.example` to `.env`
   - Add your VAPI API key, assistant ID, and phone number ID
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Open your browser:**
   - Demo: `http://localhost:3000/demo`
   - Dashboard: `http://localhost:3000/dashboard`

### Render Deployment

1. **Create a GitHub repository** with these files
2. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect your GitHub repository
3. **Configure environment variables** in Render dashboard:
   - `NODE_ENV=production`
   - `VAPI_API_KEY=your_private_key`
   - (Other variables as needed)
4. **Deploy automatically** - Render will build and deploy

## 🔧 Configuration

### VAPI Setup Required

Before deployment, you need:

1. **VAPI Account** - Sign up at [vapi.ai](https://vapi.ai)
2. **Private API Key** - From your VAPI dashboard
3. **Assistant ID** - Create or use existing assistant
4. **Phone Number ID** - UUID of your connected Twilio number

### Environment Variables

Set these in Render dashboard:

- `NODE_ENV=production`
- `VAPI_API_KEY=your_private_key_here`
- `VAPI_ASSISTANT_ID=your_assistant_id_here` 
- `VAPI_PHONE_NUMBER_ID=your_phone_uuid_here`

## 📊 Usage

### Demo Page (`/demo`)
- Configure AI agent name and behavior
- Enter target phone number  
- Make single outbound calls
- View real-time call status

### Dashboard (`/dashboard`)
- **Analytics Tab**: View call statistics and history
- **Contact Lists Tab**: Upload CSV files, manage contacts
- **Campaigns Tab**: Create and monitor bulk calling campaigns

### CSV Format for Contact Upload
```csv
name,phone,email,context,priority
John Doe,+1234567890,john@example.com,Interested in premium package,high
Jane Smith,+1987654321,jane@example.com,Previous customer follow-up,medium
```

## 🔒 Security Features

- Helmet.js security headers
- CORS protection
- Input validation
- Environment variable protection
- CSP (Content Security Policy)

## 📱 Responsive Design

- Mobile-friendly interface
- Tablet optimization
- Desktop professional layout
- Touch-friendly controls

## 🎯 For Clients

This demo showcases:
- Professional AI voice calling capabilities
- Scalable bulk calling operations
- Comprehensive call management
- Real-time analytics and reporting
- Easy-to-use interface for non-technical users

## 📞 Support

For questions or customization requests, contact your development team.

## 🔄 Updates

The platform automatically deploys updates when you push changes to the connected GitHub repository.