// Création de la sidebar
function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-chat-sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2>AI Chat</h2>
            <button id="close-sidebar">×</button>
        </div>
        <div class="api-keys">
            <input type="password" id="openai-key" placeholder="OpenAI API Key">
            <input type="password" id="anthropic-key" placeholder="Anthropic API Key">
            <input type="password" id="gemini-key" placeholder="Gemini API Key">
            <input type="password" id="deepseek-key" placeholder="DeepSeek API Key">
            <button id="save-keys">Save Keys</button>
        </div>
        <div class="model-selector">
            <select id="model-select">
                <option value="gpt">ChatGPT</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="deepseek">DeepSeek</option>
            </select>
        </div>
        <div class="chat-container">
            <div id="chat-messages"></div>
            <div class="input-container">
                <textarea id="user-input" placeholder="Type your message..."></textarea>
                <button id="send-message">Send</button>
            </div>
        </div>
    `;
    document.body.appendChild(sidebar);

    // Ajout des event listeners
    document.getElementById('close-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('save-keys').addEventListener('click', saveApiKeys);
    document.getElementById('send-message').addEventListener('click', sendMessage);
}

// Fonction pour basculer la sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('ai-chat-sidebar');
    sidebar.classList.toggle('active');
}

// Sauvegarde des clés API
function saveApiKeys() {
    const keys = {
        openai: document.getElementById('openai-key').value,
        anthropic: document.getElementById('anthropic-key').value,
        gemini: document.getElementById('gemini-key').value,
        deepseek: document.getElementById('deepseek-key').value
    };
    chrome.storage.local.set({ apiKeys: keys }, () => {
        alert('API keys saved!');
    });
}

// Envoi de message
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    const model = document.getElementById('model-select').value;
    const chatMessages = document.getElementById('chat-messages');
    
    // Ajouter le message de l'utilisateur
    appendMessage('user', message);
    input.value = '';

    try {
        const response = await sendToAI(model, message);
        appendMessage('ai', response);
    } catch (error) {
        appendMessage('error', 'Error: ' + error.message);
    }
}

// Ajouter un message au chat
function appendMessage(type, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Envoyer le message à l'IA appropriée
async function sendToAI(model, message) {
    const keys = await new Promise(resolve => {
        chrome.storage.local.get('apiKeys', data => resolve(data.apiKeys));
    });

    switch (model) {
        case 'gpt':
            return await sendToOpenAI(keys.openai, message);
        case 'claude':
            return await sendToClaude(keys.anthropic, message);
        case 'gemini':
            return await sendToGemini(keys.gemini, message);
        case 'deepseek':
            return await sendToDeepSeek(keys.deepseek, message);
        default:
            throw new Error('Invalid model selected');
    }
}

// Implémentations des appels API (à compléter selon les spécifications de chaque API)
async function sendToOpenAI(apiKey, message) {
    // TODO: Implémenter l'appel à l'API OpenAI
    return "Réponse de ChatGPT (à implémenter)";
}

async function sendToClaude(apiKey, message) {
    // TODO: Implémenter l'appel à l'API Anthropic
    return "Réponse de Claude (à implémenter)";
}

async function sendToGemini(apiKey, message) {
    // TODO: Implémenter l'appel à l'API Gemini
    return "Réponse de Gemini (à implémenter)";
}

async function sendToDeepSeek(apiKey, message) {
    // TODO: Implémenter l'appel à l'API DeepSeek
    return "Réponse de DeepSeek (à implémenter)";
}

// Initialisation
createSidebar(); 