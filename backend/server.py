"""
FastAPI Backend Server
Main server handling all API endpoints for the email assistant
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from pathlib import Path

from gmail_auth import GmailAuthManager
from email_manager import EmailManager
from vector_store import EmailVectorStore
from ai_assistant import AIAssistant

# Initialize FastAPI app
app = FastAPI(title="AI Email Assistant", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
auth_manager = GmailAuthManager(
    credentials_dir='/home/ubuntu/jace-clone/credentials',
    tokens_dir='/home/ubuntu/jace-clone/data/tokens'
)
email_manager = EmailManager(auth_manager)
vector_store = EmailVectorStore(data_dir='/home/ubuntu/jace-clone/data/chroma')
ai_assistant = AIAssistant()

# Pydantic models for request/response
class AddAccountRequest(BaseModel):
    account_id: str

class FetchEmailsRequest(BaseModel):
    account_id: str
    max_results: Optional[int] = 50
    query: Optional[str] = ''

class DraftReplyRequest(BaseModel):
    account_id: str
    message_id: str
    instruction: str
    previous_draft: Optional[str] = None

class SendEmailRequest(BaseModel):
    account_id: str
    to: str
    subject: str
    body: str
    thread_id: Optional[str] = None
    message_id: Optional[str] = None

class SearchEmailsRequest(BaseModel):
    query: str
    n_results: Optional[int] = 5
    account_id: Optional[str] = None

class AskQuestionRequest(BaseModel):
    question: str
    account_id: Optional[str] = None

class ComposeEmailRequest(BaseModel):
    instruction: str

# API Endpoints



@app.get("/accounts")
async def list_accounts():
    """List all authenticated accounts"""
    accounts = auth_manager.list_accounts()
    account_details = []
    
    for account_id in accounts:
        email = auth_manager.get_account_email(account_id)
        account_details.append({
            "account_id": account_id,
            "email": email
        })
    
    return {"accounts": account_details}

@app.post("/accounts/add")
async def add_account(request: AddAccountRequest):
    """Add a new Gmail account"""
    try:
        # This will trigger OAuth flow
        auth_manager.authenticate_account(request.account_id)
        email = auth_manager.get_account_email(request.account_id)
        
        return {
            "success": True,
            "account_id": request.account_id,
            "email": email,
            "message": "Account added successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/accounts/{account_id}")
async def remove_account(account_id: str):
    """Remove an authenticated account"""
    try:
        auth_manager.remove_account(account_id)
        vector_store.clear_account_emails(account_id)
        return {
            "success": True,
            "message": f"Account {account_id} removed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emails/fetch")
async def fetch_emails(request: FetchEmailsRequest, background_tasks: BackgroundTasks):
    """Fetch emails from a Gmail account"""
    try:
        emails = email_manager.fetch_recent_emails(
            request.account_id,
            request.max_results,
            request.query
        )
        
        # Add emails to vector store in background
        for email_data in emails:
            if not vector_store.email_exists(request.account_id, email_data['id']):
                background_tasks.add_task(vector_store.add_email, email_data)
        
        return {
            "success": True,
            "count": len(emails),
            "emails": emails
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/emails/{account_id}/{message_id}")
async def get_email(account_id: str, message_id: str):
    """Get details of a specific email"""
    try:
        email_data = email_manager.get_email_details(account_id, message_id)
        if not email_data:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return email_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emails/draft")
async def draft_reply(request: DraftReplyRequest):
    """Draft a reply to an email using AI"""
    try:
        # Get the original email
        original_email = email_manager.get_email_details(
            request.account_id,
            request.message_id
        )
        
        if not original_email:
            raise HTTPException(status_code=404, detail="Original email not found")
        
        # Generate draft
        draft = ai_assistant.draft_reply(
            original_email,
            request.instruction,
            request.previous_draft
        )
        
        return {
            "success": True,
            "draft": draft,
            "original_email": original_email
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emails/compose")
async def compose_email(request: ComposeEmailRequest):
    """Compose a new email using AI"""
    try:
        result = ai_assistant.compose_new_email(request.instruction)
        
        return {
            "success": True,
            "subject": result["subject"],
            "body": result["body"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emails/send")
async def send_email(request: SendEmailRequest):
    """Send an email"""
    try:
        result = email_manager.send_email(
            request.account_id,
            request.to,
            request.subject,
            request.body,
            request.thread_id,
            request.message_id
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to send email")
        
        return {
            "success": True,
            "message": "Email sent successfully",
            "sent_message": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emails/search")
async def search_emails(request: SearchEmailsRequest):
    """Search emails using semantic search"""
    try:
        results = vector_store.search_emails(
            request.query,
            request.n_results,
            request.account_id
        )
        
        return {
            "success": True,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ask")
async def ask_question(request: AskQuestionRequest):
    """Ask a question about emails"""
    try:
        # Search for relevant emails
        relevant_emails = vector_store.search_emails(
            request.question,
            n_results=5,
            account_id=request.account_id
        )
        
        # Generate answer
        answer = ai_assistant.answer_question(request.question, relevant_emails)
        
        return {
            "success": True,
            "answer": answer,
            "sources": relevant_emails
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get system statistics"""
    try:
        accounts = auth_manager.list_accounts()
        email_count = vector_store.get_email_count()
        
        return {
            "accounts_count": len(accounts),
            "emails_indexed": email_count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount static files for frontend
frontend_path = Path(__file__).parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    index_path = frontend_path / "index.html"
    if index_path.exists():
        return index_path.read_text()
    return "Frontend not found"


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

