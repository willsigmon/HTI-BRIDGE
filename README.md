# AI Email Assistant - Jace.ai Clone

A free, multi-account AI email assistant inspired by Jace.ai. This application allows you to interact with your Gmail accounts using natural language, draft context-aware replies with inline editing, and send emails directly from the UI without opening Gmail.

## Features

- **Multi-Account Support**: Connect and manage multiple Gmail accounts simultaneously
- **AI-Powered Email Drafting**: Generate context-aware email replies using AI
- **Inline Draft Editing**: Refine drafts on the fly with natural language instructions
- **Semantic Email Search**: Ask questions about your email history using natural language
- **Direct Sending**: Send emails straight from the interface without opening Gmail
- **Vector Database**: Fast semantic search across all your emails
- **Free to Use**: Runs entirely on your own hardware with no subscription fees

## Architecture

The application consists of three main components:

1. **Backend (Python/FastAPI)**: Handles Gmail API integration, vector database, and AI processing
2. **Frontend (HTML/CSS/JavaScript)**: Provides the chat-based user interface
3. **AI Model**: Uses Gemini 2.5 Flash via OpenAI-compatible API for email drafting

## Prerequisites

- Python 3.11+ (already installed in this environment)
- Google Cloud Console account (free)
- Gmail account(s) you want to connect

## Setup Instructions

### Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields (app name, user support email, developer email)
   - Add your email as a test user
   - Add the following scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.labels`
4. Back in Credentials, create OAuth client ID:
   - Application type: "Desktop app"
   - Name: "AI Email Assistant"
5. Download the credentials JSON file
6. Rename it to `credentials.json` and place it in the `credentials/` directory

### Step 3: Install Dependencies

All dependencies are already installed in this environment. If you're running this elsewhere, use:

```bash
pip3 install google-api-python-client google-auth-oauthlib google-auth-httplib2 fastapi uvicorn chromadb sentence-transformers
```

### Step 4: Start the Application

1. Navigate to the backend directory:
   ```bash
   cd /home/ubuntu/jace-clone/backend
   ```

2. Start the server:
   ```bash
   python3.11 server.py
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage Guide

### Adding Gmail Accounts

1. Click the "+ Add Account" button in the sidebar
2. Enter a unique identifier (e.g., "personal", "work")
3. A browser window will open for Google OAuth authentication
4. Log in and grant the requested permissions
5. The account will appear in the sidebar

### Fetching Emails

Once an account is added, the system will automatically fetch recent emails. You can also:

- Type "fetch emails" in the chat to manually fetch
- The system will index emails in the background for semantic search

### Drafting Replies

**Method 1: From Email List**
1. Ask to see emails (e.g., "Show me recent emails")
2. Click "Draft Reply" on any email
3. Enter your instruction (e.g., "Say I'm interested and ask for more details")
4. The AI will generate a draft

**Method 2: Direct Instruction**
1. Type your instruction in the chat (e.g., "Draft a reply to John's email saying I'll be there")
2. The AI will search for the relevant email and generate a draft

### Refining Drafts

In the draft editor:
1. Review the generated draft
2. Type refinement instructions (e.g., "make it more formal", "add a thank you")
3. Click "Refine" to regenerate the draft
4. Repeat until satisfied

### Sending Emails

1. Review the final draft
2. Click "Send Email"
3. Confirm the recipient
4. The email will be sent from your Gmail account

### Asking Questions

Ask natural language questions about your emails:
- "What did Sarah say about the project?"
- "Show me emails from last week about the meeting"
- "Did anyone respond to my proposal?"

The AI will search your email history and provide answers with sources.

### Composing New Emails

Type instructions like:
- "Compose an email to john@example.com about the meeting"
- "Write a professional email introducing myself"

The AI will generate a subject and body, which you can refine and send.

## Project Structure

```
jace-clone/
├── backend/
│   ├── server.py              # FastAPI server
│   ├── gmail_auth.py          # Gmail OAuth authentication
│   ├── email_manager.py       # Email fetching and sending
│   ├── vector_store.py        # ChromaDB vector database
│   └── ai_assistant.py        # AI drafting and Q&A
├── frontend/
│   ├── index.html             # Main UI
│   ├── styles.css             # Styling
│   └── app.js                 # Frontend logic
├── credentials/
│   └── credentials.json       # Google OAuth credentials (you provide)
├── data/
│   ├── tokens/                # Stored OAuth tokens per account
│   └── chroma/                # Vector database storage
└── README.md                  # This file
```

## How It Works

### Authentication Flow
1. User adds an account with a unique ID
2. System initiates OAuth 2.0 flow with Google
3. User grants permissions in browser
4. System stores refresh token for future access
5. Token is automatically refreshed when expired

### Email Processing Flow
1. System fetches emails via Gmail API
2. Email content is converted to vector embeddings
3. Embeddings are stored in ChromaDB for fast semantic search
4. When user asks a question, query is converted to embedding
5. Similar emails are retrieved and sent to AI for answer generation

### Draft Generation Flow
1. User provides instruction and email context
2. System retrieves original email details
3. AI model generates draft based on context and instruction
4. User can refine draft with additional instructions
5. Refined draft is regenerated by AI
6. Final draft is sent via Gmail API

## API Endpoints

The backend exposes the following REST API endpoints:

- `GET /accounts` - List all authenticated accounts
- `POST /accounts/add` - Add a new Gmail account
- `DELETE /accounts/{account_id}` - Remove an account
- `POST /emails/fetch` - Fetch emails from an account
- `GET /emails/{account_id}/{message_id}` - Get email details
- `POST /emails/draft` - Generate email draft
- `POST /emails/compose` - Compose new email
- `POST /emails/send` - Send an email
- `POST /emails/search` - Semantic email search
- `POST /ask` - Ask questions about emails
- `GET /stats` - Get system statistics

## Troubleshooting

### "Credentials file not found"
- Ensure `credentials.json` is in the `credentials/` directory
- Verify the file is valid JSON from Google Cloud Console

### "Authentication failed"
- Check that Gmail API is enabled in Google Cloud Console
- Verify your email is added as a test user in OAuth consent screen
- Try removing and re-adding the account

### "No emails showing"
- Wait a moment after adding account for initial fetch
- Check the stats in sidebar to see if emails are indexed
- Try manually typing "fetch emails"

### "AI not responding"
- Ensure the OpenAI API environment variables are set
- Check that the model name in `ai_assistant.py` is correct
- Verify internet connection for API calls

### "Can't send emails"
- Verify Gmail API has send permissions enabled
- Check that OAuth scopes include `gmail.send`
- Ensure you're sending from an authenticated account

## Security Notes

- OAuth tokens are stored locally in `data/tokens/`
- Never share your `credentials.json` file
- Tokens are encrypted by Google's auth library
- Application runs entirely on your local machine
- No data is sent to third parties except Google (for Gmail) and OpenAI API (for AI processing)

## Limitations

- Gmail API has rate limits (250 quota units per user per second)
- Free tier of embedding model has usage limits
- Vector database size depends on available disk space
- AI model quality depends on the model used (Gemini 2.5 Flash in this case)

## Future Enhancements

Potential improvements you could add:

- Outlook/Microsoft 365 support
- Email scheduling
- Template management
- Attachment handling
- Calendar integration
- Mobile-responsive design
- Desktop application packaging
- Background email sync
- Smart categorization
- Email analytics

## License

This is a personal project for educational purposes. Respect Gmail API terms of service and usage limits.

## Credits

Inspired by [Jace.ai](https://jace.ai) by Zeta Labs.

Built using:
- FastAPI - Web framework
- ChromaDB - Vector database
- Sentence Transformers - Embeddings
- Google Gmail API - Email access
- OpenAI API - AI processing

