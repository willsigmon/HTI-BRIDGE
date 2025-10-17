"""
Email Manager Module
Handles fetching, processing, and sending emails across multiple accounts
"""

import base64
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict, Optional

class EmailManager:
    """Manages email operations for Gmail accounts"""
    
    def __init__(self, auth_manager):
        self.auth_manager = auth_manager
    
    def fetch_recent_emails(self, account_id, max_results=50, query=''):
        """
        Fetch recent emails from a Gmail account
        
        Args:
            account_id: The account identifier
            max_results: Maximum number of emails to fetch
            query: Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')
        
        Returns:
            List of email dictionaries with metadata and content
        """
        try:
            service = self.auth_manager.get_service(account_id)
            
            # Get list of messages
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q=query
            ).execute()
            
            messages = results.get('messages', [])
            
            emails = []
            for msg in messages:
                email_data = self.get_email_details(account_id, msg['id'])
                if email_data:
                    emails.append(email_data)
            
            return emails
        
        except Exception as e:
            print(f"Error fetching emails for {account_id}: {str(e)}")
            return []
    
    def get_email_details(self, account_id, message_id):
        """Get detailed information about a specific email"""
        try:
            service = self.auth_manager.get_service(account_id)
            
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            headers = message['payload']['headers']
            
            # Extract key header information
            subject = self._get_header(headers, 'Subject')
            from_email = self._get_header(headers, 'From')
            to_email = self._get_header(headers, 'To')
            date = self._get_header(headers, 'Date')
            
            # Extract email body
            body = self._get_email_body(message['payload'])
            
            return {
                'id': message_id,
                'thread_id': message['threadId'],
                'account_id': account_id,
                'subject': subject,
                'from': from_email,
                'to': to_email,
                'date': date,
                'body': body,
                'snippet': message.get('snippet', ''),
                'labels': message.get('labelIds', [])
            }
        
        except Exception as e:
            print(f"Error getting email details: {str(e)}")
            return None
    
    def _get_header(self, headers, name):
        """Extract a specific header value"""
        for header in headers:
            if header['name'].lower() == name.lower():
                return header['value']
        return ''
    
    def _get_email_body(self, payload):
        """Extract the email body from the payload"""
        body = ''
        
        if 'parts' in payload:
            # Multipart message
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(
                            part['body']['data']
                        ).decode('utf-8')
                        break
                elif part['mimeType'] == 'text/html' and not body:
                    if 'data' in part['body']:
                        body = base64.urlsafe_b64decode(
                            part['body']['data']
                        ).decode('utf-8')
        else:
            # Simple message
            if 'data' in payload['body']:
                body = base64.urlsafe_b64decode(
                    payload['body']['data']
                ).decode('utf-8')
        
        return body
    
    def send_email(self, account_id, to, subject, body, thread_id=None, message_id=None):
        """
        Send an email from a specific account
        
        Args:
            account_id: The account to send from
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text or HTML)
            thread_id: Optional thread ID for replies
            message_id: Optional message ID for replies
        
        Returns:
            Sent message object or None if failed
        """
        try:
            service = self.auth_manager.get_service(account_id)
            
            message = MIMEMultipart('alternative')
            message['To'] = to
            message['Subject'] = subject
            
            # Add reply headers if this is a reply
            if message_id:
                message['In-Reply-To'] = message_id
                message['References'] = message_id
            
            # Attach the body
            part = MIMEText(body, 'plain')
            message.attach(part)
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode('utf-8')
            
            send_message = {'raw': raw_message}
            
            # Add thread ID if this is a reply
            if thread_id:
                send_message['threadId'] = thread_id
            
            # Send the message
            sent = service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return sent
        
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return None
    
    def get_thread_messages(self, account_id, thread_id):
        """Get all messages in a thread"""
        try:
            service = self.auth_manager.get_service(account_id)
            
            thread = service.users().threads().get(
                userId='me',
                id=thread_id
            ).execute()
            
            messages = []
            for msg in thread['messages']:
                email_data = self.get_email_details(account_id, msg['id'])
                if email_data:
                    messages.append(email_data)
            
            return messages
        
        except Exception as e:
            print(f"Error getting thread: {str(e)}")
            return []
    
    def mark_as_read(self, account_id, message_id):
        """Mark an email as read"""
        try:
            service = self.auth_manager.get_service(account_id)
            
            service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
            
            return True
        
        except Exception as e:
            print(f"Error marking as read: {str(e)}")
            return False

