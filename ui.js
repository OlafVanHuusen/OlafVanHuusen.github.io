// UI management
import { gameState, gameElements, showMessage, updateStats } from './gameState.js';
import { isValidWord } from './dictionary.js';
import { replaceUsedLetters } from './grid.js';
import { clearSelection, clearTrails } from './input.js';
import { checkLevelUp } from './levels.js';

// Render the grid to the DOM
export function renderGrid() {
    gameElements.gameGrid.innerHTML = '';
    gameElements.gameGrid.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;

    for (let i = 0; i < gameState.gridSize; i++) {
        for (let j = 0; j < gameState.gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = gameState.grid[i][j];
            cell.dataset.row = i;
            cell.dataset.col = j;

            // Mouse down - don't commit to a mode yet, just track the initial cell
            cell.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent text selection

                // If we're already in tap mode, just do tap selection
                if (window.isInTapMode) {
                    window.selectCell(i, j, cell, true); // true for tap mode
                    return;
                }

                // Otherwise, prepare for potential drag or tap
                window.initialCell = cell;
                window.hasMoved = false;
                
                // Don't select the cell yet - we'll do that on mouseup or mousemove
                if (gameState.selectedCells.length === 0) {
                    // Only select the first cell immediately to provide feedback
                    window.selectCell(i, j, cell);
                }
            });

            // Mouse enter during mouse down - enter drag mode
            cell.addEventListener('mouseenter', (e) => {
                if (!window.initialCell || cell === window.initialCell) return;
                
                // If mouse has moved to a different cell while mouse button is down, 
                // it's a drag operation
                if (window.hasMoved === false) {
                    window.isInTapMode = false;
                    window.isDragging = true;
                    window.hasMoved = true;
                }

                if (window.isDragging) {
                    // We'll handle selection in the mousemove event
                    window.lastHoveredCell = cell;
                }
            });

            gameElements.gameGrid.appendChild(cell);
        }
    }
}

// Submit a word
export function submitWord() {
    const word = gameState.currentWord;

    // Check if word is valid
    if (word.length < 3) {
        showMessage('Words must be at least 3 letters');
        return;
    }

    // Check if word is in dictionary
    if (!isValidWord(word)) {
        // Flash red for incorrect words
        for (const cell of gameState.selectedCells) {
            cell.element.classList.add('incorrect');
        }

        showMessage('Not a valid word');

        // Wait for animation to complete before clearing selection
        setTimeout(() => {
            for (const cell of gameState.selectedCells) {
                cell.element.classList.remove('incorrect');
            }
            clearSelection(); // Clear selection after animation
            window.isInTapMode = false; // Exit tap mode after incorrect word
        }, 500);

        return;
    }

    // Always clear trails immediately when submitting a word, regardless of mode
    clearTrails();

    // Flash green for correct words
    for (const cell of gameState.selectedCells) {
        cell.element.classList.add('correct');
    }

    // Add word to found words
    gameState.foundWords.push(word);
    
    // Increment words found in current level
    gameState.wordsInCurrentLevel++;

    // Calculate time bonus (10 seconds + 5 for each letter beyond 3)
    const extraLetters = Math.max(0, word.length - 3);
    const timeBonus = 10 + (extraLetters * 5);
    
    // Add time bonus to timer
    gameState.timeLeft += timeBonus;
    
    // Add time bonus to score (score is now total seconds added)
    gameState.score += timeBonus;

    // Create time bonus animation
    const timeBonusElement = document.createElement('div');
    timeBonusElement.className = 'time-bonus';
    timeBonusElement.textContent = `+${timeBonus}s`;
    timeBonusElement.style.top = `${Math.random() * 10}px`; // Slight randomization to top position
    document.getElementById('timer').appendChild(timeBonusElement);

    // Make the timer flash to draw attention
    gameElements.timerDisplay.style.color = '#2ecc71';
    gameElements.timerDisplay.style.transform = 'scale(1.1)';
    setTimeout(() => {
        gameElements.timerDisplay.style.color = '#f39c12';
        gameElements.timerDisplay.style.transform = 'scale(1)';
    }, 300);

    // Remove the element after animation completes
    setTimeout(() => {
        if (timeBonusElement.parentNode) {
            timeBonusElement.parentNode.removeChild(timeBonusElement);
        }
    }, 1800);
    
    // Display found word (now without points)
    addFoundWord(word, timeBonus);

    // Add delay before replacing letters
    setTimeout(() => {
        // Remove the correct class
        for (const cell of gameState.selectedCells) {
            cell.element.classList.remove('correct');
        }

        // Replace used letters with new ones
        replaceUsedLetters();

        // Clear selection
        clearSelection();
        
        // Exit tap mode after successful word submission
        window.isInTapMode = false;

        // Update stats
        updateStats();
        
        // Check for level up
        checkLevelUp();
    }, 500);

    showMessage(`+${timeBonus} seconds!`);
}

// Add a found word to the display
export function addFoundWord(word, timeBonus) {
    const wordElement = document.createElement('div');
    wordElement.className = 'found-word';
    wordElement.textContent = `${word} +${timeBonus}s`;
    gameElements.wordsFoundContainer.appendChild(wordElement);
}

// Toggle pause state
export function togglePause() {
    if (gameState.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

// Pause the game
export function pauseGame() {
    if (!gameState.timer || gameState.isPaused) return;
    
    gameState.isPaused = true;
    gameElements.pauseIcon.style.display = 'none';
    gameElements.resumeIcon.style.display = 'block';
    
    // Disable game controls except pause button
    gameElements.submitButton.disabled = true;
    gameElements.clearButton.disabled = true;
    gameElements.shuffleButton.disabled = true;
    
    // Add a pause overlay to the game grid
    const gameContainer = document.getElementById('game-container');
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.position = 'absolute';
    pauseOverlay.style.top = '0';
    pauseOverlay.style.left = '0';
    pauseOverlay.style.width = '100%';
    pauseOverlay.style.height = '100%';
    pauseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    pauseOverlay.style.display = 'flex';
    pauseOverlay.style.justifyContent = 'center';
    pauseOverlay.style.alignItems = 'center';
    pauseOverlay.style.zIndex = '50'; // Lower than the pause button (100)
    pauseOverlay.style.borderRadius = '10px';
    
    const pauseText = document.createElement('h2');
    pauseText.textContent = 'GAME PAUSED';
    pauseText.style.color = '#e74c3c';
    pauseText.style.fontSize = '2rem';
    
    pauseOverlay.appendChild(pauseText);
    gameContainer.appendChild(pauseOverlay);
    
    showMessage('Game paused');
}

// Resume the game
export function resumeGame() {
    if (!gameState.isPaused) return;
    
    gameState.isPaused = false;
    gameElements.pauseIcon.style.display = 'block';
    gameElements.resumeIcon.style.display = 'none';
    
    // Re-enable game controls
    gameElements.submitButton.disabled = gameState.currentWord.length < 3;
    gameElements.clearButton.disabled = gameState.currentWord.length === 0;
    gameElements.shuffleButton.disabled = false;
    
    // Remove the pause overlay
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.parentNode.removeChild(pauseOverlay);
    }
    
    showMessage('Game resumed');
}

// Create game over screen
export function createGameOverScreen() {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'tutorial-overlay';
    gameOverScreen.style.display = 'flex';

    const gameOverContent = document.createElement('div');
    gameOverContent.id = 'tutorial';

    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = 'Game Over!';
    gameOverContent.appendChild(gameOverTitle);

    const finalLevel = document.createElement('p');
    finalLevel.textContent = `Level reached: ${gameState.level}`;
    finalLevel.style.fontSize = '24px';
    gameOverContent.appendChild(finalLevel);

    const finalScore = document.createElement('p');
    finalScore.textContent = `Total time added: ${gameState.score} seconds`;
    finalScore.style.fontSize = '24px';
    gameOverContent.appendChild(finalScore);

    // Format total time played
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    const totalTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timePlayedElement = document.createElement('p');
    timePlayedElement.textContent = `Total time played: ${totalTime}`;
    gameOverContent.appendChild(timePlayedElement);

    const wordsFound = document.createElement('p');
    wordsFound.textContent = `Words found: ${gameState.foundWords.length}`;
    gameOverContent.appendChild(wordsFound);

    const playAgainButton = document.createElement('button');
    playAgainButton.id = 'start-game';
    playAgainButton.textContent = 'Play Again';
    playAgainButton.addEventListener('click', () => {
        window.location.reload();
    });
    gameOverContent.appendChild(playAgainButton);

    gameOverScreen.appendChild(gameOverContent);
    document.body.appendChild(gameOverScreen);
} 