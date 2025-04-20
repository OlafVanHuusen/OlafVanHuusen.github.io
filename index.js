// Main entry point
import { gameState, gameElements, initializeGame } from './gameState.js';
import { startGame } from './timer.js';
import { togglePause, submitWord } from './ui.js';
import { clearSelection, setupMouseHandlers } from './input.js';
import { shuffleGrid } from './grid.js';
import { initLevelDisplay } from './levels.js';

// Initialize the game when the page loads
window.addEventListener('load', () => {
    // Initialize game
    initializeGame();
    
    // Initialize level display
    initLevelDisplay();
    
    // Setup mouse handlers
    setupMouseHandlers();
    
    // Expose necessary functions to global scope for event handlers in HTML
    window.startGame = startGame;
    window.togglePause = togglePause;
    window.submitWord = submitWord;
    window.clearSelection = clearSelection;
    window.shuffleGrid = shuffleGrid;
    
    // Set up event listeners
    const gameElements = document.querySelectorAll('[id^="game-"]');
    gameElements.forEach(element => {
        if (element.id === 'game-container') return;
        
        // Style game elements
        element.style.transition = 'all 0.3s ease';
    });
    
    console.log('Word Labyrinth initialized!');
}); 