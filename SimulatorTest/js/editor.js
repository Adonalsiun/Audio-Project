/**
 * editor.js
 * Handles the live text editor component and related functionality
 */

let codeEditor;
let lastErrorLine = -1;
let indentationLevels = {};

let challengeActive = false;
let challengeStartTime = null;
let challengeErrors = [];
let challengeInterval = null;
let initialErrorCount = 0;

function initEditor() {
    codeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
        mode: "javascript",
        theme: "dracula",
        lineNumbers: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-lint-markers"],
        lint: {
            esversion: 11,
            asi: true
        }
    });

    codeEditor.on("change", handleEditorChange);
    codeEditor.on("cursorActivity", handleCursorActivity);

    analyzeCode();
}

function handleEditorChange(cm, change) {
    analyzeCode();
    
    if (change.text.length > 1) {
        audioFeedback.playIndentationSound(getIndentationAtLine(change.from.line));
    }
    
    if (change.origin === "+input" && change.text[0].length === 1) {
        audioFeedback.playKeypressSound(change.text[0]);
    }
    
    if (challengeActive) {
        updateChallengeProgress();
    }
}

function handleCursorActivity(cm) {
    const cursor = cm.getCursor();
    const line = cursor.line;
    const indentLevel = getIndentationAtLine(line);
    
    document.getElementById("indentation-status").textContent = indentLevel;
    
    if (indentLevel !== lastIndentLevel) {
        audioFeedback.playIndentationSound(indentLevel);
        lastIndentLevel = indentLevel;
    }
}

function getIndentationAtLine(lineNumber) {
    if (lineNumber < 0 || lineNumber >= codeEditor.lineCount()) {
        return 0;
    }
    
    const line = codeEditor.getLine(lineNumber);
    const match = line.match(/^\s*/);
    
    if (!match) return 0;
    
    return Math.floor(match[0].length / codeEditor.getOption("tabSize"));
}

function analyzeCode() {
    detectSyntaxErrors();
    mapIndentationLevels();
    detectFunctionCalls();
    detectLoops();
}

function detectSyntaxErrors() {
    const code = codeEditor.getValue();
    let errors = [];
    
    try {
        JSHINT(code, {
            esversion: 11,
            asi: true
        });
        
        if (JSHINT.errors && JSHINT.errors.length > 0) {
            errors = JSHINT.errors.map(error => ({
                line: error.line - 1,
                ch: error.character - 1,
                message: error.reason,
                severity: "error"
            }));
        }
    } catch (e) {
        errors.push({
            line: 0,
            ch: 0,
            message: e.message,
            severity: "error"
        });
    }
    
    handleSyntaxErrors(errors);
    
    return errors;
}

function handleSyntaxErrors(errors) {
    if (lastErrorLine >= 0) {
        codeEditor.removeLineClass(lastErrorLine, "background", "error-line");
        lastErrorLine = -1;
    }
    
    if (!errors || errors.length === 0) {
        document.getElementById("error-status").textContent = "None";
        return;
    }
    
    const firstError = errors[0];
    
    codeEditor.addLineClass(firstError.line, "background", "error-line");
    lastErrorLine = firstError.line;
    
    document.getElementById("error-status").textContent = 
        `Line ${firstError.line + 1}: ${firstError.message}`;
    
    if (document.getElementById("error-feedback").checked) {
        audioFeedback.playSyntaxErrorSound(firstError);
    }
}

function mapIndentationLevels() {
    indentationLevels = {};
    
    for (let i = 0; i < codeEditor.lineCount(); i++) {
        indentationLevels[i] = getIndentationAtLine(i);
    }
}

function detectFunctionCalls() {
    const code = codeEditor.getValue();
    const functionCallRegex = /\b\w+\s*\(/g;
    let match;
    
    while ((match = functionCallRegex.exec(code)) !== null) {
        const pos = codeEditor.posFromIndex(match.index);
        
        if (document.getElementById("function-feedback").checked) {
            console.log(`Function call detected at line ${pos.line + 1}, ch ${pos.ch}`);
        }
    }
}

function detectLoops() {
    const code = codeEditor.getValue();
    const loopRegex = /\b(for|while|do)\b/g;
    let match;
    
    while ((match = loopRegex.exec(code)) !== null) {
        const pos = codeEditor.posFromIndex(match.index);
        
        if (document.getElementById("loop-feedback").checked) {

            console.log(`Loop detected at line ${pos.line + 1}, ch ${pos.ch}: ${match[0]}`);
        }
    }
}


function loadTestData(dataType) {
    let testCode = "";
    
    switch(dataType) {
        case "syntax-errors":
            testCode = `// Syntax error test
function brokenFunction() {
    console.log("This function has errors";
    let x = 10
    if (x > 5) {
        console.log("x is greater than 5")
    }
}

brokenFunction()`;
            break;
        case "indentation":
            testCode = `// Indentation test
function nestedFunction() {
    console.log("Level 1");
    if (true) {
        console.log("Level 2");
        for (let i = 0; i < 3; i++) {
            console.log("Level 3");
            if (i === 1) {
                console.log("Level 4");
            }
        }
    }
}

nestedFunction();`;
            break;
        case "function-calls":
            testCode = `// Function calls test
function greet(name) {
    console.log("Hello, " + name + "!");
    return "Greeting completed";
}

function calculate(a, b) {
    return a + b;
}

greet("User");
let result = calculate(5, 10);
console.log(result);`;
            break;
        case "loops":
            testCode = `// Loops test
function loopTest() {
    // For loop
    for (let i = 0; i < 5; i++) {
        console.log("For loop iteration: " + i);
    }
    
    // While loop
    let j = 0;
    while (j < 3) {
        console.log("While loop iteration: " + j);
        j++;
    }
    
    // Do-while loop
    let k = 0;
    do {
        console.log("Do-while iteration: " + k);
        k++;
    } while (k < 2);
}

loopTest();`;
            break;
        case "mixed":
            testCode = `// Mixed scenario test
function complexFunction(parameter) {
    // Variable declaration
    let count = 0;
    
    // Conditional statement
    if (parameter > 10) {
        // Loop with function call
        for (let i = 0; i < parameter; i++) {
            count = processItem(i);
        }
    } else {
        // Syntax error - missing parenthesis
        console.log("Parameter is too small";
    }
    
    // Nested function
    function processItem(item) {
        // Another syntax error - missing semicolon
        let value = item * 2
        return value;
    }
    
    return count;
}

// Function call
complexFunction(15);`;
            break;
        case "challenge":
            testCode = `// Challenge Mode: Fix all errors
function calculateTotal(items) {
    let total = 0
    
    for (let i = 0; i < items.length i++) {
        let item = items[i];
        total += item.price * item.quantity
    }
    
    if (total > 100) {
        applyDiscount(total)
    } else {
        return total
    }
    
    function applyDiscount(amount {
        let discount = amount * 0.1;
        return amount - discount
    }
}

const shoppingCart = [
    { name: "Laptop", price: 999.99 quantity: 1 },
    { name: "Mouse", price: 29.99, quantity: 1 },
    { name: "Keyboard", price: 59.99, quantity: 1 }
]

calculateTotal(shoppingCart);`;
            break;
        default:
            return;
    }
    
    codeEditor.setValue(testCode);
}

let simulationActive = false;
let simulationInterval = null;
let lastIndentLevel = 0;

function playSimulation() {
    if (simulationActive) return;
    
    simulationActive = true;
    let currentLine = 0;
    
    simulationInterval = setInterval(() => {
        if (currentLine >= codeEditor.lineCount()) {
            pauseSimulation();
            return;
        }
        
        codeEditor.setCursor(currentLine, 0);
        
        codeEditor.addLineClass(currentLine, "background", "active-line");
        
        if (currentLine > 0) {
            codeEditor.removeLineClass(currentLine - 1, "background", "active-line");
        }
        
        currentLine++;
    }, 1000);
}

function pauseSimulation() {
    simulationActive = false;
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    for (let i = 0; i < codeEditor.lineCount(); i++) {
        codeEditor.removeLineClass(i, "background", "active-line");
    }
}

function resetEditor() {
    pauseSimulation();
    stopChallenge();
    codeEditor.setValue(`// Start coding here
function helloWorld() {
    console.log("Hello, world!");
}

helloWorld();`);
}

function startChallenge() {
    if (challengeActive) return;
    
    if (codeEditor.getValue().indexOf("Challenge Mode:") === -1) {
        loadTestData("challenge");
    }
    
    const errors = detectSyntaxErrors();
    initialErrorCount = errors.length;
    challengeErrors = errors;
    
    if (initialErrorCount === 0) {
        alert("No errors found to fix. Please load the challenge code first.");
        return;
    }
    
    challengeActive = true;
    challengeStartTime = Date.now();
    
    document.getElementById("challenge-btn").textContent = "Stop Challenge";
    document.getElementById("challenge-status").textContent = `Active - ${initialErrorCount} errors to fix`;
    document.getElementById("challenge-time").textContent = "00:00";
    
    challengeInterval = setInterval(updateChallengeTimer, 1000);
    
    audioFeedback.speakText(`Challenge started. Fix ${initialErrorCount} errors as quickly as possible.`);
}

function stopChallenge() {
    if (!challengeActive) return;
    
    challengeActive = false;
    
    if (challengeInterval) {
        clearInterval(challengeInterval);
        challengeInterval = null;
    }
    
    document.getElementById("challenge-btn").textContent = "Start Challenge";
    document.getElementById("challenge-status").textContent = "Inactive";
    document.getElementById("challenge-time").textContent = "00:00";
}

function updateChallengeTimer() {
    if (!challengeActive) return;
    
    const elapsedTime = Date.now() - challengeStartTime;
    const seconds = Math.floor((elapsedTime / 1000) % 60);
    const minutes = Math.floor(elapsedTime / 60000);
    
    document.getElementById("challenge-time").textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateChallengeProgress() {
    if (!challengeActive) return;
    
    const currentErrors = detectSyntaxErrors();
    const remainingErrors = currentErrors.length;
    
    document.getElementById("challenge-status").textContent = 
        `Active - ${remainingErrors} of ${initialErrorCount} errors remaining`;
    
    if (remainingErrors === 0) {
        completeChallenge();
    }
}

function completeChallenge() {
    if (!challengeActive) return;
    
    const completionTime = Date.now() - challengeStartTime;
    const seconds = Math.floor((completionTime / 1000) % 60);
    const minutes = Math.floor(completionTime / 60000);
    
    stopChallenge();
    
    document.getElementById("challenge-status").textContent = "Completed!";
    document.getElementById("challenge-time").textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    audioFeedback.speakText(`Challenge completed in ${minutes} minutes and ${seconds} seconds.`);
}

window.editorActions = {
    initEditor,
    loadTestData,
    playSimulation,
    pauseSimulation,
    resetEditor,
    startChallenge, 
    stopChallenge,
    updateChallengeTimer
};