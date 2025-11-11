import re
import json # JSON handling के लिए नया इम्पोर्ट
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize the Flask app
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS)
CORS(app)

# --- 1. WHATSAPP PARSING FUNCTION (FIXED) ---
def parse_chat(file_content):
    """
    Parses the exported WhatsApp chat file (TXT format).
    FIXED: Handles non-breaking spaces (\u202f) in the timestamp format.
    """
    # **FIXED REGEX**: It now specifically allows the non-breaking space (\u202f)
    # that WhatsApp uses between time and AM/PM (e.g., "6:03 pm").
    pattern = re.compile(r'(\d{1,2}/\d{1,2}/\d{2,4}),\s*(\d{1,2}:\d{2}[\s\u202f]?[apAPmM]*) - ([^:]+):\s*(.*)')
    
    lines = file_content.strip().split('\n')
    chat_data = []
    
    for line in lines:
        match = pattern.match(line)
        if match:
            # We combine date and time groups into a single string for storage
            date_part, time_part, user, message = match.groups()
            chat_data.append({'date_time': f"{date_part}, {time_part}", 'user': user.strip(), 'message': message.strip()})
        elif chat_data:
            # Handle multi-line messages
            chat_data[-1]['message'] += '\n' + line.strip()

    return pd.DataFrame(chat_data)

# --- 2. INSTAGRAM PARSING FUNCTION (JSON) ---
def parse_instagram_json(file_content):
    """
    Parses the exported Instagram chat file (JSON format).
    """
    try:
        # Load the JSON content
        data = json.loads(file_content)
    except json.JSONDecodeError:
        return pd.DataFrame() # Return empty on decode error

    chat_data = []
    messages = data.get('messages', [])
    
    for msg in messages:
        timestamp_ms = msg.get('timestamp_ms')
        
        message = ""
        
        if 'content' in msg:
            message = msg['content']
            
            if 'sent a photo.' in message or 'sent a video.' in message or 'reacted' in message:
                message = '<Media or Reaction>'
            
        elif msg.get('share'):
            message = '<Shared Post or Reel>'
        elif msg.get('photos') or msg.get('videos'):
             message = '<Media omitted>'
        elif msg.get('type') == 'Generic': 
             message = '<System Message>'
        else:
            continue 

        if message:
            chat_data.append({
                'date_time': timestamp_ms, 
                'user': msg.get('sender_name', 'Unknown User').strip(),
                'message': message.strip()
            })

    return pd.DataFrame(chat_data)


# --- 3. ANALYZE ROUTE ---
@app.route('/analyze', methods=['POST'])
def analyze_chat():
    """
    API endpoint to receive and analyze a chat file based on the 'mode' parameter.
    """
    mode = request.args.get('mode', 'whatsapp') 

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    
    content = file.read().decode('utf-8')
    df = pd.DataFrame()

    if mode == 'whatsapp':
        if not file.filename.lower().endswith('.txt'):
            return jsonify({'error': 'Please upload a .txt file for WhatsApp analysis.'}), 400
        df = parse_chat(content) 
        
    elif mode == 'instagram':
        if not file.filename.lower().endswith('.json'):
            return jsonify({'error': 'Please upload a .json file for Instagram analysis.'}), 400
        
        df = parse_instagram_json(content)
    
    else:
        return jsonify({'error': 'Invalid analysis mode selected.'}), 400

    if df.empty:
        return jsonify({'error': f'Could not parse the chat file. Please check the {mode} format and ensure it is not empty.'}), 400

    # --- Analysis Logic ---
    total_messages = len(df)
    
    # Define keys for items to exclude from word count
    media_system_keys = ['<Media omitted>', '<Shared Post or Reel>', '<Media or Reaction>', '<System Message>']

    # Calculate total words, excluding common media/system keys
    word_count_df = df[~df['message'].isin(media_system_keys)]
    total_words = word_count_df['message'].apply(lambda x: len(x.split())).sum()
    
    # Media/System messages count
    media_messages = df[df['message'].isin(media_system_keys)].shape[0]

    # Top users calculation
    top_users = df['user'].value_counts().head(5)
    
    analysis_results = {
        'total_messages': int(total_messages),
        'total_words': int(total_words),
        'media_messages': int(media_messages),
        'top_users': top_users.to_dict()
    }
    
    return jsonify(analysis_results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)