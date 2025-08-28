// Initialize audio context
let audioContext;
let tracks = {};
let isPlaying = false;
let startTime = 0;
let loadingInProgress = false;
let happyTrack = 'Vocals'; // Default track to play when smiling
let sadTrack = 'Drums';    // Default track to play when sad
let happyMuteTrack = 'Vocals'; // Piste à muter quand on sourit
let sadMuteTrack = 'Drums';    // Piste à muter quand on est triste
let progressUpdateInterval; // Pour stocker l'identifiant de l'intervalle de mise à jour
let longestTrackDuration = 0; // Pour stocker la durée de la piste la plus longue
let angryTrack = 'Bass';     // Piste à jouer exclusivement quand en colère
let surpriseTrack = 'Piano'; // Piste à jouer exclusivement quand bouche ouverte en O

// Ajout de variables pour stocker le mode de chaque expression
let happyMode = 'mute'; // 'mute' ou 'solo'
let sadMode = 'mute';   // 'mute' ou 'solo'
let angryMode = 'solo'; // 'mute' ou 'solo'
let surpriseMode = 'solo'; // 'mute' ou 'solo'

// Track configuration - only include existing audio files
const trackConfig = [
    { name: 'Drums', file: 'tracks/drums.mp3' },
    { name: 'Bass', file: 'tracks/bass.mp3' },
    { name: 'Piano', file: 'tracks/piano.mp3' },
    { name: 'Vocals', file: 'tracks/vocals.mp3' }
    // Guitar track removed - file doesn't exist
];

// Effect presets
const effectPresets = {
    'None': () => [],
    'Reverb': createReverbEffect,
    'Echo': createEchoEffect,
    'Underwater': createUnderwaterEffect
};

// Ajouter ces variables globales en haut du script
let happyEffect = 'None';  // Effet à appliquer lors d'un sourire
let sadEffect = 'None';    // Effet à appliquer lors d'une expression triste
let angryEffect = 'None';  // Effet à appliquer lors d'une expression de colère
let surpriseEffect = 'None'; // Effet à appliquer lors d'une expression de surprise

// Créer un dictionnaire de descriptions pour les effets
const effectDescriptions = {
    'Reverb': 'Réverbération (effet d\'espace, comme dans une cathédrale)',
    'Phaser': 'Phaser (effet de balayage cyclique, son tournant)',
    'Echo': 'Écho (répétition rythmique du son)'
};

// Ajouter une variable pour suivre l'état de la caméra
let cameraActive = false;

// Ajouter ces variables globales au début du fichier
let poseDetector = null;
let poseDetectionInterval;
let lastRightWristY = null;
let globalVolume = 1.0;
let isPoseDetectionActive = false;

// Initialize when the page loads
window.addEventListener('load', init);

// Fonction à ajouter/modifier pour supprimer le titre de détection faciale
function updatePageTitle() {
    // Changer le titre de la page (onglet du navigateur)
    document.title = "K.Lab : Face the music";
    
    // Chercher le titre principal (h1) et le modifier s'il existe
    const mainTitle = document.querySelector('h1');
    if (mainTitle) {
        mainTitle.textContent = "K.Lab : Face the music";
    }
    
    // Supprimer le titre "Facial Expression Detector"
    const facialExpressionTitle = document.querySelector('.sensor-section h2');
    if (facialExpressionTitle) {
        facialExpressionTitle.style.display = 'none';
    }
}

function init() {
    // Mettre à jour le titre de la page
    updatePageTitle();
    
    // Set up play/stop buttons - cela inclut maintenant la barre de progression
    setupPlayPauseButton();
    
    // Remplacer le bouton de caméra par une icône
    setupCameraButton();
    
    // Create status display for user feedback
    createStatusDisplay();
    
    // Create track controls
    createTrackControls();
    
    // Create expression controls
    createExpressionControls();
    
    // Try to initialize audio context early
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        showStatus("Audio initialized. Click Play to load tracks.");
    } catch (error) {
        showStatus("Failed to initialize audio context: " + error.message, true);
        console.error("Audio context initialization error:", error);
    }
    
    createVolumeIndicator();
    
    // ... reste du code existant ...
}

// Nouvelle fonction pour configurer le bouton play/pause avec une icône
function setupPlayPauseButton() {
    const playButton = document.getElementById('playButton');
    if (!playButton) return;
    
    // Créer un conteneur pour le bouton et la barre de progression
    const playerControls = document.createElement('div');
    playerControls.id = 'player-controls';
    playerControls.style.display = 'flex';
    playerControls.style.alignItems = 'center';
    playerControls.style.marginBottom = '15px';
    
    // Remplacer le bouton par notre conteneur dans le DOM
    playButton.parentNode.insertBefore(playerControls, playButton);
    
    // Ajouter une classe pour le styling, similaire aux boutons d'effet
    playButton.className = 'control-btn';
    
    // Définir l'icône de lecture (play) en noir
    playButton.innerHTML = '<span class="control-icon play-icon">&#9658;</span>';
    
    // Ajouter le bouton au conteneur
    playerControls.appendChild(playButton);
    
    // Créer la barre de progression simplifiée
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.height = '10px';
    progressBar.style.backgroundColor = '#e0e0e0';
    progressBar.style.borderRadius = '3px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.cursor = 'pointer';
    progressBar.style.position = 'relative';
    progressBar.style.flexGrow = '1';
    progressBar.style.marginLeft = '10px';
    
    // Créer l'indicateur de progression
    const progressIndicator = document.createElement('div');
    progressIndicator.id = 'progress-indicator';
    progressIndicator.style.width = '0%';
    progressIndicator.style.height = '100%';
    progressIndicator.style.backgroundColor = '#4CAF50';
    progressIndicator.style.transition = 'width 0.1s';
    progressIndicator.style.position = 'absolute';
    progressIndicator.style.top = '0';
    progressIndicator.style.left = '0';
    
    // Ajouter l'indicateur à la barre
    progressBar.appendChild(progressIndicator);
    
    // Ajouter la barre au conteneur
    playerControls.appendChild(progressBar);
    
    // Ajouter un gestionnaire d'événements pour les clics sur la barre de progression
    progressBar.addEventListener('click', function(e) {
        if (!isPlaying || !audioContext || !longestTrackDuration) return;
        
        // Calculer le pourcentage de la position cliquée
        const rect = progressBar.getBoundingClientRect();
        const clickPositionPercent = (e.clientX - rect.left) / rect.width;
        
        // Calculer la nouvelle position temporelle
        const newTime = clickPositionPercent * longestTrackDuration;
        
        // Mettre à jour la lecture à la nouvelle position
        seekToTime(newTime);
    });
    
    // Ajouter le style CSS pour le bouton
    const style = document.createElement('style');
    style.textContent = `
        .control-btn {
            background-color: #e0e0e0;
            border: none;
            color: black;
            padding: 8px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            transition: background-color 0.3s;
        }
        .control-btn:hover {
            background-color: #d0d0d0;
        }
        .control-icon {
            display: inline-block;
        }
        .play-icon {
            font-size: 16px;
        }
        .stop-icon {
            display: inline-block;
            width: 10px;
            height: 10px;
            background-color: black;
        }
    `;
    document.head.appendChild(style);
    
    // Ajouter l'écouteur d'événement (garder la fonction togglePlay existante)
    playButton.addEventListener('click', togglePlay);
    
    // Supprimer l'ancien bouton stop s'il existe
    const stopButton = document.getElementById('stopButton');
    if (stopButton) {
        stopButton.remove();
    }
}

// Nouvelle fonction pour configurer le bouton caméra
function setupCameraButton() {
    const cameraButton = document.getElementById('enableCamera');
    if (!cameraButton) return;
    
    // Ajouter une classe pour le styling similaire aux boutons d'effet
    cameraButton.className = 'control-btn';
    
    // Définir l'icône de caméra en noir
    cameraButton.innerHTML = '<span class="control-icon camera-icon">&#128247;</span>';
    
    // Ajouter le style CSS pour le bouton de caméra
    const style = document.createElement('style');
    style.textContent = `
        .camera-icon {
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);
    
    // L'écouteur d'événement reste le même, on ne change que l'apparence
}

// Create status display for user feedback
function createStatusDisplay() {
    const container = document.querySelector('.controls');
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status-display';
    statusDiv.style.marginTop = '15px';
    statusDiv.style.padding = '10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.backgroundColor = '#f0f0f0';
    statusDiv.style.color = '#333';
    statusDiv.style.fontWeight = 'bold';
    container.appendChild(statusDiv);
    
    // Add an initial status message
    showStatus("Ready to play music. Click the Play button.");
}

// Display a status message to the user
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-display');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = isError ? '#ffebee' : '#f0f0f0';
    statusDiv.style.color = isError ? '#c62828' : '#333';
    
    console.log(isError ? "ERROR: " : "STATUS: ", message);
}

// Create UI controls for each track
function createTrackControls() {
    const container = document.getElementById('trackControls');
    
    // Ajouter le style pour les contrôles compacts
    const compactStyle = `
        .track-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }
        .track-card {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 10px;
            width: calc(50% - 10px);
            box-sizing: border-box;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .track-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .track-name {
            font-weight: bold;
            margin: 0;
            flex-grow: 1;
        }
        .track-icon {
            font-size: 18px;
            margin-right: 5px;
            width: 24px;
            text-align: center;
        }
        .volume-control {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .volume-slider {
            flex-grow: 1;
            height: 5px;
        }
        .volume-label {
            margin-left: 8px;
            font-size: 12px;
            min-width: 40px;
            text-align: right;
        }
        .effect-buttons {
            display: flex;
            gap: 5px;
        }
        .effect-btn {
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            background-color: #e0e0e0;
        }
        .effect-btn.active {
            background-color: #4CAF50;
            color: white;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = compactStyle;
    document.head.appendChild(styleElement);
    
    // Créer un conteneur pour tous les tracks
    const trackContainer = document.createElement('div');
    trackContainer.className = 'track-container';
    
    // Icônes pour chaque type de piste
    const trackIcons = {
        'Drums': '🥁',
        'Bass': '🎸',
        'Piano': '🎹',
        'Vocals': '🎤'
    };
    
    trackConfig.forEach(track => {
        // Créer une carte pour chaque piste
        const trackCard = document.createElement('div');
        trackCard.className = 'track-card';
        
        // En-tête avec icône et nom
        const trackHeader = document.createElement('div');
        trackHeader.className = 'track-header';
        
        const trackIcon = document.createElement('span');
        trackIcon.className = 'track-icon';
        trackIcon.textContent = trackIcons[track.name] || '🎵';
        
        const trackName = document.createElement('h4');
        trackName.className = 'track-name';
        trackName.textContent = track.name;
        
        trackHeader.appendChild(trackIcon);
        trackHeader.appendChild(trackName);
        
        // Contrôle de volume
        const volumeControl = document.createElement('div');
        volumeControl.className = 'volume-control';
        
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.id = `volume-slider-${track.name}`;
        volumeSlider.className = 'volume-slider';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = '100';
        
        const volumeLabel = document.createElement('span');
        volumeLabel.id = `volume-${track.name}`;
        volumeLabel.className = 'volume-label';
        volumeLabel.textContent = '100%';
        
        volumeControl.appendChild(volumeSlider);
        volumeControl.appendChild(volumeLabel);
        
        // Boutons d'effet compacts
        const effectButtons = document.createElement('div');
        effectButtons.className = 'effect-buttons';
        
        const effects = ['None', 'Reverb', 'Echo', 'Underwater'];
        
        effects.forEach(effect => {
            const button = document.createElement('button');
            button.className = 'effect-btn';
            button.setAttribute('data-track', track.name);
            button.setAttribute('data-effect', effect);
            
            // Utiliser des lettres simples au lieu d'emojis
            switch(effect) {
                case 'None':
                    button.innerHTML = '<span class="effect-icon">X</span>';
                    button.title = 'Aucun effet';
                    break;
                case 'Reverb':
                    button.innerHTML = '<span class="effect-icon">R</span>';
                    button.title = 'Réverbération';
                    break;
                case 'Echo':
                    button.innerHTML = '<span class="effect-icon">E</span>';
                    button.title = 'Écho';
                    break;
                case 'Underwater':
                    button.innerHTML = '<span class="effect-icon">U</span>';
                    button.title = 'Sous l\'eau';
                    break;
            }
            
            effectButtons.appendChild(button);
        });
        
        // Assembler la carte
        trackCard.appendChild(trackHeader);
        trackCard.appendChild(volumeControl);
        trackCard.appendChild(effectButtons);
        
        // Ajouter la carte au conteneur
        trackContainer.appendChild(trackCard);
    });
    
    // Ajouter le conteneur au DOM
    container.appendChild(trackContainer);
    
    // Ajouter les écouteurs d'événements pour les contrôles de volume
    trackConfig.forEach(track => {
        const slider = document.getElementById(`volume-slider-${track.name}`);
        slider.addEventListener('input', (e) => {
            const volume = e.target.value;
            document.getElementById(`volume-${track.name}`).textContent = `${volume}%`;
            
            if (tracks[track.name]) {
                tracks[track.name].gainNode.gain.value = volume / 100;
            }
        });
    });
    
    // Ajouter les écouteurs d'événements pour les boutons d'effet
    document.querySelectorAll('.effect-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const trackName = e.target.getAttribute('data-track');
            const effectName = e.target.getAttribute('data-effect');
            
            // Enlever la classe active de tous les boutons de cette piste
            document.querySelectorAll(`.effect-btn[data-track="${trackName}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Ajouter la classe active au bouton cliqué
            e.target.classList.add('active');
            
            if (audioContext && tracks[trackName]) {
                applyEffectPreset(trackName, effectName);
            }
        });
    });
}

// Modification de la fonction createExpressionControls pour supprimer le titre
function createExpressionControls() {
    const container = document.querySelector('.controls');
    const expressionDiv = document.createElement('div');
    expressionDiv.className = 'expression-controls';
    expressionDiv.style.marginTop = '20px';
    expressionDiv.style.padding = '15px';
    expressionDiv.style.backgroundColor = '#f9f9f9';
    expressionDiv.style.borderRadius = '5px';
    
    // Style pour les contrôles à 3 positions sans texte et les boutons d'effet
    const controlsStyle = `
        .triple-toggle {
            position: relative;
            width: 90px;
            height: 28px;
            margin: 0 10px;
            background-color: #e0e0e0;
            border-radius: 34px;
            cursor: pointer;
        }
        .toggle-thumb {
            position: absolute;
            height: 20px;
            width: 20px;
            background-color: white;
            border-radius: 50%;
            transition: transform 0.3s;
            left: 4px;
            bottom: 4px;
        }
        .toggle-state-0 .toggle-thumb {
            transform: translateX(0);
            background-color: #f44336; /* Rouge pour mute */
        }
        .toggle-state-1 .toggle-thumb {
            transform: translateX(30px);
            background-color: #9e9e9e; /* Gris pour neutre */
        }
        .toggle-state-2 .toggle-thumb {
            transform: translateX(60px);
            background-color: #4CAF50; /* Vert pour solo */
        }
        .expression-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px;
            background-color: #f0f0f0;
            border-radius: 5px;
        }
        .emoji {
            font-size: 24px;
            margin-right: 15px;
            width: 30px;
            text-align: center;
        }
        .track-select {
            margin-left: 10px;
            height: 28px;
            min-width: 80px;
        }
        .effect-group {
            display: flex;
            gap: 5px;
            margin-left: 10px;
        }
        .effect-btn {
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            background-color: #e0e0e0;
        }
        .effect-btn.active {
            background-color: #2196F3;
            color: white;
        }
    `;
    
    // Ajouter le style
    const styleElement = document.createElement('style');
    styleElement.textContent = controlsStyle;
    document.head.appendChild(styleElement);
    
    // Fonction pour créer une ligne de contrôle avec toggle et boutons d'effet
    function createExpressionControlWithEffects(emoji, expressionName, defaultMode, defaultTrack, defaultEffect, trackList) {
        const row = document.createElement('div');
        row.className = 'expression-row';
        
        // Emoji
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji';
        emojiSpan.textContent = emoji;
        row.appendChild(emojiSpan);
        
        // Triple toggle sans texte
        const toggleDiv = document.createElement('div');
        toggleDiv.className = `triple-toggle toggle-state-${defaultMode === 'mute' ? 0 : defaultMode === 'neutral' ? 1 : 2}`;
        toggleDiv.id = `${expressionName}-toggle`;
        
        // Thumb (le curseur qui se déplace)
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'toggle-thumb';
        
        // Assembler le toggle
        toggleDiv.appendChild(thumbDiv);
        
        row.appendChild(toggleDiv);
        
        // Sélecteur de piste
        const trackSelect = document.createElement('select');
        trackSelect.id = `${expressionName}-track-select`;
        trackSelect.className = 'track-select';
        
        // Ajout des options de pistes
        trackList.forEach(track => {
            const option = document.createElement('option');
            option.value = track.name;
            option.textContent = track.name;
            if (track.name === defaultTrack) {
                option.selected = true;
            }
            trackSelect.appendChild(option);
        });
        
        row.appendChild(trackSelect);
        
        // Groupe de boutons d'effet
        const effectGroup = document.createElement('div');
        effectGroup.className = 'effect-group';
        
        // Ajouter un style pour les icônes
        const iconStyle = document.createElement('style');
        iconStyle.textContent = `
            .effect-icon {
                font-family: Arial, sans-serif;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                width: 16px;
                height: 16px;
                line-height: 16px;
                text-align: center;
            }
        `;
        document.head.appendChild(iconStyle);
        
        // Boutons pour chaque effet avec des icônes au lieu d'emojis
        const effects = [
            { name: 'Reverb', icon: '<span class="effect-icon">R</span>', title: 'Réverbération (effet d\'espace)' },
            { name: 'Phaser', icon: '<span class="effect-icon">P</span>', title: 'Phaser (effet de balayage)' },
            { name: 'Echo', icon: '<span class="effect-icon">E</span>', title: 'Écho (effet de répétition)' }
        ];
        
        const effectButtons = {};
        
        effects.forEach(effect => {
            const button = document.createElement('button');
            button.className = `effect-btn ${defaultEffect === effect.name ? 'active' : ''}`;
            button.setAttribute('data-effect', effect.name);
            button.innerHTML = effect.icon;
            button.title = effect.title;
            effectGroup.appendChild(button);
            effectButtons[effect.name] = button;
        });
        
        row.appendChild(effectGroup);
        
        // Variable pour stocker l'état actuel du toggle (0=mute, 1=neutral, 2=solo)
        let currentState = defaultMode === 'mute' ? 0 : defaultMode === 'neutral' ? 1 : 2;
        
        // Écouteur d'événement pour le toggle
        toggleDiv.addEventListener('click', () => {
            // Passer à l'état suivant (cycle entre 0, 1 et 2)
            currentState = (currentState + 1) % 3;
            
            // Mettre à jour la classe CSS
            toggleDiv.className = `triple-toggle toggle-state-${currentState}`;
            
            // Mettre à jour la variable de mode
            const newMode = currentState === 0 ? 'mute' : currentState === 1 ? 'neutral' : 'solo';
            
            // Désactiver tous les boutons d'effet
            Object.values(effectButtons).forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Réinitialiser l'effet
            if (expressionName === 'happy') {
                happyMode = newMode;
                happyEffect = 'None';
                showStatus(`Mode sourire: ${getModeFrenchName(newMode)}`);
            } else if (expressionName === 'sad') {
                sadMode = newMode;
                sadEffect = 'None';
                showStatus(`Mode tristesse: ${getModeFrenchName(newMode)}`);
            } else if (expressionName === 'angry') {
                angryMode = newMode;
                angryEffect = 'None';
                showStatus(`Mode colère: ${getModeFrenchName(newMode)}`);
            } else if (expressionName === 'surprise') {
                surpriseMode = newMode;
                surpriseEffect = 'None';
                showStatus(`Mode surprise: ${getModeFrenchName(newMode)}`);
            }
            
            // Si l'expression est active, mettre à jour immédiatement
            if (currentExpression === expressionName) {
                updateTracksBasedOnExpression(currentExpression);
            }
        });
        
        // Ajouter les écouteurs d'événements pour les boutons d'effet
        Object.entries(effectButtons).forEach(([effectName, button]) => {
            button.addEventListener('click', () => {
                // Désactiver tous les boutons
                Object.values(effectButtons).forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Si on clique sur le bouton déjà actif, le désactiver
                if (
                    (expressionName === 'happy' && happyEffect === effectName) ||
                    (expressionName === 'sad' && sadEffect === effectName) ||
                    (expressionName === 'angry' && angryEffect === effectName) ||
                    (expressionName === 'surprise' && surpriseEffect === effectName)
                ) {
                    // Mettre le toggle en position neutre
                    currentState = 1;
                    toggleDiv.className = 'triple-toggle toggle-state-1';
                    
                    // Réinitialiser l'effet
                    if (expressionName === 'happy') {
                        happyMode = 'neutral';
                        happyEffect = 'None';
                        showStatus('Mode sourire: Désactivé');
                    } else if (expressionName === 'sad') {
                        sadMode = 'neutral';
                        sadEffect = 'None';
                        showStatus('Mode tristesse: Désactivé');
                    } else if (expressionName === 'angry') {
                        angryMode = 'neutral';
                        angryEffect = 'None';
                        showStatus('Mode colère: Désactivé');
                    } else if (expressionName === 'surprise') {
                        surpriseMode = 'neutral';
                        surpriseEffect = 'None';
                        showStatus('Mode surprise: Désactivé');
                    }
                } else {
                    // Activer le bouton cliqué
                    button.classList.add('active');
                    
                    // Mettre le toggle en position neutre
                    currentState = 1;
                    toggleDiv.className = 'triple-toggle toggle-state-1';
                    
                    // Mettre à jour la variable d'effet et afficher un message descriptif
                    if (expressionName === 'happy') {
                        happyMode = 'neutral';
                        happyEffect = effectName;
                        const trackName = trackSelect ? trackSelect.value : 'piste sélectionnée';
                        showStatus(`Mode sourire: ${effectDescriptions[effectName]} sur ${trackName}`);
                    } else if (expressionName === 'sad') {
                        sadMode = 'neutral';
                        sadEffect = effectName;
                        const trackName = trackSelect ? trackSelect.value : 'piste sélectionnée';
                        showStatus(`Mode tristesse: ${effectDescriptions[effectName]} sur ${trackName}`);
                    } else if (expressionName === 'angry') {
                        angryMode = 'neutral';
                        angryEffect = effectName;
                        const trackName = trackSelect ? trackSelect.value : 'piste sélectionnée';
                        showStatus(`Mode colère: ${effectDescriptions[effectName]} sur ${trackName}`);
                    } else if (expressionName === 'surprise') {
                        surpriseMode = 'neutral';
                        surpriseEffect = effectName;
                        const trackName = trackSelect ? trackSelect.value : 'piste sélectionnée';
                        showStatus(`Mode surprise: ${effectDescriptions[effectName]} sur ${trackName}`);
                    }
                }
                
                // Si l'expression est active, mettre à jour immédiatement
                if (currentExpression === expressionName) {
                    updateTracksBasedOnExpression(currentExpression);
                }
            });
        });
        
        return { row, toggleDiv, trackSelect, effectButtons };
    }
    
    // Fonction utilitaire pour obtenir le nom français du mode
    function getModeFrenchName(mode) {
        switch (mode) {
            case 'mute': return 'Muter une piste';
            case 'solo': return 'Jouer une seule piste';
            case 'neutral': return 'Désactivé';
            default: return mode;
        }
    }
    
    // Créer les 4 contrôles d'expression avec toggles et boutons d'effet
    const happyControl = createExpressionControlWithEffects('😊', 'happy', happyMode, happyMuteTrack, happyEffect, trackConfig);
    const sadControl = createExpressionControlWithEffects('😢', 'sad', sadMode, sadMuteTrack, sadEffect, trackConfig);
    const angryControl = createExpressionControlWithEffects('😠', 'angry', angryMode, angryTrack, angryEffect, trackConfig);
    const surpriseControl = createExpressionControlWithEffects('😮', 'surprise', surpriseMode, surpriseTrack, surpriseEffect, trackConfig);
    
    // Ajouter les contrôles au conteneur
    expressionDiv.appendChild(happyControl.row);
    expressionDiv.appendChild(sadControl.row);
    expressionDiv.appendChild(angryControl.row);
    expressionDiv.appendChild(surpriseControl.row);
    
    // Modifier la légende pour refléter les nouvelles icônes
    const legend = document.createElement('div');
    legend.style.fontSize = '12px';
    legend.style.color = '#666';
    legend.style.marginTop = '10px';
    legend.innerHTML = `
        <div style="margin-bottom: 5px;">
            <span style="color:#f44336">●</span> Muter une piste &nbsp;|&nbsp; 
            <span style="color:#9e9e9e">●</span> Désactivé &nbsp;|&nbsp;
            <span style="color:#4CAF50">●</span> Jouer une seule piste
        </div>
        <div style="color:#2196F3; margin-bottom: 5px;">Contrôle du volume :</div>
        <div style="margin-bottom: 10px;">
            <span style="display: inline-block; transform: rotate(-45deg);">💪</span> Lever le bras droit : Diminuer le volume
            <br>
            <span style="display: inline-block; transform: rotate(45deg);">💪</span> Baisser le bras droit : Augmenter le volume
        </div>
        <div style="color:#2196F3; margin-bottom: 5px;">Effets sonores :</div>
        <div><span class="effect-icon" style="background-color:#2196F3;color:white;margin-right:5px">R</span> ${effectDescriptions.Reverb}</div>
        <div><span class="effect-icon" style="background-color:#2196F3;color:white;margin-right:5px">P</span> ${effectDescriptions.Phaser}</div>
        <div><span class="effect-icon" style="background-color:#2196F3;color:white;margin-right:5px">E</span> ${effectDescriptions.Echo}</div>
    `;
    expressionDiv.appendChild(legend);
    
    // Ajouter les écouteurs d'événements pour les sélecteurs de piste
    happyControl.trackSelect.addEventListener('change', (e) => {
        happyMuteTrack = e.target.value;
        showStatus(`Piste pour sourire: ${happyMuteTrack}`);
    });
    
    sadControl.trackSelect.addEventListener('change', (e) => {
        sadMuteTrack = e.target.value;
        showStatus(`Piste pour tristesse: ${sadMuteTrack}`);
    });
    
    angryControl.trackSelect.addEventListener('change', (e) => {
        angryTrack = e.target.value;
        showStatus(`Piste pour colère: ${angryTrack}`);
    });
    
    surpriseControl.trackSelect.addEventListener('change', (e) => {
        surpriseTrack = e.target.value;
        showStatus(`Piste pour surprise: ${surpriseTrack}`);
    });
    
    // Ajouter le conteneur à la page
    container.appendChild(expressionDiv);
}

// Toggle play/pause
function togglePlay() {
    if (loadingInProgress) {
        showStatus("Still loading audio tracks, please wait...");
        return;
    }
    
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            showStatus("Failed to create audio context: " + error.message, true);
            return;
        }
    }
    
    // If the context is suspended, try to resume it
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            showStatus("Audio context resumed");
        }).catch(error => {
            showStatus("Failed to resume audio context: " + error.message, true);
        });
    }
    
    const playButton = document.getElementById('playButton');
    
    if (isPlaying) {
        stopAll();
        // Changer l'icône vers "Play" avec la nouvelle couleur noire
        playButton.innerHTML = '<span class="control-icon play-icon">&#9658;</span>';
    } else {
        // Check if tracks are already loaded
        if (Object.keys(tracks).length === 0) {
            showStatus("Loading audio tracks...");
            loadTracks().then(() => {
                if (Object.keys(tracks).length > 0) {
                    playAll();
                    // Changer l'icône vers "Stop" avec la nouvelle couleur noire
                    playButton.innerHTML = '<span class="control-icon stop-icon"></span>';
                }
            });
        } else {
            playAll();
            // Changer l'icône vers "Stop" avec la nouvelle couleur noire
            playButton.innerHTML = '<span class="control-icon stop-icon"></span>';
        }
    }
}

// Load all track audio files
async function loadTracks() {
    if (loadingInProgress) return;
    loadingInProgress = true;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const track of trackConfig) {
        try {
            showStatus(`Loading track: ${track.name}...`);
            console.log("Attempting to load:", track.file);
            
            // Use XMLHttpRequest instead of fetch for better compatibility
            const audioData = await loadAudioFile(track.file);
            const audioBuffer = await audioContext.decodeAudioData(audioData);
            
            const trackObj = {
                buffer: audioBuffer,
                gainNode: audioContext.createGain(),
                effects: [],
                currentEffect: 'None'
            };
            
            tracks[track.name] = trackObj;
            successCount++;
            showStatus(`Loaded ${successCount} of ${trackConfig.length} tracks`);
            
        } catch (error) {
            console.error(`Error loading track ${track.name}:`, error);
            showStatus(`Failed to load ${track.name}: ${error.message}`, true);
            errorCount++;
        }
    }
    
    loadingInProgress = false;
    
    if (errorCount > 0) {
        showStatus(`Loaded ${successCount} tracks with ${errorCount} errors. Some tracks may not play.`, true);
        return false;
    } else if (successCount === 0) {
        showStatus("Failed to load any audio tracks. Check browser console for details.", true);
        return false;
    } else {
        showStatus(`Successfully loaded all ${successCount} audio tracks!`);
        return true;
    }
}

// Helper function to load audio file using XMLHttpRequest
function loadAudioFile(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        request.onload = function() {
            if (request.status >= 200 && request.status < 300) {
                resolve(request.response);
            } else {
                reject(new Error(`HTTP Error: ${request.status} ${request.statusText}`));
            }
        };
        
        request.onerror = function() {
            reject(new Error('Network error loading audio file'));
        };
        
        request.send();
    });
}

// Play all tracks
function playAll() {
    if (!audioContext || isPlaying) return;
    
    // Check if we have any tracks loaded
    if (Object.keys(tracks).length === 0) {
        showStatus("No audio tracks loaded yet. Click Play to load tracks.", true);
        return;
    }
    
    try {
        // Make sure context is running
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Trouver la durée de la piste la plus longue pour la barre de progression
        longestTrackDuration = 0;
        Object.values(tracks).forEach(track => {
            if (track.buffer && track.buffer.duration > longestTrackDuration) {
                longestTrackDuration = track.buffer.duration;
            }
        });
        
        startTime = audioContext.currentTime;
        
        // Create and connect nodes for each track
        Object.entries(tracks).forEach(([name, track]) => {
            try {
                // Create source node
                const source = audioContext.createBufferSource();
                source.buffer = track.buffer;
                
                // Connect: source -> gain -> destination
                source.connect(track.gainNode);
                track.gainNode.connect(audioContext.destination);
                
                // Store source node
                track.source = source;
                
                // Start playback
                source.start(0);
                
                // Apply current effect if any
                if (track.currentEffect !== 'None') {
                    applyEffectPreset(name, track.currentEffect);
                }
            } catch (trackError) {
                console.error(`Error playing track ${name}:`, trackError);
                showStatus(`Error playing ${name}: ${trackError.message}`, true);
            }
        });
        
        isPlaying = true;
        
        // Changer l'icône du bouton pour afficher "Stop" en noir
        const playButton = document.getElementById('playButton');
        playButton.innerHTML = '<span class="control-icon stop-icon"></span>';
        
        showStatus("Playing all tracks");
        
        // Mettre à jour la barre de progression à intervalles réguliers
        clearInterval(progressUpdateInterval);
        progressUpdateInterval = setInterval(updateProgressBar, 100);
    } catch (error) {
        console.error("Error playing tracks:", error);
        showStatus(`Playback error: ${error.message}`, true);
    }
}

// Stop all tracks
function stopAll() {
    if (!audioContext || !isPlaying) return;
    
    try {
        // Stop all sources
        Object.values(tracks).forEach(track => {
            if (track.source) {
                try {
                    track.source.stop();
                    track.source.disconnect();
                    
                    // Disconnect effect nodes
                    track.effects.forEach(effect => {
                        if (effect.disconnect) effect.disconnect();
                    });
                } catch (trackError) {
                    console.error("Error stopping track:", trackError);
                }
            }
        });
        
        isPlaying = false;
        
        // Mettre à jour l'icône du bouton pour afficher "Play" en noir
        const playButton = document.getElementById('playButton');
        playButton.innerHTML = '<span class="control-icon play-icon">&#9658;</span>';
        
        showStatus("Playback stopped");
        
        // Arrêter la mise à jour de la barre de progression
        clearInterval(progressUpdateInterval);
        
        // Réinitialiser la barre de progression
        const progressIndicator = document.getElementById('progress-indicator');
        if (progressIndicator) {
            progressIndicator.style.width = '0%';
        }
    } catch (error) {
        console.error("Error stopping playback:", error);
        showStatus(`Error stopping playback: ${error.message}`, true);
    }
}

// Apply effect preset to a track
function applyEffectPreset(trackName, presetName) {
    const track = tracks[trackName];
    if (!track) return;
    
    // Update current effect name
    track.currentEffect = presetName;
    
    // Highlight selected effect button
    document.querySelectorAll(`.effect-btn[data-track="${trackName}"]`).forEach(btn => {
        if (btn.getAttribute('data-effect') === presetName) {
            btn.style.backgroundColor = '#4CAF50';
            btn.style.color = 'white';
        } else {
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }
    });
    
    if (!isPlaying) return; // Only apply effects if we're playing
    
    // Disconnect current effects
    track.effects.forEach(effect => {
        if (effect.disconnect) effect.disconnect();
    });
    
    // Reconnect source directly to gain node
    track.source.disconnect();
    track.source.connect(track.gainNode);
    
    // Clear effects array
    track.effects = [];
    
    // If preset is 'None', we're done
    if (presetName === 'None') return;
    
    // Create and connect effect nodes
    const effectNodes = effectPresets[presetName](audioContext);
    if (effectNodes.length > 0) {
        // Disconnect source from gain
        track.source.disconnect();
        
        // Connect source to first effect
        track.source.connect(effectNodes[0].input);
        
        // Connect last effect to gain
        effectNodes[effectNodes.length - 1].output.connect(track.gainNode);
        
        // Store effect nodes
        track.effects = effectNodes;
    }
}

// Effect creation functions
function createReverbEffect(context) {
    const convolver = context.createConvolver();
    
    // Create impulse response (simplified version)
    const impulseLength = context.sampleRate * 2; // 2 seconds
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const impulseData = impulse.getChannelData(channel);
        for (let i = 0; i < impulseLength; i++) {
            impulseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength / 10));
        }
    }
    
    convolver.buffer = impulse;
    
    return [{
        input: convolver,
        output: convolver
    }];
}

function createEchoEffect(context) {
    const delay = context.createDelay();
    delay.delayTime.value = 0.3; // 300ms delay
    
    const feedback = context.createGain();
    feedback.gain.value = 0.4; // 40% feedback
    
    const dryGain = context.createGain();
    dryGain.gain.value = 0.6; // 60% dry signal
    
    const wetGain = context.createGain();
    wetGain.gain.value = 0.4; // 40% wet signal
    
    // Create connections for feedback loop
    delay.connect(feedback);
    feedback.connect(delay);
    
    // Create merger for wet and dry signals
    const merger = context.createGain();
    
    delay.connect(wetGain);
    wetGain.connect(merger);
    
    // Return the effect nodes with their inputs and outputs
    return [
        {
            input: delay,
            output: merger
        },
        {
            input: dryGain,
            output: merger
        }
    ];
}

function createUnderwaterEffect(context) {
    // Create low-pass filter for underwater effect
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500; // Low frequency for underwater feeling
    
    // Add some resonance
    filter.Q.value = 2;
    
    return [{
        input: filter,
        output: filter
    }];
}

// Ajouter un effet Phaser qui n'existe pas encore
function createPhaserEffect(context) {
    // Créer un oscillateur pour moduler le filtre
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 0.5; // 0.5 Hz = vitesse lente de modulation
    
    // Gain pour contrôler la profondeur de modulation
    const modulationDepth = context.createGain();
    modulationDepth.gain.value = 300; // Profondeur de modulation
    
    // Filtre pour créer l'effet phaser
    const filter = context.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.value = 1000;
    filter.Q.value = 5;
    
    // Connecter l'oscillateur au gain puis au paramètre de fréquence du filtre
    oscillator.connect(modulationDepth);
    modulationDepth.connect(filter.frequency);
    
    // Démarrer l'oscillateur
    oscillator.start();
    
    return [{
        input: filter,
        output: filter,
        // Stocker les nœuds qu'il faut arrêter
        cleanup: () => {
            oscillator.stop();
            oscillator.disconnect();
            modulationDepth.disconnect();
        }
    }];
}

// Ajouter l'effet Phaser aux presets
effectPresets['Phaser'] = createPhaserEffect;

// Face detection variables
let video, canvas, context;
let faceDetectionInterval;
let currentExpression = 'neutral';
let modelsLoaded = false;
let detectionInProgress = false;

// Initialize webcam face detection
document.getElementById('enableCamera').addEventListener('click', function() {
    if (cameraActive) {
        // Si la caméra est déjà active, la fermer
        closeCamera();
    } else {
        // Sinon, l'ouvrir
        openCamera();
    }
});

// Fonction pour ouvrir la caméra
function openCamera() {
    document.getElementById('cameraContainer').style.display = 'block';
    document.getElementById('debugInfo').style.display = 'block';
    
    updateDebugInfo("Initialisation de la détection...");
    
    // Vérifier d'abord les modèles de pose
    checkPoseModels().then(modelsOk => {
        if (!modelsOk) {
            updateDebugInfo("❌ Les modèles de pose ne sont pas correctement chargés");
            return;
        }
    
    if (!modelsLoaded) {
            loadFaceApiModels().then(() => {
                initPoseDetection();
            });
    } else {
            setupCamera().then(() => {
                initPoseDetection();
            });
        }
    });
    
    cameraActive = true;
}

// Fonction pour fermer la caméra
function closeCamera() {
    // Arrêter l'intervalle de détection faciale
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }
    
    // Arrêter le flux vidéo si actif
    if (video && video.srcObject) {
        // Obtenir toutes les pistes du flux et les arrêter
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // Masquer les éléments d'interface
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('debugInfo').style.display = 'none';
    
    // Effacer le canvas
    if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Réinitialiser l'état de l'expression
    currentExpression = 'neutral';
    
    // Mise à jour du status
    const statusElement = document.getElementById('expressionStatus');
    if (statusElement) {
        statusElement.textContent = "";
        statusElement.style.backgroundColor = "";
    }
    
    // Mise à jour du log de débogage
    updateDebugInfo("Camera closed by user");
    
    cameraActive = false;
    
    // Réinitialiser les pistes audio si nécessaire
    if (isPlaying) {
        updateTracksBasedOnExpression('neutral');
    }
    
    if (poseDetectionInterval) {
        clearInterval(poseDetectionInterval);
        poseDetectionInterval = null;
    }
    
    isPoseDetectionActive = false;
}

// Helper function to update debug info
function updateDebugInfo(message) {
    const debugInfo = document.getElementById('debugInfo');
    const timestamp = new Date().toLocaleTimeString();
    debugInfo.innerHTML += `[${timestamp}] ${message}<br>`;
    debugInfo.scrollTop = debugInfo.scrollHeight; // Auto-scroll to bottom
    console.log(message); // Also log to console
}

// Check browser compatibility for camera access
function checkBrowserCompatibility() {
    updateDebugInfo("Checking browser compatibility...");
    
    // Check for getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = "Browser doesn't support getUserMedia API";
        updateDebugInfo("❌ " + msg);
        return { compatible: false, reason: msg };
    }
    
    // Check if we're on HTTP and not localhost (which often gets special permissions)
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (!isHttps && !isLocalhost) {
        const msg = "Warning: Camera access may be blocked on non-HTTPS sites";
        updateDebugInfo("⚠️ " + msg);
        return { 
            compatible: true, 
            warning: msg,
            needsPermissions: true
        };
    }
    
    updateDebugInfo("✅ Browser compatibility check passed");
    return { compatible: true };
}

// Load required face-api.js models
async function loadFaceApiModels() {
    try {
    document.getElementById('expressionStatus').textContent = "Loading face detection models...";
        updateDebugInfo("Starting model loading process...");
        
        // Check browser compatibility first
        const compatibility = checkBrowserCompatibility();
        if (!compatibility.compatible) {
            throw new Error(compatibility.reason);
        }
        
        // Check if face-api.js is loaded correctly
        if (typeof window.faceapi === 'undefined') {
            throw new Error("Face API library not loaded. Please refresh the page and try again.");
        }
        
        // Use the local model path
        const modelPath = './models';
        updateDebugInfo(`Loading models from: ${modelPath}`);
        
        // First verify models exist by checking for manifest files
        try {
            updateDebugInfo("Verifying model files exist...");
            
            // Check for each required model's manifest file
            const manifestFiles = [
                'face_expression_model-weights_manifest.json',
                'face_landmark_68_model-weights_manifest.json',
                'tiny_face_detector_model-weights_manifest.json'
            ];
            
            for (const file of manifestFiles) {
                // Create a test request to see if the file exists
                const testRequest = new XMLHttpRequest();
                testRequest.open('HEAD', `${modelPath}/${file}`, false);
                try {
                    testRequest.send();
                    if (testRequest.status >= 200 && testRequest.status < 300) {
                        updateDebugInfo(`✅ Found model file: ${file}`);
                    } else {
                        updateDebugInfo(`❌ Missing model file: ${file} (status ${testRequest.status})`);
                    }
                } catch (e) {
                    updateDebugInfo(`❌ Error checking model file: ${file}`);
                }
            }
        } catch (checkErr) {
            console.warn("Error checking model files:", checkErr);
        }
        
        // Log the version for debugging
        updateDebugInfo("Using Face API version: " + (window.faceapi.version || "unknown"));
        
        // Load each model separately to better track loading status
        updateDebugInfo("Loading TinyFaceDetector model...");
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
        updateDebugInfo("✅ TinyFaceDetector model loaded");
        
        updateDebugInfo("Loading FaceLandmark68 model...");
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
        updateDebugInfo("✅ FaceLandmark68 model loaded");
        
        updateDebugInfo("Loading FaceExpression model...");
        await window.faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
        updateDebugInfo("✅ FaceExpression model loaded");
        
        modelsLoaded = true;
        updateDebugInfo("🎉 All models loaded successfully!");
        document.getElementById('expressionStatus').textContent = "Models loaded successfully";
        
        // Update debug info display with network information
        if (compatibility.warning) {
            document.getElementById('expressionStatus').innerHTML += 
                `<div class="note">${compatibility.warning}</div>`;
        }
        
        setupCamera();
    } catch (err) {
        console.error("Error loading face models:", err);
        updateDebugInfo(`❌ Model loading error: ${err.message}`);
        document.getElementById('expressionStatus').textContent = "Failed to load models: " + err.message;
    }
}

async function setupCamera() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    
    console.log("Setting up camera...");
    
    // Make video visible during debugging
    video.style.display = 'block';
    video.style.position = 'absolute';
    video.style.opacity = '0.5';
    video.style.zIndex = '1';
    
    try {
        // Request camera access
        console.log("Requesting camera access...");
        document.getElementById('expressionStatus').textContent = "Requesting camera access...";
        
        const constraints = { 
            video: { 
                width: 320, 
                height: 240,
                facingMode: 'user' // Prefer front camera
            } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("✅ Camera access granted");
        
        // Attach stream to video element
        video.srcObject = stream;
        
        // Use event listeners to confirm video is playing
        video.onloadedmetadata = function() {
            console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
            video.play()
                .then(() => {
                    console.log("✅ Video playing successfully");
                    // Start detecting facial expressions
                    faceDetectionInterval = setInterval(detectFacialExpression, 500);
                    document.getElementById('expressionStatus').textContent = "Camera ready, looking for faces...";
                })
                .catch(playError => {
                    console.error("Error playing video:", playError);
                    document.getElementById('expressionStatus').textContent = "Video play error: " + playError.message;
                });
        };
        
        video.onerror = function() {
            console.error("Video element error");
            document.getElementById('expressionStatus').textContent = "Video element error";
        };
        
    } catch (err) {
        console.error("❌ Error accessing camera:", err);
        document.getElementById('expressionStatus').textContent = "Camera error: " + err.message;
        
        // Special message for HTTP security issues
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
            document.getElementById('expressionStatus').innerHTML = 
                "Camera access denied by browser. If you're using HTTP, try:<br>" +
                "1. Using HTTPS instead<br>" +
                "2. Or enable insecure origins in browser settings";
        }
    }
}

async function detectFacialExpression() {
    // Check if video element is ready
    if (video.readyState !== 4) {
        console.log("Video not ready yet, readyState:", video.readyState);
        return;
    }
    
    // Check if we're already processing a frame
    if (detectionInProgress) {
        return;
    }
    
    detectionInProgress = true;
    console.log("Starting face detection...");
    
    try {
        // First, ensure video is visible in the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#e0e0e0"; // Light gray background
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add indicator that detection is active
        const statusElement = document.getElementById('expressionStatus');
        statusElement.textContent = "Analyzing face...";
        statusElement.style.backgroundColor = "#f0f8ff"; // Light blue background
        
        console.log("Running face detection with TinyFaceDetector...");
        
        // Detect faces and expressions
        try {
            const detectionOptions = new window.faceapi.TinyFaceDetectorOptions({
                inputSize: 224,   // Smaller input size for better performance
                scoreThreshold: 0.5  // Lower threshold to detect faces more easily
            });
            
            // First try to detect just faces (simpler operation)
            const faceDetections = await window.faceapi.detectAllFaces(video, detectionOptions);
            console.log("Face detection completed, found:", faceDetections.length, "faces");
            
            if (faceDetections.length === 0) {
                // No faces detected
                console.log("No faces detected in frame");
                statusElement.textContent = "No face detected - position your face in view";
                statusElement.style.backgroundColor = "";
                context.font = "16px Arial";
                context.fillStyle = "red";
                context.fillText("No face detected", 10, 30);
                
                currentExpression = 'none';
                return;
            }
            
            // Now try the full detection with landmarks and expressions
            console.log("Processing landmarks and expressions...");
            const detections = await window.faceapi.detectAllFaces(video, detectionOptions)
                .withFaceLandmarks()
                .withFaceExpressions();
            
            console.log("Full detection completed, processing results...");
            
            // Redraw video frame (clear previous drawings)
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Draw face detection results on canvas
            window.faceapi.draw.drawDetections(canvas, detections);
            window.faceapi.draw.drawFaceLandmarks(canvas, detections);
            
            // Store previous expression to detect changes
            let previousExpression = currentExpression;
            
            // Process the first detected face
            if (detections.length > 0) {
                const expressions = detections[0].expressions;
                console.log("Detected expressions:", expressions);
                
                // Find the expression with highest score
                let highestScore = 0;
                let dominantExpression = 'neutral';
                
                for (const [expression, score] of Object.entries(expressions)) {
                    if (score > highestScore) {
                        highestScore = score;
                        dominantExpression = expression;
                    }
                }
                
                console.log("Dominant expression:", dominantExpression, "with score:", highestScore);
                
                // Check for various expressions and update UI
                if (dominantExpression === 'happy') {
                    currentExpression = 'happy';
                    let statusText = '😊 Sourire détecté ! ';
                    if (happyMode === 'mute') {
                        statusText += `La piste "${happyMuteTrack}" est mise en sourdine`;
                    } else if (happyMode === 'solo') {
                        statusText += `Seule la piste "${happyMuteTrack}" est jouée`;
                    } else if (happyEffect !== 'None') {
                        statusText += `${effectDescriptions[happyEffect]} appliqué sur ${happyMuteTrack}`;
                    } else {
                        statusText += `Aucun effet appliqué (mode désactivé)`;
                    }
                    statusElement.textContent = statusText;
                    statusElement.style.color = "green";
                    statusElement.style.backgroundColor = "#e8f5e9"; // Light green background
                } else if (dominantExpression === 'sad') {
                    currentExpression = 'sad';
                    let statusText = '😢 Expression triste détectée ! ';
                    if (sadMode === 'mute') {
                        statusText += `La piste "${sadMuteTrack}" est mise en sourdine`;
                    } else if (sadMode === 'solo') {
                        statusText += `Seule la piste "${sadMuteTrack}" est jouée`;
                    } else if (sadEffect !== 'None') {
                        statusText += `${effectDescriptions[sadEffect]} appliqué sur ${sadMuteTrack}`;
                    } else {
                        statusText += `Aucun effet appliqué (mode désactivé)`;
                    }
                    statusElement.textContent = statusText;
                    statusElement.style.color = "blue";
                    statusElement.style.backgroundColor = "#e3f2fd"; // Light blue background
                } else if (dominantExpression === 'angry') {
                    currentExpression = 'angry';
                    let statusText = '😠 Expression de colère détectée ! ';
                    if (angryMode === 'mute') {
                        statusText += `La piste "${angryTrack}" est mise en sourdine`;
                    } else if (angryMode === 'solo') {
                        statusText += `Seule la piste "${angryTrack}" est jouée`;
                    } else if (angryEffect !== 'None') {
                        statusText += `${effectDescriptions[angryEffect]} appliqué sur ${angryTrack}`;
                    } else {
                        statusText += `Aucun effet appliqué (mode désactivé)`;
                    }
                    statusElement.textContent = statusText;
                    statusElement.style.color = "darkred";
                    statusElement.style.backgroundColor = "#ffebee"; // Light red background
                } else if (dominantExpression === 'surprised') {
                    currentExpression = 'surprised';
                    let statusText = '😮 Bouche ouverte détectée ! ';
                    if (surpriseMode === 'mute') {
                        statusText += `La piste "${surpriseTrack}" est mise en sourdine`;
                    } else if (surpriseMode === 'solo') {
                        statusText += `Seule la piste "${surpriseTrack}" est jouée`;
                    } else if (surpriseEffect !== 'None') {
                        statusText += `${effectDescriptions[surpriseEffect]} appliqué sur ${surpriseTrack}`;
                    } else {
                        statusText += `Aucun effet appliqué (mode désactivé)`;
                    }
                    statusElement.textContent = statusText;
                    statusElement.style.color = "purple";
                    statusElement.style.backgroundColor = "#f3e5f5"; // Light purple background
                } else {
                    currentExpression = 'neutral';
                    statusElement.textContent = "😐 Expression neutre - toutes les pistes actives";
                    statusElement.style.color = "black";
                    statusElement.style.backgroundColor = "";
                }
                
                // Only update audio if expression changed
                if (currentExpression !== previousExpression) {
                    console.log("Expression changed from", previousExpression, "to", currentExpression);
                    updateTracksBasedOnExpression(currentExpression);
                }
            } else {
                // This should rarely happen (already checked for faces above)
                statusElement.textContent = "Face detected but couldn't analyze expression";
                statusElement.style.color = "black";
                statusElement.style.backgroundColor = "";
                currentExpression = 'none';
            }
        } catch (detectionErr) {
            console.error("Face detection specific error:", detectionErr);
            document.getElementById('expressionStatus').textContent = 
                `Detection error: ${detectionErr.message || "Unknown error"}`;
            
            // Add visible error on canvas
            context.font = "14px Arial";
            context.fillStyle = "red";
            context.fillText("Detection error: " + (detectionErr.message || "Unknown error"), 10, 30);
        }
    } catch (err) {
        console.error("General error in face detection:", err);
        document.getElementById('expressionStatus').textContent = "Error: " + err.message;
    } finally {
        detectionInProgress = false;
    }
}

function updateTracksBasedOnExpression(expression) {
    if (!isPlaying) return; // Only modify tracks if music is playing
    
    const trackNames = Object.keys(tracks);
    
    // D'abord, réinitialiser tous les volumes et effets
    trackNames.forEach(name => {
        if (tracks[name]) {
            // Réinitialiser le volume - avec vérification de l'existence des éléments
            const slider = document.getElementById(`volume-slider-${name}`);
            const volumeLabel = document.getElementById(`volume-${name}`);
            
            if (slider) {
                slider.value = 100;
            }
            if (volumeLabel) {
                volumeLabel.textContent = "100%";
            }
            if (tracks[name].gainNode) {
                tracks[name].gainNode.gain.value = 1.0;
            }
            
            // Réinitialiser les effets si nécessaire
            if (tracks[name].currentEffect !== 'None') {
                applyEffectPreset(name, 'None');
                
                // Désélectionner visuellement le bouton d'effet
                document.querySelectorAll(`.effect-btn[data-track="${name}"]`).forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Sélectionner le bouton "None"
                const noneButton = document.querySelector(`.effect-btn[data-track="${name}"][data-effect="None"]`);
                if (noneButton) noneButton.classList.add('active');
            }
        }
    });
    
    // Appliquer des actions en fonction de l'expression et du mode
    if (expression === 'happy') {
        if (happyMode === 'mute') {
            // Muter une piste spécifique
            if (tracks[happyMuteTrack]) {
                const slider = document.getElementById(`volume-slider-${happyMuteTrack}`);
                const volumeLabel = document.getElementById(`volume-${happyMuteTrack}`);
                if (slider) slider.value = 0;
                if (volumeLabel) volumeLabel.textContent = "0%";
                if (tracks[happyMuteTrack].gainNode) {
                    tracks[happyMuteTrack].gainNode.gain.value = 0;
                }
            }
        } else if (happyMode === 'solo') {
            // Jouer une seule piste spécifique
            trackNames.forEach(name => {
                if (tracks[name] && name !== happyMuteTrack) {
                    const slider = document.getElementById(`volume-slider-${name}`);
                    const volumeLabel = document.getElementById(`volume-${name}`);
                    if (slider) slider.value = 0;
                    if (volumeLabel) volumeLabel.textContent = "0%";
                    if (tracks[name].gainNode) {
                        tracks[name].gainNode.gain.value = 0;
                    }
                }
            });
        } else if (happyEffect !== 'None') {
            // Appliquer un effet à la piste sélectionnée
            if (tracks[happyMuteTrack]) {
                applyEffectPreset(happyMuteTrack, happyEffect);
            }
        }
    } else if (expression === 'sad') {
        if (sadMode === 'mute') {
            // Muter une piste spécifique
            if (tracks[sadMuteTrack]) {
                const slider = document.getElementById(`volume-slider-${sadMuteTrack}`);
                const volumeLabel = document.getElementById(`volume-${sadMuteTrack}`);
                if (slider) slider.value = 0;
                if (volumeLabel) volumeLabel.textContent = "0%";
                if (tracks[sadMuteTrack].gainNode) {
                    tracks[sadMuteTrack].gainNode.gain.value = 0;
                }
            }
        } else if (sadMode === 'solo') {
            // Jouer une seule piste spécifique
            trackNames.forEach(name => {
                if (tracks[name] && name !== sadMuteTrack) {
                    const slider = document.getElementById(`volume-slider-${name}`);
                    const volumeLabel = document.getElementById(`volume-${name}`);
                    if (slider) slider.value = 0;
                    if (volumeLabel) volumeLabel.textContent = "0%";
                    if (tracks[name].gainNode) {
                        tracks[name].gainNode.gain.value = 0;
                    }
                }
            });
        } else if (sadEffect !== 'None') {
            // Appliquer un effet à la piste sélectionnée
            if (tracks[sadMuteTrack]) {
                applyEffectPreset(sadMuteTrack, sadEffect);
            }
        }
    } else if (expression === 'angry') {
        if (angryMode === 'mute') {
            // Muter une piste spécifique
            if (tracks[angryTrack]) {
                const slider = document.getElementById(`volume-slider-${angryTrack}`);
                const volumeLabel = document.getElementById(`volume-${angryTrack}`);
                if (slider) slider.value = 0;
                if (volumeLabel) volumeLabel.textContent = "0%";
                if (tracks[angryTrack].gainNode) {
                    tracks[angryTrack].gainNode.gain.value = 0;
                }
            }
        } else if (angryMode === 'solo') {
            // Jouer une seule piste spécifique
            trackNames.forEach(name => {
                if (tracks[name] && name !== angryTrack) {
                    const slider = document.getElementById(`volume-slider-${name}`);
                    const volumeLabel = document.getElementById(`volume-${name}`);
                    if (slider) slider.value = 0;
                    if (volumeLabel) volumeLabel.textContent = "0%";
                    if (tracks[name].gainNode) {
                        tracks[name].gainNode.gain.value = 0;
                    }
                }
            });
        } else if (angryEffect !== 'None') {
            // Appliquer un effet à la piste sélectionnée
            if (tracks[angryTrack]) {
                applyEffectPreset(angryTrack, angryEffect);
            }
        }
    } else if (expression === 'surprised') {
        if (surpriseMode === 'mute') {
            // Muter une piste spécifique
            if (tracks[surpriseTrack]) {
                const slider = document.getElementById(`volume-slider-${surpriseTrack}`);
                const volumeLabel = document.getElementById(`volume-${surpriseTrack}`);
                if (slider) slider.value = 0;
                if (volumeLabel) volumeLabel.textContent = "0%";
                if (tracks[surpriseTrack].gainNode) {
                    tracks[surpriseTrack].gainNode.gain.value = 0;
                }
            }
        } else if (surpriseMode === 'solo') {
            // Jouer une seule piste spécifique
            trackNames.forEach(name => {
                if (tracks[name] && name !== surpriseTrack) {
                    const slider = document.getElementById(`volume-slider-${name}`);
                    const volumeLabel = document.getElementById(`volume-${name}`);
                    if (slider) slider.value = 0;
                    if (volumeLabel) volumeLabel.textContent = "0%";
                    if (tracks[name].gainNode) {
                        tracks[name].gainNode.gain.value = 0;
                    }
                }
            });
        } else if (surpriseEffect !== 'None') {
            // Appliquer un effet à la piste sélectionnée
            if (tracks[surpriseTrack]) {
                applyEffectPreset(surpriseTrack, surpriseEffect);
            }
        }
    }
    // Pour l'expression neutre, toutes les pistes restent actives sans effet
    
    // Après avoir défini les volumes des pistes, appliquer le volume global
    Object.values(tracks).forEach(track => {
        if (track.gainNode) {
            const baseVolume = track.gainNode.gain.value;
            track.gainNode.gain.value = baseVolume * globalVolume;
        }
    });
}

// Fonction pour chercher une nouvelle position temporelle
function seekToTime(newTime) {
    if (!isPlaying || !audioContext) return;
    
    // Arrêter les sources audio actuelles
    Object.values(tracks).forEach(track => {
        if (track.source) {
            try {
                track.source.stop();
                track.source.disconnect();
                
                // Déconnecter les effets
                track.effects.forEach(effect => {
                    if (effect.disconnect) effect.disconnect();
                });
            } catch (error) {
                console.error("Erreur lors de l'arrêt des pistes:", error);
            }
        }
    });
    
    // Mettre à jour le temps de départ
    startTime = audioContext.currentTime - newTime;
    
    // Recréer et démarrer de nouvelles sources audio
    Object.entries(tracks).forEach(([name, track]) => {
        try {
            // Créer un nouveau nœud source
            const source = audioContext.createBufferSource();
            source.buffer = track.buffer;
            
            // Connecter: source -> gain -> destination
            source.connect(track.gainNode);
            
            // Stocker le nœud source
            track.source = source;
            
            // Démarrer la lecture à la nouvelle position
            source.start(0, newTime);
            
            // Réappliquer les effets si nécessaire
            if (track.currentEffect !== 'None') {
                applyEffectPreset(name, track.currentEffect);
            }
        } catch (error) {
            console.error(`Erreur lors de la reprise de la piste ${name}:`, error);
            showStatus(`Erreur lors de la reprise: ${error.message}`, true);
        }
    });
    
    // Mettre immédiatement à jour l'indicateur visuel
    updateProgressBar(true);
    
    showStatus(`Position changée à ${formatTime(newTime)}`);
}

// Mettre à jour la fonction updateProgressBar pour supprimer la référence au label
function updateProgressBar(immediate = false) {
    if (!isPlaying || !audioContext) return;
    
    const currentTime = audioContext.currentTime - startTime;
    const progressPercent = Math.min((currentTime / longestTrackDuration) * 100, 100);
    
    const progressIndicator = document.getElementById('progress-indicator');
    if (progressIndicator) {
        // Pour les mises à jour immédiates, désactiver la transition
        if (immediate) {
            progressIndicator.style.transition = 'none';
            // Forcer le reflow pour appliquer le changement immédiatement
            void progressIndicator.offsetWidth;
        }
        
        progressIndicator.style.width = `${progressPercent}%`;
        
        // Réactiver la transition après la mise à jour
        if (immediate) {
            setTimeout(() => {
                progressIndicator.style.transition = 'width 0.1s';
            }, 50);
        }
    }
}

// Fonction utilitaire pour formater le temps en minutes:secondes
function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Ajouter cette fonction pour initialiser le détecteur de pose
async function initPoseDetection() {
    try {
        updateDebugInfo("Initialisation de la détection de pose...");
        
        // Vérifier que TensorFlow.js est chargé
        if (typeof tf === 'undefined') {
            throw new Error("TensorFlow.js n'est pas chargé");
        }
        
        // Vérifier que le module de détection de pose est chargé
        if (typeof poseDetection === 'undefined') {
            throw new Error("Le module de détection de pose n'est pas chargé");
        }
        
        // Configuration du modèle MoveNet
        const modelConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            trackerType: poseDetection.TrackerType.BoundingBox
        };
        
        // Attendre que TensorFlow.js soit prêt
        await tf.ready();
        updateDebugInfo("✅ TensorFlow.js est prêt");
        
        // Créer le détecteur avec la bonne configuration
        poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            modelConfig
        );
        
        isPoseDetectionActive = true;
        updateDebugInfo("✅ Détecteur de pose initialisé avec succès");
        
        // Démarrer la détection de pose avec un intervalle plus long pour de meilleures performances
        if (poseDetectionInterval) {
            clearInterval(poseDetectionInterval);
        }
        poseDetectionInterval = setInterval(detectPose, 100);
        
    } catch (error) {
        console.error("Erreur d'initialisation de la détection de pose:", error);
        updateDebugInfo(`❌ Erreur d'initialisation de la détection de pose: ${error.message}`);
    }
}

// Dans la fonction detectPose, ajoutons le dessin des points de pose
async function detectPose() {
    if (!isPoseDetectionActive || !poseDetector || !video || video.readyState < 2) return;

    try {
        // Créer un élément canvas temporaire pour la détection de pose
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.width;
        tempCanvas.height = video.height;
        const tempContext = tempCanvas.getContext('2d');
        tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        // Utiliser l'image du canvas temporaire pour la détection de pose
        const poses = await poseDetector.estimatePoses(tempCanvas);
        
        // Dessiner sur le canvas principal
        if (poses.length > 0) {
            const pose = poses[0];
            
            // Dessiner tous les points de pose
            pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.3) {
                    context.beginPath();
                    context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                    context.fillStyle = '#00ff00';
                    context.fill();
                }
            });
            
            const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
            const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
            
            if (rightWrist && rightShoulder && rightWrist.score > 0.3 && rightShoulder.score > 0.3) {
                // Dessiner une ligne entre l'épaule et le poignet
                context.beginPath();
                context.moveTo(rightShoulder.x, rightShoulder.y);
                context.lineTo(rightWrist.x, rightWrist.y);
                context.strokeStyle = '#00ff00';
                context.lineWidth = 2;
                context.stroke();
                
                // Calculer la position relative du poignet par rapport à l'épaule
                const relativePosition = (rightShoulder.y - rightWrist.y) / video.height;
                
                // Mettre à jour le volume global (0 à 1)
                globalVolume = Math.max(0, Math.min(1, 1 - relativePosition));
                
                // Afficher le volume actuel sur le canvas
                context.fillStyle = '#ffffff';
                context.fillRect(10, 10, 100, 30);
                context.fillStyle = '#000000';
                context.font = '12px Arial';
                context.fillText(`Volume: ${Math.round(globalVolume * 100)}%`, 15, 30);
                
                // Appliquer le volume à toutes les pistes
                Object.values(tracks).forEach(track => {
                    if (track.gainNode) {
                        // Check if the volume slider exists before accessing its value
                        const volumeSlider = document.getElementById(`volume-slider-${track.name}`);
                        if (volumeSlider) {
                            const baseVolume = parseInt(volumeSlider.value) / 100;
                            track.gainNode.gain.value = baseVolume * globalVolume;
                        } else {
                            // If slider doesn't exist, use default volume
                            track.gainNode.gain.value = globalVolume;
                        }
                    }
                });
                
                // Mettre à jour l'indicateur visuel
                updateVolumeIndicator(globalVolume);
            }
        }
    } catch (error) {
        console.error("Erreur lors de la détection de pose:", error);
        updateDebugInfo(`Erreur de détection de pose: ${error.message}`);
    }
}

// Ajouter cette fonction pour mettre à jour l'indicateur de volume
function updateVolumeIndicator(volume) {
    const volumeLevel = document.getElementById('volume-level');
    if (volumeLevel) {
        volumeLevel.style.height = `${volume * 100}%`;
    }
}

async function checkPoseModels() {
    try {
        const response = await fetch('./pose-models/model.json');
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement du modèle: ${response.status}`);
        }
        const modelConfig = await response.json();
        updateDebugInfo("✅ Fichier model.json trouvé et valide");
        return true;
    } catch (error) {
        updateDebugInfo(`❌ Erreur lors de la vérification des modèles: ${error.message}`);
        return false;
    }
}
