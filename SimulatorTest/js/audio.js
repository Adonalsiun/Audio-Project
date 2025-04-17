/**
 * audio.js
 * Handles audio feedback and sonification
 */

let audioContext;
let audioInitialized = false;

let masterGainNode;
let ttsGainNode;
let sonificationGainNode;

const soundProfiles = {
    standard: {
        // Error sounds for different error types
        errorSounds: {
            default: { frequency: 220, wave: "sawtooth", duration: 0.3 },
            brackets: { frequency: 196, wave: "square", duration: 0.4 },
            punctuation: { frequency: 246, wave: "sawtooth", duration: 0.25 },
            spelling: { frequency: 174, wave: "triangle", duration: 0.35 },
            whitespace: { frequency: 233, wave: "sine", duration: 0.3 }
        },
        keypressSound: { frequency: 440, wave: "sine", duration: 0.05 },
        indentationBase: 220,
        indentationInterval: 110,
        functionCallSound: { frequency: 660, wave: "sine", duration: 0.2 },
        loopSound: { frequency: 330, wave: "triangle", duration: 0.15 }
    },
    minimal: {
        errorSounds: {
            default: { frequency: 220, wave: "sine", duration: 0.2 },
            brackets: { frequency: 196, wave: "sine", duration: 0.3 },
            punctuation: { frequency: 246, wave: "sine", duration: 0.15 },
            spelling: { frequency: 174, wave: "sine", duration: 0.25 },
            whitespace: { frequency: 233, wave: "sine", duration: 0.2 }
        },
        keypressSound: { frequency: 440, wave: "sine", duration: 0.03 },
        indentationBase: 220,
        indentationInterval: 55,
        functionCallSound: { frequency: 550, wave: "sine", duration: 0.1 },
        loopSound: { frequency: 330, wave: "sine", duration: 0.1 }
    },
    detailed: {
        errorSounds: {
            default: { frequency: 220, wave: "sawtooth", duration: 0.5 },
            brackets: { frequency: 196, wave: "square", duration: 0.6 },
            punctuation: { frequency: 246, wave: "sawtooth", duration: 0.4 },
            spelling: { frequency: 174, wave: "triangle", duration: 0.55 },
            whitespace: { frequency: 233, wave: "sine", duration: 0.5 }
        },
        keypressSound: { frequency: 440, wave: "sine", duration: 0.07 },
        indentationBase: 220,
        indentationInterval: 165,
        functionCallSound: { frequency: 770, wave: "square", duration: 0.3 },
        loopSound: { frequency: 330, wave: "triangle", duration: 0.25 }
    },
    custom: {
        errorSounds: {
            default: { frequency: 220, wave: "sawtooth", duration: 0.3 },
            brackets: { frequency: 196, wave: "square", duration: 0.4 },
            punctuation: { frequency: 246, wave: "sawtooth", duration: 0.25 },
            spelling: { frequency: 174, wave: "triangle", duration: 0.35 },
            whitespace: { frequency: 233, wave: "sine", duration: 0.3 }
        },
        keypressSound: { frequency: 440, wave: "sine", duration: 0.05 },
        indentationBase: 220,
        indentationInterval: 110,
        functionCallSound: { frequency: 660, wave: "sine", duration: 0.2 },
        loopSound: { frequency: 330, wave: "triangle", duration: 0.15 }
    }
};

let currentProfile = soundProfiles.standard;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        masterGainNode = audioContext.createGain();
        masterGainNode.gain.value = 0.7;
        masterGainNode.connect(audioContext.destination);
        
        ttsGainNode = audioContext.createGain();
        ttsGainNode.gain.value = 0.8;
        ttsGainNode.connect(masterGainNode);
        
        sonificationGainNode = audioContext.createGain();
        sonificationGainNode.gain.value = 0.6;
        sonificationGainNode.connect(masterGainNode);
        
        audioInitialized = true;
        console.log("Audio system initialized");
    } catch (e) {
        console.error("Error initializing audio system:", e);
        alert("Error initializing audio system. Some browsers may require user interaction before audio can play.");
    }
}

function ensureAudioContext() {
    if (!audioInitialized) {
        initAudio();
        return;
    }
    
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

function generateTone(frequency, waveType, duration, gainNode = sonificationGainNode) {
    ensureAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    oscillator.type = waveType;
    oscillator.frequency.value = frequency;
    
    noteGain.gain.value = 0;
    
    oscillator.connect(noteGain);
    noteGain.connect(gainNode);
    
    const now = audioContext.currentTime;
    
    noteGain.gain.linearRampToValueAtTime(1, now + 0.01);
    
    noteGain.gain.linearRampToValueAtTime(0.7, now + 0.05);
    
    noteGain.gain.setValueAtTime(0.7, now + duration - 0.05);
    noteGain.gain.linearRampToValueAtTime(0, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    document.getElementById("current-sound-status").textContent = 
        `${waveType} @ ${frequency}Hz`;
    
    return oscillator;
}

function determineErrorType(error) {
    const errorMsg = error.message.toLowerCase();
    const lineText = codeEditor.getLine(error.line).trim();

    if (errorMsg.includes('indentation') || 
        errorMsg.includes('unexpected indent') || 
        errorMsg.includes('expected an indented block')) {
        return 'whitespace';
    }

    if (errorMsg.includes('missing colon') || 
        errorMsg.includes('expected :') ||
        (/:/.test(errorMsg) && !lineText.includes(':'))) {
        return 'punctuation';
    }

    if (errorMsg.includes('unclosed') || 
        errorMsg.includes('missing') || 
        /[\(\[\{]/.test(errorMsg) || 
        /[\)\]\}]/.test(errorMsg)) {
        return 'brackets';
    }

    if (errorMsg.includes('undefined') || 
        errorMsg.includes('not defined') ||
        errorMsg.includes('nameerror')) {
        return 'spelling';
    }

    if (errorMsg.includes('invalid syntax')) {
        return 'default';
    }

    return 'default';
}

function playSyntaxErrorSound(error) {
    const errorFeedbackMode = document.getElementById("error-feedback-mode").value;
    if (errorFeedbackMode === "compilation" && !isCompilationTriggered) {
        return;
    }
    
    const errorType = determineErrorType(error);
    
    const { frequency, wave, duration } = currentProfile.errorSounds[errorType];
    
    generateTone(frequency, wave, duration);
    
    document.getElementById("error-type").textContent = 
        errorType.charAt(0).toUpperCase() + errorType.slice(1);
    
    if (document.getElementById("error-feedback").checked) {
        speakText(`Line ${error.line + 1}, ${errorType} error`);
    }
}

function playChord(notes, duration) {
    ensureAudioContext();
    const now = audioContext.currentTime;
    
    notes.forEach(note => {
        const { frequency, wave } = note;
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        
        oscillator.type = wave;
        oscillator.frequency.value = frequency;
        
        noteGain.gain.value = 0;
        
        oscillator.connect(noteGain);
        noteGain.connect(sonificationGainNode);
        
        noteGain.gain.linearRampToValueAtTime(0.7 / notes.length, now + 0.01);
        noteGain.gain.setValueAtTime(0.7 / notes.length, now + duration - 0.05);
        noteGain.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    });
}

function playKeypressSound(character) {
    
    const { frequency, wave, duration } = currentProfile.keypressSound;
    
    let adjustedFrequency = frequency;
    
    if (character === "{" || character === "}") {
        adjustedFrequency = frequency * 1.5; // Higher tone for braces
    } else if (character === "(" || character === ")") {
        adjustedFrequency = frequency * 1.3; // Higher tone for parentheses
    } else if (character === "[" || character === "]") {
        adjustedFrequency = frequency * 1.4; // Higher tone for brackets
    } else if (character === ";" || character === ".") {
        adjustedFrequency = frequency * 0.8; // Lower tone for statement terminators
    } else if (character === "," || character === ":") {
        adjustedFrequency = frequency * 0.9; // Lower tone for other punctuation
    }
    
    generateTone(adjustedFrequency, wave, duration);
}

function playIndentationSound(level) {
    if (!document.getElementById("indentation-feedback").checked) return;
    
    const baseFrequency = currentProfile.indentationBase;
    const interval = currentProfile.indentationInterval;
    
    const frequency = baseFrequency + (level * interval);
    
    generateTone(frequency, "sine", 0.15);
}

function playFunctionCallSound(functionName) {
    if (!document.getElementById("function-feedback").checked) return;
    
    const { frequency, wave, duration } = currentProfile.functionCallSound;
    
    generateTone(frequency, wave, duration);
    
}

function playLoopSound(loopType) {
    if (!document.getElementById("loop-feedback").checked) return;
    
    const { frequency, wave, duration } = currentProfile.loopSound;
    
    let adjustedFrequency = frequency;
    if (loopType === "for") {
        adjustedFrequency = frequency * 1.2;
    } else if (loopType === "while") {
        adjustedFrequency = frequency * 1.0;
    } else if (loopType === "do") {
        adjustedFrequency = frequency * 0.9;
    }
    
    generateTone(adjustedFrequency, wave, duration);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.0;
        utterance.volume = ttsGainNode.gain.value;
        
        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Text-to-speech not supported in this browser");
    }
}

function setSoundProfile(profileName) {
    if (soundProfiles[profileName]) {
        currentProfile = soundProfiles[profileName];
        console.log(`Sound profile set to: ${profileName}`);
    } else {
        console.error(`Sound profile '${profileName}' not found`);
    }
}

function updateVolumes(master, tts, sonification) {
    if (masterGainNode) masterGainNode.gain.value = master;
    if (ttsGainNode) ttsGainNode.gain.value = tts;
    if (sonificationGainNode) sonificationGainNode.gain.value = sonification;
}

let isCompilationTriggered = false;

function triggerCompilation() {
    isCompilationTriggered = true;
    
    analyzeCode();
    
    setTimeout(() => {
        isCompilationTriggered = false;
    }, 500);
}
let demoIndex = 0;
let demoTimeout;

function runSoundDemo() {
    const demoSteps = [
        {
            sound: () => generateTone(currentProfile.keypressSound.frequency, 
                                  currentProfile.keypressSound.wave, 
                                  currentProfile.keypressSound.duration),
            description: "Keypress sound - plays when you type"
        },
        {
            sound: () => playIndentationSound(0),
            description: "Indentation level 0"
        },
        {
            sound: () => playIndentationSound(1),
            description: "Indentation level 1"
        },
        {
            sound: () => playIndentationSound(2),
            description: "Indentation level 2"
        },
        {
            sound: () => playFunctionCallSound("exampleFunction"),
            description: "Function call sound"
        },
        {
            sound: () => playLoopSound("for"),
            description: "For loop sound"
        },
        {
            sound: () => playLoopSound("while"),
            description: "While loop sound"
        },
        {
            sound: () => {
                const error = {
                    line: 0,
                    ch: 0,
                    message: "Example error",
                    severity: "error"
                };
                playSyntaxErrorSound(error);
            },
            description: "Default error sound"
        },
        {
            sound: () => {
                const error = {
                    line: 0,
                    ch: 0,
                    message: "Bracket error",
                    severity: "error"
                };
                currentProfile.errorSounds.brackets = currentProfile.errorSounds.brackets || currentProfile.errorSounds.default;
                generateTone(currentProfile.errorSounds.brackets.frequency,
                          currentProfile.errorSounds.brackets.wave,
                          currentProfile.errorSounds.brackets.duration);
            },
            description: "Bracket error sound "
        },
        {
            sound: () => {
                const error = {
                    line: 0,
                    ch: 0,
                    message: "Punctuation error",
                    severity: "error"
                };
                currentProfile.errorSounds.punctuation = currentProfile.errorSounds.punctuation || currentProfile.errorSounds.default;
                generateTone(currentProfile.errorSounds.punctuation.frequency,
                          currentProfile.errorSounds.punctuation.wave,
                          currentProfile.errorSounds.punctuation.duration);
            },
            description: "Punctuation error sound"
        },
        {
            sound: () => {
                const error = {
                    line: 0,
                    ch: 0,
                    message: "Spelling error",
                    severity: "error"
                };
                currentProfile.errorSounds.spelling = currentProfile.errorSounds.spelling || currentProfile.errorSounds.default;
                generateTone(currentProfile.errorSounds.spelling.frequency,
                          currentProfile.errorSounds.spelling.wave,
                          currentProfile.errorSounds.spelling.duration);
            },
            description: "Spelling error sound"
        },
        {
            sound: () => {
                const error = {
                    line: 0,
                    ch: 0,
                    message: "White space error",
                    severity: "error"
                };
                currentProfile.errorSounds.whitespace = currentProfile.errorSounds.whitespace || currentProfile.errorSounds.default;
                generateTone(currentProfile.errorSounds.whitespace.frequency,
                          currentProfile.errorSounds.whitespace.wave,
                          currentProfile.errorSounds.whitespace.duration);
            },
            description: "Whitespace error sound"
        },
        {
            sound: () => playChord([
                {frequency: 440, wave: "sine"},
                {frequency: 550, wave: "sine"},
                {frequency: 660, wave: "sine"}
            ], 0.5),
            description: "Chord - plays multiple tones simultaneously for special events"
        }
    ];

    if (demoTimeout) clearTimeout(demoTimeout);
    
    if (demoIndex >= demoSteps.length) {
        demoIndex = 0;
        document.getElementById("demo-status").textContent = "Demo complete";
        return;
    }

    const currentStep = demoSteps[demoIndex];
    currentStep.sound();
    document.getElementById("demo-status").textContent = currentStep.description;
    speakText(currentStep.description);

    demoIndex++;
    demoTimeout = setTimeout(runSoundDemo, 3000); // 3 seconds between sounds
}

function stopSoundDemo() {
    if (demoTimeout) clearTimeout(demoTimeout);
    demoIndex = 0;
    document.getElementById("demo-status").textContent = "Demo stopped";
}
window.audioFeedback = {
    initAudio,
    playSyntaxErrorSound,
    playKeypressSound,
    playIndentationSound,
    playFunctionCallSound,
    playLoopSound,
    speakText,
    setSoundProfile,
    updateVolumes,
    triggerCompilation,
    playChord,
    runSoundDemo,
    stopSoundDemo
};