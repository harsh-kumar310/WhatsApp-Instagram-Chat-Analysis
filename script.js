// New Toggles
const whatsappToggle = document.getElementById('whatsapp-toggle');
const instagramToggle = document.getElementById('instagram-toggle');
const body = document.body;

// Analyzer Elements
const analyzerTitle = document.getElementById('analyzer-title');
const analyzerParagraph = document.getElementById('analyzer-paragraph');
const chatFileInput = document.getElementById('chatFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsDiv = document.getElementById('results');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error');
const totalMessagesEl = document.getElementById('totalMessages');
const totalWordsEl = document.getElementById('totalWords');
const mediaMessagesEl = document.getElementById('mediaMessages');
const topUsersListEl = document.getElementById('topUsersList');


// Instruction Containers
const whatsappInstructions = document.getElementById('whatsapp-instructions');
const instagramInstructions = document.getElementById('instagram-instructions');

// State variable to track current mode
let currentMode = 'whatsapp'; // Default mode

function switchMode(mode) {
    if (mode === currentMode) return;

    currentMode = mode;
    
    // 1. Update Buttons
    whatsappToggle.classList.toggle('active', mode === 'whatsapp');
    instagramToggle.classList.toggle('active', mode === 'instagram');
    
    // 2. Update Body Class (for CSS styling/BG Image)
    body.classList.toggle('instagram-mode', mode === 'instagram');
    
    // 3. Update Instructions, File Type, and Analyzer Text
    if (mode === 'whatsapp') {
        // --- NEW: Show WhatsApp Instructions ---
        whatsappInstructions.classList.remove('hidden-mode');
        whatsappInstructions.classList.add('active-mode');
        // --- NEW: Hide Instagram Instructions ---
        instagramInstructions.classList.remove('active-mode');
        instagramInstructions.classList.add('hidden-mode');

        // Update Analyzer Box Content
        analyzerTitle.innerHTML = 'WhatsApp Chat Analyzer <i class="fa-brands fa-whatsapp"></i>';
        analyzerParagraph.textContent = 'Upload your exported WhatsApp .txt file to get insights.';
        chatFileInput.accept = '.txt'; 

    } else { // mode === 'instagram'
        // --- NEW: Hide WhatsApp Instructions ---
        whatsappInstructions.classList.remove('active-mode');
        whatsappInstructions.classList.add('hidden-mode');
        // --- NEW: Show Instagram Instructions ---
        instagramInstructions.classList.remove('hidden-mode');
        instagramInstructions.classList.add('active-mode');
        
        // Update Analyzer Box Content
        analyzerTitle.innerHTML = 'Instagram Chat Analyzer <i class="fa-brands fa-instagram"></i>';
        analyzerParagraph.textContent = 'Upload your exported Instagram .json file to get insights.';
        chatFileInput.accept = '.json'; 
    }
    
    // Clear old file selection, results, and loader
    chatFileInput.value = '';
    resultsDiv.style.display = 'none';
    errorDiv.textContent = '';
    loader.style.display = 'none'; // Ensure loader is hidden when switching modes
}

// Add event listeners for the new buttons
whatsappToggle.addEventListener('click', () => switchMode('whatsapp'));
instagramToggle.addEventListener('click', () => switchMode('instagram'));


// Initial Call to set up the default state correctly (optional, but good practice)
// switchMode('whatsapp'); 


analyzeBtn.addEventListener('click', () => {
    const file = chatFileInput.files[0];

    
    if (!file) {
        errorDiv.textContent = 'Please select a file first!';
        return;
    }

    
    const formData = new FormData();
    formData.append('file', file);

    
    loader.style.display = 'block';
    resultsDiv.style.display = 'none';
    errorDiv.textContent = '';

    
    // API call now includes the mode parameter
    fetch(`http://127.0.0.1:5000/analyze?mode=${currentMode}`, {
    method: 'POST',
    body: formData
})
    .then(response => {
        if (!response.ok) {
            
            throw new Error('Server responded with an error');
        }
        return response.json();
    })
    .then(data => {
        console.log('Analysis Results:', data);
        loader.style.display = 'none';
        
        
        totalMessagesEl.textContent = data.total_messages.toLocaleString();
        totalWordsEl.textContent = data.total_words.toLocaleString();
        mediaMessagesEl.textContent = data.media_messages.toLocaleString();

        topUsersListEl.innerHTML = ''; 
        for (const user in data.top_users) {
            const listItem = document.createElement('li');
            listItem.textContent = `${user}: ${data.top_users[user].toLocaleString()} messages`;
            topUsersListEl.appendChild(listItem);
        }

        
        resultsDiv.style.display = 'block';
    })
    .catch(error => {
        console.error('An error occurred:', error);
    alert('Failed to fetch analysis. Make sure the backend is running and the file format is correct.');
        // loader.style.display = 'none';
        // console.error('Error:', error);
        // errorDiv.textContent = `An error occurred: ${error.message}`;
    });
});