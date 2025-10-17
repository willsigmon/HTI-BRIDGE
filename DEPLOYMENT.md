# Deployment Guide for AI Email Assistant

## Current Status

Your AI Email Assistant code has been successfully pushed to GitHub:
- **Repository**: https://github.com/willsigmon/newdash
- **Branch**: `email-assistant`
- **Commit**: Added AI Email Assistant with multi-account support

## Deployment Options

### Option 1: Run Locally (Recommended for Full Features)

This is the best option for the complete experience with OAuth authentication and persistent connections.

**Steps:**

1. Clone the repository:
   ```bash
   git clone https://github.com/willsigmon/newdash.git
   cd newdash
   git checkout email-assistant
   ```

2. Install dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

3. Set up Google API credentials (see QUICKSTART.md)

4. Run the application:
   ```bash
   ./start.sh
   ```

5. Open in your browser:
   ```
   http://localhost:8000
   ```

### Option 2: Deploy to Railway.app (Cloud Hosting)

Railway supports persistent Python applications and is perfect for this use case.

**Steps:**

1. Go to [Railway.app](https://railway.app) and sign in with GitHub

2. Click "New Project" → "Deploy from GitHub repo"

3. Select `willsigmon/newdash` and the `email-assistant` branch

4. Railway will auto-detect the Python app

5. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: (your OpenAI API key from environment)

6. Railway will provide a public URL

7. Update the OAuth redirect URIs in Google Cloud Console to include the Railway URL

### Option 3: Deploy to Render.com (Cloud Hosting)

Render also supports persistent Python web services.

**Steps:**

1. Go to [Render.com](https://render.com) and sign in with GitHub

2. Click "New +" → "Web Service"

3. Connect your GitHub repository: `willsigmon/newdash`

4. Select the `email-assistant` branch

5. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && python3 server.py`
   - **Environment**: Python 3

6. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: (your OpenAI API key)

7. Deploy and get your public URL

8. Update OAuth redirect URIs in Google Cloud Console

### Option 4: Vercel (Limited - Serverless Only)

Vercel can host the frontend, but the backend needs to be adapted for serverless functions. This requires significant refactoring and has limitations with OAuth flows.

**Current Limitation**: The application uses persistent connections and OAuth callbacks that don't work well with Vercel's serverless architecture.

**To Deploy to Vercel**:

1. Go to [Vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub: `willsigmon/newdash`
4. Select the `email-assistant` branch
5. Vercel will auto-deploy

**Note**: This will only serve the frontend. The backend API calls will fail without additional configuration.

## Recommended Next Steps

1. **For immediate use**: Run locally using Option 1
2. **For cloud access**: Deploy to Railway (Option 2) or Render (Option 3)
3. **For production**: Set up proper domain, SSL, and security configurations

## Important Security Notes

- Never commit your `credentials.json` file to GitHub
- Keep your OAuth tokens secure in the `data/tokens/` directory
- Use environment variables for API keys
- Enable 2FA on your Google account
- Regularly review authorized applications in your Google account settings

## Need Help?

- Check QUICKSTART.md for setup instructions
- Check README.md for detailed documentation
- The application is currently running at: https://8000-intzj87wgoqhigcm1xavb-bd1be0ba.manusvm.computer (temporary sandbox URL)

## What's Next?

Once deployed, you can:
1. Add multiple Gmail accounts
2. Ask questions about your emails
3. Draft AI-powered replies
4. Send emails directly from the interface
5. Search your email history semantically

Enjoy your personal AI Email Assistant! 🚀

