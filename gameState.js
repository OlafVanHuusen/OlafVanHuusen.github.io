// Game state management
import { renderGrid } from './ui.js';
import { generateGrid } from './grid.js';
import { initializeDictionary } from './dictionary.js';
import { addTouchSupport } from './input.js';

// Game state
export const gameState = {
    grid: [],
    selectedCells: [],
    currentWord: '',
    foundWords: [],
    score: 0, // Total seconds added
    timeLeft: 60, // 1 minute in seconds
    elapsedTime: 0, // Track elapsed time
    timer: null,
    gridSize: 4,
    dictionary: new Set(),
    consonants: 'BCDFGHJKLMNPQRSTVWXYZ',
    vowels: 'AEIOU',
    commonLetters: 'ETAOINSHRDLU',
    isPaused: false, // Paused state flag
    level: 1, // Current level
    wordsToAdvance: 5, // Words needed to advance to next level
    wordsInCurrentLevel: 0, // Words found in current level
};

// DOM elements
export const gameElements = {
    gameGrid: null,
    wordDisplay: null,
    messageDisplay: null,
    submitButton: null,
    clearButton: null,
    shuffleButton: null,
    wordsCountDisplay: null,
    scoreDisplay: null,
    elapsedTimeDisplay: null,
    wordsFoundContainer: null,
    tutorialOverlay: null,
    startGameButton: null,
    timerDisplay: null,
    pauseToggleButton: null,
    pauseIcon: null,
    resumeIcon: null,
    levelDisplay: null,
    levelProgressBar: null,
};

// Initialize the game
export function initializeGame() {
    // Get all DOM elements
    gameElements.gameGrid = document.getElementById('game-grid');
    gameElements.wordDisplay = document.getElementById('word-display');
    gameElements.messageDisplay = document.getElementById('message');
    gameElements.submitButton = document.getElementById('submit-word');
    gameElements.clearButton = document.getElementById('clear-word');
    gameElements.shuffleButton = document.getElementById('shuffle');
    gameElements.wordsCountDisplay = document.getElementById('words-count');
    gameElements.scoreDisplay = document.getElementById('score');
    gameElements.elapsedTimeDisplay = document.getElementById('level');
    gameElements.wordsFoundContainer = document.getElementById('words-found');
    gameElements.tutorialOverlay = document.getElementById('tutorial-overlay');
    gameElements.startGameButton = document.getElementById('start-game');
    gameElements.timerDisplay = document.getElementById('timer');
    gameElements.pauseToggleButton = document.getElementById('pause-toggle');
    gameElements.pauseIcon = document.getElementById('pause-icon');
    gameElements.resumeIcon = document.getElementById('resume-icon');
    gameElements.levelDisplay = document.getElementById('level-display');
    gameElements.levelProgressBar = document.getElementById('level-progress');

    // Set up the grid
    gameState.grid = generateGrid(gameState.gridSize);
    renderGrid();

    // Initialize dictionary
    initializeDictionary();

    // Add touch support for mobile devices
    addTouchSupport();

    // Display initial stats
    updateStats();
}

// Update game stats
export function updateStats() {
    gameElements.wordsCountDisplay.textContent = gameState.foundWords.length;
    gameElements.scoreDisplay.textContent = gameState.score;

    // Format elapsed time as MM:SS
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    gameElements.elapsedTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update level display
    if (gameElements.levelDisplay) {
        gameElements.levelDisplay.textContent = `Level ${gameState.level}`;
    }
    
    // Update level progress bar
    if (gameElements.levelProgressBar) {
        const progressPercent = (gameState.wordsInCurrentLevel / gameState.wordsToAdvance) * 100;
        gameElements.levelProgressBar.style.width = `${progressPercent}%`;
    }
}

// Show a message
export function showMessage(text) {
    gameElements.messageDisplay.textContent = text;

    // Clear message after 2 seconds
    setTimeout(() => {
        gameElements.messageDisplay.textContent = '';
    }, 2000);
} 