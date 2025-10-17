"""
Vector Store Module
Manages email embeddings and semantic search using ChromaDB
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from pathlib import Path
import json

class EmailVectorStore:
    """Manages vector embeddings for email search"""
    
    def __init__(self, data_dir='../data/chroma'):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.data_dir),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="emails",
            metadata={"description": "Email embeddings for semantic search"}
        )
        
        # Initialize the embedding model
        print("Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Embedding model loaded successfully")
    
    def add_email(self, email_data):
        """
        Add an email to the vector store
        
        Args:
            email_data: Dictionary containing email information
        """
        try:
            # Create a searchable text from email
            searchable_text = self._create_searchable_text(email_data)
            
            # Generate embedding
            embedding = self.model.encode(searchable_text).tolist()
            
            # Create unique ID
            doc_id = f"{email_data['account_id']}_{email_data['id']}"
            
            # Store in ChromaDB
            self.collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[searchable_text],
                metadatas=[{
                    'account_id': email_data['account_id'],
                    'message_id': email_data['id'],
                    'thread_id': email_data['thread_id'],
                    'subject': email_data['subject'],
                    'from': email_data['from'],
                    'to': email_data['to'],
                    'date': email_data['date'],
                    'snippet': email_data['snippet']
                }]
            )
            
            return True
        
        except Exception as e:
            print(f"Error adding email to vector store: {str(e)}")
            return False
    
    def _create_searchable_text(self, email_data):
        """Create a searchable text representation of an email"""
        parts = [
            f"Subject: {email_data['subject']}",
            f"From: {email_data['from']}",
            f"To: {email_data['to']}",
            f"Body: {email_data['body'][:1000]}"  # Limit body length
        ]
        return "\n".join(parts)
    
    def search_emails(self, query, n_results=5, account_id=None):
        """
        Search for emails using semantic similarity
        
        Args:
            query: Natural language search query
            n_results: Number of results to return
            account_id: Optional filter by account
        
        Returns:
            List of matching email metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.model.encode(query).tolist()
            
            # Build where clause for filtering
            where = None
            if account_id:
                where = {"account_id": account_id}
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where
            )
            
            # Format results
            matches = []
            if results['metadatas'] and len(results['metadatas']) > 0:
                for i, metadata in enumerate(results['metadatas'][0]):
                    matches.append({
                        'metadata': metadata,
                        'distance': results['distances'][0][i] if 'distances' in results else None,
                        'document': results['documents'][0][i] if 'documents' in results else None
                    })
            
            return matches
        
        except Exception as e:
            print(f"Error searching emails: {str(e)}")
            return []
    
    def get_email_count(self):
        """Get the total number of emails in the vector store"""
        try:
            return self.collection.count()
        except Exception as e:
            print(f"Error getting email count: {str(e)}")
            return 0
    
    def clear_account_emails(self, account_id):
        """Remove all emails for a specific account"""
        try:
            # Get all IDs for this account
            results = self.collection.get(
                where={"account_id": account_id}
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                return True
            
            return False
        
        except Exception as e:
            print(f"Error clearing account emails: {str(e)}")
            return False
    
    def email_exists(self, account_id, message_id):
        """Check if an email already exists in the vector store"""
        try:
            doc_id = f"{account_id}_{message_id}"
            result = self.collection.get(ids=[doc_id])
            return len(result['ids']) > 0
        except Exception as e:
            return False

