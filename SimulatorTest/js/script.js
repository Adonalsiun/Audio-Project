/**
 * script.js
 * Main JavaScript file for the simulator
 */

document.addEventListener("DOMContentLoaded", () => {
    window.editorActions.initEditor();
    window.audioFeedback.initAudio();    
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById("sound-profile").addEventListener("change", (e) => {
        window.audioFeedback.setSoundProfile(e.target.value);
    });
    
    document.getElementById("master-volume").addEventListener("input", updateVolumeSettings);
    document.getElementById("tts-volume").addEventListener("input", updateVolumeSettings);
    document.getElementById("sonification-volume").addEventListener("input", updateVolumeSettings);
    
    document.getElementById("load-data-btn").addEventListener("click", () => {
        const dataType = document.getElementById("test-data").value;
        if (dataType !== "none") {
            window.editorActions.loadTestData(dataType);
        }
    });
    document.getElementById("demo-btn").addEventListener("click", () => {
    const buttonText = document.getElementById("demo-btn").textContent;
    if (buttonText === "Start Sound Demo") {
        document.getElementById("demo-btn").textContent = "Stop Sound Demo";
        window.audioFeedback.runSoundDemo();
    } else {
        document.getElementById("demo-btn").textContent = "Start Sound Demo";
        window.audioFeedback.stopSoundDemo();
    }
});
    document.getElementById("playback-btn").addEventListener("click", () => {
    const buttonText = document.getElementById("playback-btn").textContent;
    if (buttonText === "Start Playback") {
        window.editorActions.startDataPlayback();
    } else {
        window.editorActions.stopDataPlayback();
    }
});
    document.getElementById("play-btn").addEventListener("click", () => {
        window.editorActions.playSimulation();
    });
    
    document.getElementById("pause-btn").addEventListener("click", () => {
        window.editorActions.pauseSimulation();
    });
    
    document.getElementById("reset-btn").addEventListener("click", () => {
        window.editorActions.resetEditor();
    });
    
    document.getElementById("challenge-btn").addEventListener("click", () => {
        const buttonText = document.getElementById("challenge-btn").textContent;
        if (buttonText === "Start Challenge") {
            window.editorActions.startChallenge();
        } else {
            window.editorActions.stopChallenge();
        }
    });
    
    document.getElementById("compile-btn").addEventListener("click", () => {
        window.audioFeedback.triggerCompilation();
    });
    
    updateVolumeDisplays();
}

function updateVolumeSettings() {
    const masterVolume = parseFloat(document.getElementById("master-volume").value);
    const ttsVolume = parseFloat(document.getElementById("tts-volume").value);
    const sonificationVolume = parseFloat(document.getElementById("sonification-volume").value);
    
    window.audioFeedback.updateVolumes(masterVolume, ttsVolume, sonificationVolume);
    
    updateVolumeDisplays();
}

function updateVolumeDisplays() {
    document.getElementById("master-volume-value").textContent = 
        `${Math.round(document.getElementById("master-volume").value * 100)}%`;
    
    document.getElementById("tts-volume-value").textContent = 
        `${Math.round(document.getElementById("tts-volume").value * 100)}%`;
    
    document.getElementById("sonification-volume-value").textContent = 
        `${Math.round(document.getElementById("sonification-volume").value * 100)}%`;
}

let userProficiency = 0;

function updateUserProficiency() {
    
    if (!document.getElementById("adaptive-feedback").checked) return;
    
    const proficiencyTimer = setInterval(() => {
        if (userProficiency < 2) {
            userProficiency++;
            console.log(`User proficiency updated to: ${userProficiency}`);
            
            adjustFeedbackIntensity();
        } else {
            clearInterval(proficiencyTimer);
        }
    }, 5 * 60 * 1000);
}

function adjustFeedbackIntensity() {

    const ttsRates = [1.0, 1.2, 1.5]; 
    
    console.log(`TTS rate adjusted to: ${ttsRates[userProficiency]}`);
}

updateUserProficiency();

let dataPlaybackActive = false;
let dataPlaybackInterval = null;
let currentSampleData = null;
let playbackStartTime = null;
let playbackEvents = [];

// Load sample data
let sampleData = {};
fetch('data/sample-data.json')
    .then(response => response.json())
    .then(data => {
        sampleData = data;
        populateSampleDataDropdown();
    })
    .catch(error => console.error('Error loading sample data:', error));

function populateSampleDataDropdown() {
    const dropdown = document.getElementById('sample-data-dropdown');
    sampleData.sampleData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        dropdown.appendChild(option);
    });
}

function startDataPlayback() {
    const selectedId = document.getElementById('sample-data-dropdown').value;
    if (!selectedId) return;
    
    currentSampleData = sampleData.sampleData.find(item => item.id === selectedId);
    if (!currentSampleData) return;
    
    codeEditor.setValue(currentSampleData.code);
    
    playbackEvents = [...currentSampleData.events];
    playbackEvents.sort((a, b) => a.timeOffset - b.timeOffset);
    
    dataPlaybackActive = true;
    playbackStartTime = Date.now();
    
    document.getElementById('playback-btn').textContent = 'Stop Playback';
    document.getElementById('playback-status').textContent = `Playing: ${currentSampleData.name}`;
    
    processPlaybackEvents();
}

function stopDataPlayback() {
    dataPlaybackActive = false;
    if (dataPlaybackInterval) {
        clearInterval(dataPlaybackInterval);
        dataPlaybackInterval = null;
    }
    
    document.getElementById('playback-btn').textContent = 'Start Playback';
    document.getElementById('playback-status').textContent = 'Stopped';
}

function processPlaybackEvents() {
    if (!dataPlaybackActive || playbackEvents.length === 0) {
        stopDataPlayback();
        return;
    }
    
    const currentTime = Date.now() - playbackStartTime;
    const nextEvent = playbackEvents[0];
    
    if (currentTime >= nextEvent.timeOffset) {
        handlePlaybackEvent(nextEvent);
        
        playbackEvents.shift();
    }
    
    dataPlaybackInterval = setTimeout(processPlaybackEvents, 100);
}

function handlePlaybackEvent(event) {
    switch(event.type) {
        case 'error':
            codeEditor.setCursor({line: event.line - 1, ch: event.character - 1});
            
            const error = {
                line: event.line - 1,
                ch: event.character - 1,
                message: event.message,
                severity: "error"
            };
            
            handleSyntaxErrors([error]);
            break;
            
        case 'indentation':
            codeEditor.setCursor({line: event.line - 1, ch: 0});
            
            playIndentationSound(event.level);
            break;
            
        case 'function':
            codeEditor.setCursor({line: event.line - 1, ch: 0});
            
            playFunctionCallSound(event.name);
            break;
            
        case 'loop':
            codeEditor.setCursor({line: event.line - 1, ch: 0});
            
            playLoopSound(event.loopType);
            break;
    }
}

window.editorActions = {
    ...window.editorActions,
    startDataPlayback,
    stopDataPlayback
};