"""
AI Assistant Module
Handles email drafting, question answering, and inline editing using LLM
"""

import os
from openai import OpenAI

class AIAssistant:
    """AI assistant for email drafting and question answering"""
    
    def __init__(self):
        # Use the pre-configured OpenAI client with environment variables
        self.client = OpenAI()
        self.model = "gemini-2.5-flash"  # Fast and free model
    
    def draft_reply(self, original_email, user_instruction, previous_draft=None):
        """
        Draft a reply to an email based on user instruction
        
        Args:
            original_email: Dictionary containing the original email data
            user_instruction: User's instruction for the reply
            previous_draft: Optional previous draft for refinement
        
        Returns:
            Generated email draft as a string
        """
        try:
            # Build the context
            context = self._build_email_context(original_email)
            
            # Build the prompt
            if previous_draft:
                prompt = f"""You are an AI email assistant. The user wants to refine a previous draft.

Original Email:
{context}

Previous Draft:
{previous_draft}

User's Refinement Request: {user_instruction}

Generate an improved email draft based on the user's feedback. Only return the email body, no subject line or greetings unless specifically requested."""
            else:
                prompt = f"""You are an AI email assistant. Draft a professional reply to the following email.

Original Email:
{context}

User's Instructions: {user_instruction}

Generate a professional email reply. Only return the email body, no subject line unless specifically requested. Keep it concise and professional."""
            
            # Call the LLM
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional email writing assistant. Write clear, concise, and professional emails."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            draft = response.choices[0].message.content.strip()
            return draft
        
        except Exception as e:
            print(f"Error generating draft: {str(e)}")
            return f"Error: Could not generate draft. {str(e)}"
    
    def answer_question(self, question, relevant_emails):
        """
        Answer a question about emails using retrieved context
        
        Args:
            question: User's question
            relevant_emails: List of relevant email data from vector search
        
        Returns:
            Answer as a string
        """
        try:
            # Build context from relevant emails
            context = self._build_search_context(relevant_emails)
            
            prompt = f"""You are an AI email assistant. Answer the user's question based on their email history.

Relevant Emails:
{context}

User's Question: {question}

Provide a clear and concise answer based on the email information above. If the information is not sufficient, say so."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful email assistant that answers questions about email history."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content.strip()
            return answer
        
        except Exception as e:
            print(f"Error answering question: {str(e)}")
            return f"Error: Could not answer question. {str(e)}"
    
    def compose_new_email(self, user_instruction):
        """
        Compose a new email from scratch
        
        Args:
            user_instruction: User's instruction for the email
        
        Returns:
            Generated email as a dictionary with subject and body
        """
        try:
            prompt = f"""You are an AI email assistant. Compose a professional email based on the user's request.

User's Request: {user_instruction}

Generate a professional email with a subject line and body. Format your response as:
SUBJECT: [subject line]
BODY:
[email body]"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional email writing assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse the response
            subject = ""
            body = ""
            
            if "SUBJECT:" in result:
                parts = result.split("BODY:", 1)
                subject = parts[0].replace("SUBJECT:", "").strip()
                body = parts[1].strip() if len(parts) > 1 else ""
            else:
                body = result
            
            return {
                "subject": subject,
                "body": body
            }
        
        except Exception as e:
            print(f"Error composing email: {str(e)}")
            return {
                "subject": "Error",
                "body": f"Could not compose email. {str(e)}"
            }
    
    def _build_email_context(self, email_data):
        """Build a context string from email data"""
        return f"""From: {email_data['from']}
To: {email_data['to']}
Subject: {email_data['subject']}
Date: {email_data['date']}

{email_data['body']}"""
    
    def _build_search_context(self, relevant_emails):
        """Build a context string from multiple emails"""
        context_parts = []
        
        for i, email_match in enumerate(relevant_emails, 1):
            metadata = email_match['metadata']
            context_parts.append(f"""Email {i}:
From: {metadata['from']}
Subject: {metadata['subject']}
Date: {metadata['date']}
Snippet: {metadata['snippet']}
---""")
        
        return "\n\n".join(context_parts)

