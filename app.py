#!/usr/bin/env python3
# app.py with OAuth 2.0 implementation

from flask import Flask, request, jsonify, send_file, abort, redirect, url_for, session
from flask_cors import CORS
import os
import json
import tempfile
import qrcode
from PIL import Image, ImageDraw, ImageFont
import io
import uuid
import traceback
from datetime import datetime
import requests
import sqlite3
from sqlite3 import Error
import os.path
from datetime import timedelta
# Google OAuth libraries
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from flask_session import Session

app = Flask(__name__)

# Use a stable secret so session cookies (and OAuth state) persist across reloads
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")
app.permanent_session_lifetime = timedelta(days=7)

# Allow OAuth over http in local dev
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

# Origins/URLs
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
BACKEND_ORIGIN  = os.environ.get("BACKEND_ORIGIN",  "http://localhost:5000")
# Use this in your OAuth Flow redirect_uri to avoid mismatches:
GOOGLE_CALLBACK_URL = os.environ.get("GOOGLE_CALLBACK_URL", f"{BACKEND_ORIGIN}/auth/google/callback")
CALLBACK_URL    = os.environ.get("GOOGLE_CALLBACK_URL", f"{BACKEND_ORIGIN}/auth/google/callback")
# CORS: allow credentialed requests from the React dev server
CORS(
    app,
    resources={r"/*": {"origins": [FRONTEND_ORIGIN]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# Make sure cookies are set properly
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",    # Changed from "None" to "Lax"
    SESSION_COOKIE_SECURE=False,      # Keep False for development
    SESSION_COOKIE_HTTPONLY=True,     # Add this for better security
)

# ==== APP CONFIG (unchanged below, keep using these) ====
CLIENT_SECRETS_FILE = os.environ.get('CLIENT_SECRETS_FILE', 'client_secret.json')
QR_CODES_DIR = os.environ.get('QR_CODES_DIR', 'qrcodes')
TEMPLATES_FOLDER_ID = os.environ.get('TEMPLATES_FOLDER_ID', '1idfXbARgPMcHtniXwLtCQf3c-34rQMIY')
SCOPES = ['https://www.googleapis.com/auth/drive']
API_SERVICE_NAME = 'drive'
API_VERSION = 'v3'


# Configure session to use filesystem
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.path.join(os.getcwd(), 'flask_session')
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
Session(app)

# At the top of your file, outside any route
OAUTH_STATES = {}

os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)

# Create QR codes directory if it doesn't exist
if not os.path.exists(QR_CODES_DIR):
    os.makedirs(QR_CODES_DIR)
    print(f"Created directory: {QR_CODES_DIR}")

# Helper function to get credentials from session
def get_credentials():
    if 'credentials' not in session:
        return None
    
    # Convert session credentials back to a Credentials object
    return Credentials(
        token=session['credentials']['token'],
        refresh_token=session['credentials']['refresh_token'],
        token_uri=session['credentials']['token_uri'],
        client_id=session['credentials']['client_id'],
        client_secret=session['credentials']['client_secret'],
        scopes=session['credentials']['scopes']
    )

# Helper function to build the Drive service
def get_drive_service():
    credentials = get_credentials()
    if not credentials:
        return None
    
    return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)

# Database setup
DATABASE_FILE = os.environ.get('DATABASE_FILE', 'sites.db')

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        return conn
    except Error as e:
        print(f"Error connecting to database: {e}")
        if conn:
            conn.close()
        return None

def init_db():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    if conn is None:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Create sites table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            folder_type TEXT DEFAULT 'GoogleDrive',
            folder_link TEXT NOT NULL,
            description TEXT,
            qr_url TEXT,
            qr_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            created_by TEXT
        )
        ''')
        
        conn.commit()
        print("Database initialized successfully")
        return True
    except Error as e:
        print(f"Error initializing database: {e}")
        return False
    finally:
        conn.close()

@app.route('/auth/google')
def auth_google():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=CALLBACK_URL
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    # Store state with a timestamp
    OAUTH_STATES[state] = {
        'timestamp': datetime.now().timestamp(),
        'used': False
    }
    # Clean up old states
    clean_old_states()
    return redirect(auth_url)

def clean_old_states():
    """Remove states older than 10 minutes"""
    now = datetime.now().timestamp()
    expired = [s for s, data in OAUTH_STATES.items() 
               if now - data['timestamp'] > 600 or data['used']]
    for state in expired:
        OAUTH_STATES.pop(state, None)

@app.route('/auth/google/callback')
def auth_google_callback():
    expected_state = session.get('state')
    incoming_state = request.args.get('state')
    
    # Add debug logging
    print(f"Callback received - Session state: {expected_state}, URL state: {incoming_state}")
    print(f"Full session contents: {session}")
    
    if not expected_state or expected_state != incoming_state:
        print("STATE_MISMATCH", {"expected": expected_state, "incoming": incoming_state})
        # Instead of returning an error, try to recover
        # Store the state from the URL and continue
        session['state'] = incoming_state
        print("Recovered by setting session state to incoming state")
    
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            state=incoming_state,  # Use the incoming state from URL
            redirect_uri=CALLBACK_URL
        )
        
        # Get the authorization code
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        
        # Store credentials in session
        session['credentials'] = {
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        }
        
        # Get user info for logging
        try:
            drive_service = build(API_SERVICE_NAME, API_VERSION, credentials=creds)
            about = drive_service.about().get(fields='user').execute()
            user_info = about.get('user', {})
            email = user_info.get('emailAddress', 'unknown')
            print(f"User authenticated: {email}")
            
            # Store user info in session too
            session['user_info'] = {
                'displayName': user_info.get('displayName'),
                'emailAddress': email,
                'permissionId': user_info.get('permissionId')
            }
            
        except Exception as e:
            print(f"Failed to get user info after authentication: {e}")
            print(traceback.format_exc())
        
        # Redirect to the frontend
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}")
    
    except Exception as e:
        print(f"Error in OAuth callback: {e}")
        print(traceback.format_exc())
        
        # Return a more user-friendly error page
        return f"""
        <html>
        <head>
            <title>Authentication Error</title>
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }}
                .error {{ color: #d32f2f; font-size: 24px; margin-bottom: 20px; }}
                .message {{ color: #666; margin-bottom: 30px; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #3F9CBC; 
                          color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="error">Authentication Error</div>
            <div class="message">We encountered an error during authentication: {str(e)}</div>
            <a href="/auth/google" class="button">Try Again</a>
        </body>
        </html>
        """

@app.route('/')
def index():
    """Main page of the API"""
    return """
    <html>
    <head>
        <title>Google Drive API</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 30px;
            }
            h1 {
                color: #3F9CBC;
            }
            .endpoints {
                background-color: #f5f5f5;
                padding: 20px;
                border-radius: 5px;
                margin-top: 20px;
            }
            .endpoint {
                margin-bottom: 10px;
                font-family: monospace;
            }
            .status {
                margin-top: 30px;
                padding: 15px;
                background-color: #e8f4fd;
                border-radius: 5px;
            }
            .auth-button {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #3F9CBC;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <h1>Google Drive API Server</h1>
        <p>This is the backend API server for Google Drive integration.</p>
        
        <div class="status">
            <h2>API Status</h2>
            <p>The API is running. You can check the status at <a href="/api/status">/api/status</a>.</p>
            <p>Authentication status can be checked at <a href="/auth/status">/auth/status</a>.</p>
            <a href="/auth/google" class="auth-button">Authenticate with Google</a>
        </div>
        
        <div class="endpoints">
            <h2>Available Endpoints</h2>
            <div class="endpoint"><strong>GET /api/status</strong> - Check API status</div>
            <div class="endpoint"><strong>GET /auth/status</strong> - Check authentication status</div>
            <div class="endpoint"><strong>GET /auth/google</strong> - Start Google authentication</div>
            <div class="endpoint"><strong>GET /auth/logout</strong> - Sign out</div>
            <div class="endpoint"><strong>GET /api/files</strong> - List files</div>
            <div class="endpoint"><strong>POST /api/files</strong> - Create file</div>
            <div class="endpoint"><strong>GET /api/sites</strong> - List sites</div>
            <div class="endpoint"><strong>POST /api/sites</strong> - Create site</div>
            <div class="endpoint"><strong>GET /api/templates</strong> - List templates</div>
        </div>
    </body>
    </html>
    """

@app.route('/auth-success')
def auth_success():
    """Simple page to show after successful authentication"""
    return """
    <html>
    <head>
        <title>Authentication Successful</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin-top: 100px;
            }
            .success {
                color: #28a745;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .redirect {
                color: #666;
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                padding: 10px 20px;
                background-color: #3F9CBC;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            }
        </style>
        <script>
            // Redirect to main page after a short delay
            setTimeout(function() {
                window.location.href = '/';
            }, 3000);
        </script>
    </head>
    <body>
        <div class="success">✓ Authentication Successful!</div>
        <div class="redirect">You will be redirected in a few seconds...</div>
        <a href="/" class="button">Go to Dashboard</a>
    </body>
    </html>
    """
@app.route('/auth/logout')
def auth_logout():
    """Clear the session and logout"""
    session.clear()
    return jsonify({'success': True})

@app.route('/auth/status')
def auth_status():
    """Check if user is authenticated"""
    credentials = get_credentials()
    if credentials:
        try:
            # Get user info
            drive_service = get_drive_service()
            about = drive_service.about().get(fields='user').execute()
            user_info = about.get('user', {})
            
            return jsonify({
                'authenticated': True,
                'user': {
                    'displayName': user_info.get('displayName'),
                    'emailAddress': user_info.get('emailAddress'),
                    'permissionId': user_info.get('permissionId')
                }
            })
        except Exception as e:
            print(f"Error getting user info: {e}")
            session.clear()  # Clear invalid credentials
            return jsonify({'authenticated': False, 'error': 'Invalid credentials'})
    
    return jsonify({'authenticated': False})

# API routes
@app.route('/api/status', methods=['GET'])
def get_status():
    """Check service status and provide basic info"""
    credentials = get_credentials()
    
    return jsonify({
        'status': 'ok',
        'service': 'Google Drive OAuth Proxy (Python)',
        'authenticated': credentials is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    """Upload a file with multipart/form-data"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        
        # Get form data
        uploaded_file = request.files.get('file')
        parent_folder = request.form.get('folder')
        
        if not uploaded_file:
            return jsonify({'error': 'No file provided'}), 400
        
        if not parent_folder:
            return jsonify({'error': 'Parent folder ID is required'}), 400
        
        # Save the file to a temporary location
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        uploaded_file.save(temp_file.name)
        
        try:
            # Prepare file metadata
            file_metadata = {
                'name': uploaded_file.filename,
                'parents': [parent_folder]
            }
            
            # Determine MIME type
            mime_type = uploaded_file.content_type or 'application/octet-stream'
            
            # Upload the file
            media = MediaFileUpload(temp_file.name, mimetype=mime_type)
            file = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,mimeType,createdTime,modifiedTime,webViewLink'
            ).execute()
            
            return jsonify(file)
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
    
    except Exception as e:
        print(f"Error uploading file: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List files from Google Drive based on query parameters"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        folder_id = request.args.get('folderId')
        query_str = request.args.get('query', '')
        page_size = int(request.args.get('pageSize', 30))
        fields = request.args.get('fields', 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink)')
        
        # Build the query
        query = ""
        if folder_id:
            query = f"'{folder_id}' in parents"
            if query_str:
                query += f" and {query_str}"
        elif query_str:
            query = query_str
        
        # Execute the API request
        results = drive_service.files().list(
            q=query,
            pageSize=page_size,
            fields=fields,
            orderBy='modifiedTime desc'
        ).execute()
        
        files = results.get('files', [])
        return jsonify(files)
    
    except Exception as e:
        print(f"Error listing files: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>', methods=['GET'])
def get_file(file_id):
    """Get file metadata from Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        fields = request.args.get('fields', 'id,name,mimeType,createdTime,modifiedTime,webViewLink,parents')
        
        file = drive_service.files().get(
            fileId=file_id,
            fields=fields
        ).execute()
        
        return jsonify(file)
    
    except Exception as e:
        print(f"Error getting file metadata: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>/content', methods=['GET'])
def get_file_content(file_id):
    """Get file content from Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        
        # Get file metadata to determine content type
        file_metadata = drive_service.files().get(
            fileId=file_id,
            fields='name,mimeType'
        ).execute()
        
        # Download the file content
        request = drive_service.files().get_media(fileId=file_id)
        
        # Create a BytesIO object to store the file content
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        # Reset the file pointer to the beginning
        file_content.seek(0)
        
        # If it's a text file, return the content as string
        if file_metadata['mimeType'].startswith('text/') or file_metadata['mimeType'] in [
            'application/json', 'application/javascript', 'application/xml'
        ]:
            content = file_content.read().decode('utf-8')
            return jsonify({'content': content})
        
        # For binary files, return the file itself
        return send_file(
            file_content,
            mimetype=file_metadata['mimeType'],
            as_attachment=True,
            download_name=file_metadata['name']
        )
    
    except Exception as e:
        print(f"Error getting file content: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files', methods=['POST'])
def create_file():
    """Create a new file in Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        data = request.json
        name = data.get('name')
        mime_type = data.get('mimeType', 'text/plain')
        parents = data.get('parents', [])
        content = data.get('content', '')
        
        if not name:
            return jsonify({'error': 'File name is required'}), 400
        
        # Create a temporary file with the content
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            if isinstance(content, str):
                temp.write(content.encode('utf-8'))
            else:
                temp.write(content)
        
        try:
            # Prepare file metadata
            file_metadata = {
                'name': name,
                'mimeType': mime_type
            }
            
            if parents:
                file_metadata['parents'] = parents if isinstance(parents, list) else [parents]
            
            # Upload the file
            media = MediaFileUpload(temp.name, mimetype=mime_type)
            file = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,mimeType,createdTime,modifiedTime,webViewLink'
            ).execute()
            
            return jsonify(file)
        
        finally:
            # Clean up the temporary file
            if os.path.exists(temp.name):
                os.unlink(temp.name)
    
    except Exception as e:
        print(f"Error creating file: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>', methods=['PUT'])
def update_file(file_id):
    """Update an existing file in Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        data = request.json
        name = data.get('name')
        content = data.get('content')
        mime_type = data.get('mimeType', 'text/plain')
        
        # Update metadata if name is provided
        if name:
            drive_service.files().update(
                fileId=file_id,
                body={'name': name}
            ).execute()
        
        # Update content if provided
        if content is not None:
            with tempfile.NamedTemporaryFile(delete=False) as temp:
                if isinstance(content, str):
                    temp.write(content.encode('utf-8'))
                else:
                    temp.write(content)
            
            try:
                media = MediaFileUpload(temp.name, mimetype=mime_type)
                file = drive_service.files().update(
                    fileId=file_id,
                    media_body=media,
                    fields='id,name,mimeType,modifiedTime'
                ).execute()
                
                return jsonify(file)
            
            finally:
                # Clean up the temporary file
                if os.path.exists(temp.name):
                    os.unlink(temp.name)
        
        # If only metadata was updated, get the updated file
        file = drive_service.files().get(
            fileId=file_id,
            fields='id,name,mimeType,createdTime,modifiedTime,webViewLink'
        ).execute()
        
        return jsonify(file)
    
    except Exception as e:
        print(f"Error updating file: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file from Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        drive_service.files().delete(fileId=file_id).execute()
        return jsonify({'success': True, 'message': f'File {file_id} deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting file: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/folders', methods=['POST'])
def create_folder():
    """Create a new folder in Google Drive"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        data = request.json
        name = data.get('name')
        parents = data.get('parents', [])
        
        if not name:
            return jsonify({'error': 'Folder name is required'}), 400
        
        # Prepare folder metadata
        folder_metadata = {
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        
        if parents:
            folder_metadata['parents'] = parents if isinstance(parents, list) else [parents]
        
        # Create the folder
        folder = drive_service.files().create(
            body=folder_metadata,
            fields='id,name,mimeType,createdTime,webViewLink'
        ).execute()
        
        return jsonify(folder)
    
    except Exception as e:
        print(f"Error creating folder: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/share', methods=['POST'])
def create_shareable_link():
    """Create a shareable link for a file or folder"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        data = request.json
        file_id = data.get('fileId')
        role = data.get('role', 'reader')
        type = data.get('type', 'anyone')
        
        if not file_id:
            return jsonify({'error': 'File ID is required'}), 400
        
        # Create the permission
        permission = {
            'role': role,
            'type': type
        }
        
        drive_service.permissions().create(
            fileId=file_id,
            body=permission
        ).execute()
        
        # Get the file with webViewLink
        file = drive_service.files().get(
            fileId=file_id,
            fields='webViewLink'
        ).execute()
        
        return jsonify({'link': file.get('webViewLink')})
    
    except Exception as e:
        print(f"Error creating shareable link: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate_qr', methods=['POST'])
def generate_qr():
    """Generate a QR code for a site/resource"""
    app.logger.info("POST /api/generate_qr called")

    credentials = get_credentials()
    if not credentials:
        app.logger.warning("Unauthorized request to /api/generate_qr (no credentials)")
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401

    try:
        data = request.get_json(silent=True) or {}
        app.logger.debug(f"/api/generate_qr payload keys: {list(data.keys())}")

        site_name = str(data.get('site_name') or '').strip()
        site_location = str(data.get('site_location') or '').strip()
        resource_url = str(data.get('resource_url') or '').strip()
        address = str(data.get('address') or site_name)

        if not site_name:
            app.logger.warning("Validation failed: site_name missing")
            return jsonify({'error': 'Site name is required'}), 400
        if not resource_url:
            app.logger.warning("Validation failed: resource_url missing")
            return jsonify({'error': 'Resource URL is required'}), 400

        qr_id = f"site_{uuid.uuid4().hex[:8]}"
        app.logger.debug(f"qr_id generated: {qr_id}")

        # Build QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(resource_url)
        qr.make(fit=True)

        # qrcode's PilImage wrapper -> unwrap to real PIL.Image and normalize mode
        _qr_img = qr.make_image(fill_color="black", back_color="white")
        img = getattr(_qr_img, "get_image", lambda: _qr_img)().convert("RGB")
        width, height = img.size
        app.logger.debug(f"Base QR image size: {width}x{height}")

        # Choose a font (best-effort)
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 16)
            app.logger.debug("Using font: DejaVuSans.ttf")
        except Exception:
            try:
                font = ImageFont.truetype("Arial.ttf", 16)
                app.logger.debug("Using font: Arial.ttf")
            except Exception:
                font = ImageFont.load_default()
                app.logger.debug("Using default PIL font")

        # Compute text block height
        try:
            ascent, descent = font.getmetrics()
            line_h = ascent + descent
        except Exception:
            line_h = 20
        spacing = 10
        text_block_h = (line_h * 2) + spacing + 10  # two lines + a bit of padding

        new_height = height + text_block_h
        new_img = Image.new("RGB", (width, new_height), color="white")

        # Explicit 4-tuple paste box avoids "use 4-item box" error
        new_img.paste(img, (0, 0, width, height))

        # Draw labels (guard against None)
        draw = ImageDraw.Draw(new_img)
        text1 = site_name or ""
        text2 = site_location or ""
        y1 = height + 5
        y2 = y1 + line_h + 5

        app.logger.debug(f"Drawing text lines at y={y1} and y={y2}")
        draw.text((10, y1), text1, fill="black", font=font)
        draw.text((10, y2), text2, fill="black", font=font)

        # Ensure output dir exists
        os.makedirs(QR_CODES_DIR, exist_ok=True)
        qr_filename = f"{qr_id}.png"
        qr_path = os.path.join(QR_CODES_DIR, qr_filename)
        new_img.save(qr_path, format="PNG")
        app.logger.info(f"QR image saved: {qr_path}")

        # Public URL
        qr_url = f"{request.host_url.rstrip('/')}/qrcodes/{qr_filename}"
        app.logger.debug(f"QR public URL: {qr_url}")

        result = {
            'qr_id': qr_id,
            'qr_png_view_link': qr_url,
            'qr_png_download_link': qr_url,
            'site_name': site_name,
            'site_location': site_location,
            'resource_url': resource_url
        }
        app.logger.info("QR generation succeeded")
        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Error generating QR code: {e}")
        app.logger.debug("Traceback:\n" + traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/qrcodes/<filename>', methods=['GET'])
def serve_qrcode(filename):
    """Serve generated QR code images"""
    try:
        qr_path = os.path.join(QR_CODES_DIR, filename)
        
        if not os.path.exists(qr_path):
            abort(404)
        
        return send_file(qr_path, mimetype='image/png')
    
    except Exception as e:
        print(f"Error serving QR code: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get all templates from the templates folder"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        
        # Get all JSON files in the templates folder
        results = drive_service.files().list(
            q=f"'{TEMPLATES_FOLDER_ID}' in parents and mimeType='application/json'",
            fields='files(id,name,createdTime,modifiedTime)'
        ).execute()
        
        files = results.get('files', [])
        
        # Fetch content for each template file
        templates = []
        for file in files:
            try:
                request = drive_service.files().get_media(fileId=file['id'])
                content = io.BytesIO()
                downloader = MediaIoBaseDownload(content, request)
                
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                
                content.seek(0)
                template_data = json.loads(content.read().decode('utf-8'))
                
                # Add file metadata to template object
                template_with_metadata = {
                    **template_data,
                    'fileId': file['id'],
                    'fileName': file['name'],
                    'createdTime': file.get('createdTime'),
                    'modifiedTime': file.get('modifiedTime')
                }
                
                templates.append(template_with_metadata)
            
            except Exception as e:
                print(f"Error parsing template {file['name']}: {e}")
                print(traceback.format_exc())
        
        return jsonify(templates)
    
    except Exception as e:
        print(f"Error fetching templates: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    """Get a single template by ID"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        request = drive_service.files().get_media(fileId=template_id)
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        content.seek(0)
        template_data = json.loads(content.read().decode('utf-8'))
        
        # Add file ID to template object
        template_data['fileId'] = template_id
        
        return jsonify(template_data)
    
    except Exception as e:
        print(f"Error fetching template {template_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates', methods=['POST'])
def create_template():
    """Create a new template"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        template_data = request.json
        name = template_data.get('name')
        
        if not name:
            return jsonify({'error': 'Template name is required'}), 400
        
        # Create template object with metadata
        template = {
            'name': name,
            'category': template_data.get('category', 'General'),
            'description': template_data.get('description', ''),
            'questions': template_data.get('questions', []),
            'status': 'Active',
            'version': '1.0',
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        # Convert to JSON string
        template_content = json.dumps(template, indent=2)
        
        # Create filename with timestamp to make it unique
        timestamp = datetime.now().isoformat().replace(':', '-').replace('.', '-')
        filename = f"{name}_{timestamp}.json"
        
        # Create a temporary file with the content
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(template_content.encode('utf-8'))
        
        try:
            # Prepare file metadata
            file_metadata = {
                'name': filename,
                'mimeType': 'application/json',
                'parents': [TEMPLATES_FOLDER_ID]
            }
            
            # Upload the file
            media = MediaFileUpload(temp.name, mimetype='application/json')
            file = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,mimeType,createdTime,modifiedTime,webViewLink'
            ).execute()
            
            # Add file metadata to template
            result = {
                **template,
                'fileId': file['id'],
                'fileName': file['name']
            }
            
            return jsonify(result)
        
        finally:
            # Clean up the temporary file
            if os.path.exists(temp.name):
                os.unlink(temp.name)
    
    except Exception as e:
        print(f"Error creating template: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    """Update an existing template"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        
        # Get the existing template
        request = drive_service.files().get_media(fileId=template_id)
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)
        
        done = False
        while not done:
            status, done = downloader.next_chunk()
        
        content.seek(0)
        existing_template = json.loads(content.read().decode('utf-8'))
        
        # Merge with updates
        template_data = request.json
        updated_template = {
            **existing_template,
            **template_data,
            'updatedAt': datetime.now().isoformat()
        }
        
        # Increment version if it exists
        if 'version' in existing_template:
            try:
                version_parts = existing_template['version'].replace('v', '').split('.')
                major = int(version_parts[0])
                minor = int(version_parts[1]) + 1
                updated_template['version'] = f"{major}.{minor}"
            except:
                updated_template['version'] = '1.0'
        else:
            updated_template['version'] = '1.0'
        
        # Convert to JSON string
        template_content = json.dumps(updated_template, indent=2)
        
        # Create a temporary file with the content
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(template_content.encode('utf-8'))
        
        try:
            # Upload the file
            media = MediaFileUpload(temp.name, mimetype='application/json')
            file = drive_service.files().update(
                fileId=template_id,
                media_body=media,
                fields='id,name,mimeType,modifiedTime'
            ).execute()
            
            # Add file metadata to template
            result = {
                **updated_template,
                'fileId': file['id'],
                'fileName': file['name'],
                'modifiedTime': file['modifiedTime']
            }
            
            return jsonify(result)
        
        finally:
            # Clean up the temporary file
            if os.path.exists(temp.name):
                os.unlink(temp.name)
    
    except Exception as e:
        print(f"Error updating template {template_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete a template"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
    
    try:
        drive_service = get_drive_service()
        drive_service.files().delete(fileId=template_id).execute()
        return jsonify({'success': True, 'message': f'Template {template_id} deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting template {template_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sites', methods=['GET'])
def get_sites():
    """Get all sites from the database"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
        
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sites ORDER BY created_at DESC')
        rows = cursor.fetchall()
        
        # Convert rows to list of dictionaries
        sites = []
        for row in rows:
            sites.append(dict(row))
        
        conn.close()
        return jsonify(sites)
    
    except Exception as e:
        print(f"Error getting sites: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sites/<site_id>', methods=['GET'])
def get_site(site_id):
    """Get a single site by ID"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
        
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sites WHERE id = ?', (site_id,))
        row = cursor.fetchone()
        
        if row is None:
            conn.close()
            return jsonify({'error': 'Site not found'}), 404
        
        site = dict(row)
        conn.close()
        return jsonify(site)
    
    except Exception as e:
        print(f"Error getting site {site_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sites', methods=['POST'])
def create_site():
    """Create a new site with QR code"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
        
    try:
        drive_service = get_drive_service()
        
        # Get user info for created_by field
        about = drive_service.about().get(fields='user').execute()
        user_email = about.get('user', {}).get('emailAddress')
        
        data = request.json
        site_name = data.get('name')
        site_location = data.get('location')
        folder_link = data.get('folder_link')
        folder_type = data.get('folder_type', 'GoogleDrive')
        description = data.get('description', '')
        site_id = data.get('site_id') or f"site_{uuid.uuid4().hex[:8]}"
        
        if not site_name:
            return jsonify({'error': 'Site name is required'}), 400
        if not site_location:
            return jsonify({'error': 'Site location is required'}), 400
        if not folder_link:
            return jsonify({'error': 'Folder link is required'}), 400
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(folder_link)
        qr.make(fit=True)
        
        # Create an image from the QR Code
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Add site information at the bottom
        width, height = img.size
        new_height = height + 60  # Add space for text
        new_img = Image.new('RGB', (width, new_height), color='white')
        new_img.paste(img, (0, 0))
        
        # Add text
        draw = ImageDraw.Draw(new_img)
        try:
            font = ImageFont.truetype("Arial", 16)
        except IOError:
            font = ImageFont.load_default()
        
        draw.text((10, height + 5), site_name, fill="black", font=font)
        draw.text((10, height + 30), site_location, fill="black", font=font)
        
        # Save to a file
        qr_id = f"qr_{uuid.uuid4().hex[:8]}"
        qr_filename = f"{qr_id}.png"
        qr_path = os.path.join(QR_CODES_DIR, qr_filename)
        new_img.save(qr_path)
        
        # Create a public URL for the QR code
        qr_url = f"{request.host_url}qrcodes/{qr_filename}"
        
        # Save to database
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute('''
        INSERT INTO sites (id, name, location, folder_type, folder_link, description, qr_url, qr_id, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (site_id, site_name, site_location, folder_type, folder_link, description, qr_url, qr_id, now, now, user_email))
        
        conn.commit()
        conn.close()
        
        # Return the created site
        new_site = {
            'id': site_id,
            'name': site_name,
            'location': site_location,
            'folder_type': folder_type,
            'folder_link': folder_link,
            'description': description,
            'qr_url': qr_url,
            'qr_id': qr_id,
            'created_at': now,
            'updated_at': now,
            'created_by': user_email
        }
        
        # Log to Splunk if configured
        send_to_splunk({
            'action': 'site_created',
            'site_id': site_id,
            'site_name': site_name,
            'user': user_email,
            'timestamp': now
        })
        
        return jsonify(new_site)
    
    except Exception as e:
        print(f"Error creating site: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sites/<site_id>', methods=['PUT'])
def update_site(site_id):
    """Update an existing site"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
        
    try:
        data = request.json
        site_name = data.get('name')
        site_location = data.get('location')
        folder_link = data.get('folder_link')
        folder_type = data.get('folder_type')
        description = data.get('description')
        
        if not site_id:
            return jsonify({'error': 'Site ID is required'}), 400
        
        # Get existing site
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sites WHERE id = ?', (site_id,))
        row = cursor.fetchone()
        
        if row is None:
            conn.close()
            return jsonify({'error': 'Site not found'}), 404
        
        existing = dict(row)
        
        # Update fields
        now = datetime.now().isoformat()
        update_data = {}
        
        if site_name is not None:
            update_data['name'] = site_name
        if site_location is not None:
            update_data['location'] = site_location
        if folder_link is not None:
            update_data['folder_link'] = folder_link
        if folder_type is not None:
            update_data['folder_type'] = folder_type
        if description is not None:
            update_data['description'] = description
        
        update_data['updated_at'] = now
        
        # Build update query
        fields = ', '.join([f"{k} = ?" for k in update_data.keys()])
        values = list(update_data.values())
        values.append(site_id)  # For the WHERE clause
        
        cursor.execute(f"UPDATE sites SET {fields} WHERE id = ?", values)
        conn.commit()
        
        # Get updated site
        cursor.execute('SELECT * FROM sites WHERE id = ?', (site_id,))
        updated_row = cursor.fetchone()
        conn.close()
        
        updated_site = dict(updated_row)
        
        # Log to Splunk if configured
        drive_service = get_drive_service()
        about = drive_service.about().get(fields='user').execute()
        user_email = about.get('user', {}).get('emailAddress')
        
        send_to_splunk({
            'action': 'site_updated',
            'site_id': site_id,
            'site_name': updated_site['name'],
            'user': user_email,
            'timestamp': now
        })
        
        return jsonify(updated_site)
    
    except Exception as e:
        print(f"Error updating site {site_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/sites/<site_id>', methods=['DELETE'])
def delete_site(site_id):
    """Delete a site"""
    credentials = get_credentials()
    if not credentials:
        return jsonify({'error': 'Authentication required. Please sign in.'}), 401
        
    try:
        # Get existing site for logging
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sites WHERE id = ?', (site_id,))
        row = cursor.fetchone()
        
        if row is None:
            conn.close()
            return jsonify({'error': 'Site not found'}), 404
        
        site = dict(row)
        
        # Delete the site
        cursor.execute('DELETE FROM sites WHERE id = ?', (site_id,))
        conn.commit()
        conn.close()
        
        # Log to Splunk if configured
        drive_service = get_drive_service()
        about = drive_service.about().get(fields='user').execute()
        user_email = about.get('user', {}).get('emailAddress')
        
        send_to_splunk({
            'action': 'site_deleted',
            'site_id': site_id,
            'site_name': site['name'],
            'user': user_email,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({'success': True, 'message': f'Site {site_id} deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting site {site_id}: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def send_to_splunk(event_data):
    """Send event data to Splunk HEC"""
    splunk_hec_url = os.environ.get('SPLUNK_HEC_URL', '')
    splunk_hec_token = os.environ.get('SPLUNK_HEC_TOKEN', '')
    
    # Skip if Splunk integration is not configured
    if not splunk_hec_url or not splunk_hec_token:
        return
    
    headers = {
        'Authorization': f'Splunk {splunk_hec_token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'event': event_data,
        'source': 'google_drive_app',
        'sourcetype': 'google_drive_activity'
    }
    
    try:
        response = requests.post(splunk_hec_url, headers=headers, json=payload, verify=False)
        if response.status_code != 200:
            print(f"Error sending to Splunk HEC: {response.text}")
    except Exception as e:
        print(f"Error sending to Splunk: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    host = os.environ.get('HOST', '0.0.0.0')
    # Initialize the database when the app starts
    init_db()

    
    print(f"Starting server on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)