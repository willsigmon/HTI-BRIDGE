"""
Gmail Authentication Module for Multi-Account Support
Handles OAuth 2.0 authentication and token management for multiple Gmail accounts
"""

import os
import json
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Gmail API scopes - we need full access to read, send, and modify emails
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
]

class GmailAuthManager:
    """Manages authentication for multiple Gmail accounts"""
    
    def __init__(self, credentials_dir='../credentials', tokens_dir='../data/tokens'):
        self.credentials_dir = Path(credentials_dir)
        self.tokens_dir = Path(tokens_dir)
        self.tokens_dir.mkdir(parents=True, exist_ok=True)
        
        # Store active services for each account
        self.services = {}
    
    def get_credentials_path(self):
        """Get the path to the OAuth client credentials file"""
        return self.credentials_dir / 'credentials.json'
    
    def get_token_path(self, account_id):
        """Get the path to the token file for a specific account"""
        return self.tokens_dir / f'token_{account_id}.pickle'
    
    def authenticate_account(self, account_id):
        """
        Authenticate a Gmail account using OAuth 2.0
        Returns the authenticated credentials
        """
        creds = None
        token_path = self.get_token_path(account_id)
        
        # Check if we have a saved token for this account
        if token_path.exists():
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        
        # If credentials don't exist or are invalid, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                # Refresh the token
                creds.refresh(Request())
            else:
                # Start new OAuth flow
                credentials_path = self.get_credentials_path()
                if not credentials_path.exists():
                    raise FileNotFoundError(
                        f"Credentials file not found at {credentials_path}. "
                        "Please download it from Google Cloud Console."
                    )
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    str(credentials_path), SCOPES
                )
                creds = flow.run_local_server(port=0)
            
            # Save the credentials for future use
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
        
        return creds
    
    def get_service(self, account_id):
        """
        Get or create a Gmail API service for a specific account
        """
        if account_id not in self.services:
            creds = self.authenticate_account(account_id)
            self.services[account_id] = build('gmail', 'v1', credentials=creds)
        
        return self.services[account_id]
    
    def list_accounts(self):
        """List all authenticated accounts"""
        accounts = []
        for token_file in self.tokens_dir.glob('token_*.pickle'):
            account_id = token_file.stem.replace('token_', '')
            accounts.append(account_id)
        return accounts
    
    def get_account_email(self, account_id):
        """Get the email address for an authenticated account"""
        try:
            service = self.get_service(account_id)
            profile = service.users().getProfile(userId='me').execute()
            return profile['emailAddress']
        except Exception as e:
            return f"Error: {str(e)}"
    
    def remove_account(self, account_id):
        """Remove an authenticated account"""
        token_path = self.get_token_path(account_id)
        if token_path.exists():
            token_path.unlink()
        
        if account_id in self.services:
            del self.services[account_id]

