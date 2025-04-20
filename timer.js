// Timer management
import { gameState, gameElements, updateStats } from './gameState.js';
import { createGameOverScreen } from './ui.js';

// Start the game
export function startGame() {
    gameElements.tutorialOverlay.style.display = 'none';

    // Start the timer
    gameState.timer = setInterval(updateTimer, 1000);
    
    // Initialize pause button state
    gameElements.pauseIcon.style.display = 'block';
    gameElements.resumeIcon.style.display = 'none';
    gameState.isPaused = false;
}

// Update the timer
export function updateTimer() {
    // Don't update timer if game is paused
    if (gameState.isPaused) return;
    
    gameState.timeLeft--;
    gameState.elapsedTime++;

    // Update timer display
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    gameElements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update elapsed time in stats
    updateStats();

    // Check if time is up
    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

// End the game
export function endGame() {
    clearInterval(gameState.timer);
    createGameOverScreen();
}

// Get time bonus for a given level
export function getLevelTimeBonus(level) {
    // Base time bonus is 30 seconds, add 10 seconds per level
    return 30 + ((level - 1) * 10);
} 