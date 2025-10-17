# Quick Start Guide

Get your AI Email Assistant running in 5 minutes!

## Step 1: Get Google Credentials (One-time setup)

### A. Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "AI Email Assistant" → Click "Create"

### B. Enable Gmail API

1. In the search bar, type "Gmail API"
2. Click on "Gmail API" in the results
3. Click the blue "Enable" button

### C. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials" (left sidebar)
2. Click "Configure Consent Screen"
   - Choose "External" → Click "Create"
   - Fill in:
     - App name: "AI Email Assistant"
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "Save and Continue"
   - Click "Add or Remove Scopes"
   - Manually add these scopes:
     ```
     https://www.googleapis.com/auth/gmail.readonly
     https://www.googleapis.com/auth/gmail.send
     https://www.googleapis.com/auth/gmail.modify
     https://www.googleapis.com/auth/gmail.labels
     ```
   - Click "Update" → "Save and Continue"
   - Add yourself as a test user → "Save and Continue"
   - Review and click "Back to Dashboard"

3. Go back to "Credentials" tab
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Desktop app"
6. Name it "AI Email Assistant"
7. Click "Create"
8. Click "Download JSON" (download icon)
9. Rename the downloaded file to `credentials.json`
10. Move it to the `credentials/` folder in this project

## Step 2: Start the Application

### Option A: Using the Launcher Script (Recommended)

```bash
cd /home/ubuntu/jace-clone
./start.sh
```

### Option B: Manual Start

```bash
cd /home/ubuntu/jace-clone/backend
python3.11 server.py
```

## Step 3: Open in Browser

Once the server starts, open your browser to:

```
http://localhost:8000
```

## Step 4: Add Your First Gmail Account

1. Click the "+ Add Account" button in the sidebar
2. Enter an ID like "personal" or "work"
3. A browser window will open
4. Log in to your Gmail account
5. Click "Continue" when warned about unverified app (it's your own app!)
6. Grant all requested permissions
7. You'll see "Authentication successful" in the browser

## Step 5: Start Using It!

### Fetch Your Emails
- The app will automatically fetch recent emails
- Or type: "fetch emails" in the chat

### Ask Questions
Try these examples:
- "Show me recent emails from John"
- "What did Sarah say about the meeting?"
- "Find emails about the project"

### Draft a Reply
1. Ask to see emails: "Show me recent emails"
2. Click "Draft Reply" on any email
3. Enter your instruction: "Say I'm interested and available next week"
4. Review and refine the draft
5. Click "Send Email"

### Compose New Email
Type in the chat:
- "Compose an email to john@example.com about the meeting"
- "Write a professional introduction email"

## Troubleshooting

### "This app isn't verified" warning
- This is normal! It's your own app
- Click "Advanced" → "Go to AI Email Assistant (unsafe)"
- This warning appears because you haven't submitted the app for Google's verification (which you don't need for personal use)

### Can't find credentials.json
- Make sure it's in: `/home/ubuntu/jace-clone/credentials/credentials.json`
- Check the filename is exactly `credentials.json` (not `credentials (1).json`)

### Server won't start
- Check if port 8000 is already in use
- Try: `lsof -i :8000` to see what's using it
- Kill the process or use a different port

### No emails showing
- Wait 10-20 seconds after adding account
- Check the stats in the sidebar
- Try typing "fetch emails" manually

## Tips for Best Results

### For Better Email Drafts
- Be specific in your instructions
- Mention the tone: "formal", "casual", "friendly"
- Include key points: "mention the deadline and ask for confirmation"

### For Better Search
- Use natural language
- Include names, dates, or topics
- Be specific: "emails from last week about the budget" vs "recent emails"

### For Refinement
- Use the refinement box in the draft editor
- Try: "make it shorter", "add a greeting", "be more enthusiastic"
- Refine multiple times until perfect

## What's Next?

### Add Multiple Accounts
- Click "+ Add Account" again
- Use different IDs: "work", "personal", "side-project"
- Switch between them when composing

### Explore Features
- Try semantic search: "Find emails where someone thanked me"
- Ask complex questions: "What are the main topics in my recent emails?"
- Compose from scratch: "Write a follow-up email for the proposal I sent"

## Need Help?

Check the full README.md for:
- Detailed architecture explanation
- API documentation
- Security notes
- Advanced configuration

---

**Enjoy your AI Email Assistant!** 🚀

