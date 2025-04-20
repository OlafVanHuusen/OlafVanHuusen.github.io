// Level system
import { gameState, gameElements, showMessage, updateStats } from './gameState.js';
import { getLevelTimeBonus } from './timer.js';

// Level configurations
const levelConfig = {
    // Each level requires more words to advance
    wordsPerLevel: level => Math.min(5 + level, 15),
    
    // Grid size increases on certain levels (max 6x6)
    gridSizeForLevel: level => {
        if (level < 3) return 4;
        if (level < 6) return 5;
        return 6;
    },
    
    // Minimum word length increases with level
    minWordLengthForLevel: level => {
        if (level < 4) return 3;
        if (level < 8) return 4;
        return 5;
    }
};

// Check if the player can level up
export function checkLevelUp() {
    // Get words needed for this level
    const wordsNeeded = levelConfig.wordsPerLevel(gameState.level);
    
    // If player found enough words
    if (gameState.wordsInCurrentLevel >= wordsNeeded) {
        levelUp();
    }
}

// Level up the player
export function levelUp() {
    // Increase level
    gameState.level++;
    
    // Reset words in current level
    gameState.wordsInCurrentLevel = 0;
    
    // Update words needed for next level
    gameState.wordsToAdvance = levelConfig.wordsPerLevel(gameState.level);
    
    // Add time bonus for leveling up
    const timeBonus = getLevelTimeBonus(gameState.level);
    gameState.timeLeft += timeBonus;
    
    // Show level up message
    showMessage(`Level Up! +${timeBonus} seconds!`);
    
    // Create level up animation
    createLevelUpAnimation();
    
    // Update grid size if needed
    const newGridSize = levelConfig.gridSizeForLevel(gameState.level);
    if (newGridSize !== gameState.gridSize) {
        gameState.gridSize = newGridSize;
        // Grid will be recreated on next shuffle
        // No need to update it immediately
    }
    
    // Update stats to reflect new level
    updateStats();
}

// Create a level up animation
function createLevelUpAnimation() {
    // Create overlay for level up animation
    const levelUpOverlay = document.createElement('div');
    levelUpOverlay.className = 'level-up-overlay';
    levelUpOverlay.style.position = 'fixed';
    levelUpOverlay.style.top = '0';
    levelUpOverlay.style.left = '0';
    levelUpOverlay.style.width = '100%';
    levelUpOverlay.style.height = '100%';
    levelUpOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    levelUpOverlay.style.display = 'flex';
    levelUpOverlay.style.justifyContent = 'center';
    levelUpOverlay.style.alignItems = 'center';
    levelUpOverlay.style.zIndex = '100';
    levelUpOverlay.style.pointerEvents = 'none';
    levelUpOverlay.style.opacity = '0';
    levelUpOverlay.style.transition = 'opacity 0.5s ease-in-out';
    
    // Create level up text
    const levelUpText = document.createElement('div');
    levelUpText.className = 'level-up-text';
    levelUpText.textContent = `LEVEL ${gameState.level}`;
    levelUpText.style.color = '#2ecc71';
    levelUpText.style.fontSize = '5rem';
    levelUpText.style.fontWeight = 'bold';
    levelUpText.style.textShadow = '0 0 10px rgba(46, 204, 113, 0.8)';
    levelUpText.style.transform = 'scale(0)';
    levelUpText.style.transition = 'transform 0.5s ease-out';
    
    // Add level up text to overlay
    levelUpOverlay.appendChild(levelUpText);
    document.body.appendChild(levelUpOverlay);
    
    // Animate level up
    setTimeout(() => {
        levelUpOverlay.style.opacity = '1';
        levelUpText.style.transform = 'scale(1)';
    }, 100);
    
    // Remove level up animation after delay
    setTimeout(() => {
        levelUpOverlay.style.opacity = '0';
        levelUpText.style.transform = 'scale(2)';
        
        // Remove elements after fade out
        setTimeout(() => {
            if (levelUpOverlay.parentNode) {
                levelUpOverlay.parentNode.removeChild(levelUpOverlay);
            }
        }, 500);
    }, 2000);
}

// Initialize level display
export function initLevelDisplay() {
    // Create level display if it doesn't exist
    if (!document.getElementById('level-display')) {
        const statsContainer = document.querySelector('.stats');
        
        // Create level container
        const levelContainer = document.createElement('div');
        levelContainer.className = 'level-container';
        
        // Create level label
        const levelLabel = document.createElement('span');
        levelLabel.textContent = 'Level:';
        levelContainer.appendChild(levelLabel);
        
        // Create level display
        const levelDisplay = document.createElement('span');
        levelDisplay.id = 'level-display';
        levelDisplay.textContent = `Level ${gameState.level}`;
        levelContainer.appendChild(levelDisplay);
        
        // Create progress container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'level-progress-container';
        progressContainer.style.width = '100%';
        progressContainer.style.height = '10px';
        progressContainer.style.backgroundColor = '#34495e';
        progressContainer.style.borderRadius = '5px';
        progressContainer.style.overflow = 'hidden';
        progressContainer.style.marginTop = '5px';
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'level-progress';
        progressBar.className = 'level-progress-bar';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = '#3498db';
        progressBar.style.transition = 'width 0.3s ease-out';
        
        progressContainer.appendChild(progressBar);
        levelContainer.appendChild(progressContainer);
        
        // Add level container to stats
        statsContainer.appendChild(levelContainer);
    }
} 