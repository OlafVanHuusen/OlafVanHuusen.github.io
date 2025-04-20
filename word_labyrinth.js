// Add these new variables to track dragging state
let isDragging = false;
let lastHoveredCell = null;
let trailElements = []; // Array to track trail elements
let isInTapMode = false; // Track if we're in tap mode or drag mode
let initialCell = null; // Track initial cell for drag vs tap detection
let hasMoved = false; // Track if movement occurred during a mouse/touch down

// Game state
const gameState = {
    grid: [],
    selectedCells: [],
    currentWord: '',
    foundWords: [],
    score: 0, // This will now track total seconds added
    timeLeft: 60, // 1 minute in seconds
    elapsedTime: 0, // Track elapsed time
    timer: null,
    gridSize: 4,
    dictionary: new Set(),
    consonants: 'BCDFGHJKLMNPQRSTVWXYZ',
    vowels: 'AEIOU',
    commonLetters: 'ETAOINSHRDLU',
    isPaused: false, // Add paused state flag
};

// DOM elements
const gameGrid = document.getElementById('game-grid');
const wordDisplay = document.getElementById('word-display');
const messageDisplay = document.getElementById('message');
const submitButton = document.getElementById('submit-word');
const clearButton = document.getElementById('clear-word');
const shuffleButton = document.getElementById('shuffle');
const wordsCountDisplay = document.getElementById('words-count');
const scoreDisplay = document.getElementById('score');
const elapsedTimeDisplay = document.getElementById('level');
const wordsFoundContainer = document.getElementById('words-found');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const startGameButton = document.getElementById('start-game');
const timerDisplay = document.getElementById('timer');
const pauseToggleButton = document.getElementById('pause-toggle');
const pauseIcon = document.getElementById('pause-icon');
const resumeIcon = document.getElementById('resume-icon');

// Initialize dictionary with words
function initializeDictionary() {
    fetch('/english_dictionary.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Dictionary file not found');
            }
            return response.text();
        })
        .then(text => {
            // Split the file by newlines and add each word to the dictionary
            const words = text.split('\n')
                .map(word => word.trim().toUpperCase())
                .filter(word => word.length > 0);

            words.forEach(word => gameState.dictionary.add(word));
            console.log(`Dictionary loaded with ${words.length} words`);
        })
        .catch(error => {
            console.error('Error loading dictionary:', error);
        });
}

// Initialize the game
function initializeGame() {
    // Set up the grid
    gameState.grid = generateGrid(gameState.gridSize);
    renderGrid();

    // Initialize dictionary
    initializeDictionary();

    // Set up event listeners
    submitButton.addEventListener('click', submitWord);
    clearButton.addEventListener('click', clearSelection);
    shuffleButton.addEventListener('click', shuffleGrid);
    startGameButton.addEventListener('click', startGame);
    pauseToggleButton.addEventListener('click', togglePause);

    // Add touch support for mobile devices
    addTouchSupport();

    // Display initial stats
    updateStats();
}

// Generate a grid of letters
function generateGrid(size) {
    const grid = [];

    for (let i = 0; i < size; i++) {
        const row = [];
        for (let j = 0; j < size; j++) {
            row.push(generateLetter());
        }
        grid.push(row);
    }

    return grid;
}

// Generate a random letter with weighted distribution
function generateLetter() {
    const random = Math.random();

    if (random < 0.4) {
        // 40% chance of common letter
        return gameState.commonLetters.charAt(Math.floor(Math.random() * gameState.commonLetters.length));
    } else if (random < 0.7) {
        // 30% chance of consonant
        return gameState.consonants.charAt(Math.floor(Math.random() * gameState.consonants.length));
    } else {
        // 30% chance of vowel
        return gameState.vowels.charAt(Math.floor(Math.random() * gameState.vowels.length));
    }
}

// Render the grid to the DOM
function renderGrid() {
    gameGrid.innerHTML = '';
    gameGrid.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;

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
                if (isInTapMode) {
                    selectCell(i, j, cell, true); // true for tap mode
                    return;
                }

                // Otherwise, prepare for potential drag or tap
                initialCell = cell;
                hasMoved = false;
                
                // Don't select the cell yet - we'll do that on mouseup or mousemove
                if (gameState.selectedCells.length === 0) {
                    // Only select the first cell immediately to provide feedback
                    selectCell(i, j, cell);
                }
            });

            // Mouse enter during mouse down - enter drag mode
            cell.addEventListener('mouseenter', (e) => {
                if (!initialCell || cell === initialCell) return;
                
                // If mouse has moved to a different cell while mouse button is down, 
                // it's a drag operation
                if (hasMoved === false) {
                    isInTapMode = false;
                    isDragging = true;
                    hasMoved = true;
                }

                if (isDragging) {
                    // We'll handle selection in the mousemove event
                    lastHoveredCell = cell;
                }
            });

            gameGrid.appendChild(cell);
        }
    }
}

// Add a global mousemove event to continuously check position
document.addEventListener('mousemove', (e) => {
    if (isDragging && lastHoveredCell) {
        // Get the cell under the current mouse position
        const cellRect = lastHoveredCell.getBoundingClientRect();
        const cellWidth = cellRect.width;
        const cellHeight = cellRect.height;
        
        // Calculate position within the cell
        const relativeX = e.clientX - cellRect.left;
        const relativeY = e.clientY - cellRect.top;
        
        // Calculate distance from center as percentage of cell size
        const centerX = cellWidth / 2;
        const centerY = cellHeight / 2;
        const distanceFromCenterX = Math.abs(relativeX - centerX) / cellWidth;
        const distanceFromCenterY = Math.abs(relativeY - centerY) / cellHeight;
        
        // If we're close enough to the center, select the cell
        const maxDistanceFromCenter = 0.35; // 35% of distance to edge
        if (distanceFromCenterX <= maxDistanceFromCenter && 
            distanceFromCenterY <= maxDistanceFromCenter) {
            // Check if this cell is already selected
            const row = parseInt(lastHoveredCell.dataset.row);
            const col = parseInt(lastHoveredCell.dataset.col);
            const index = gameState.selectedCells.findIndex(cell => cell.row === row && cell.col === col);
            
            // Check if this is the second-to-last cell OR the first cell when we have only 2 cells
            if ((index === gameState.selectedCells.length - 2 && gameState.selectedCells.length >= 2) ||
                (index === 0 && gameState.selectedCells.length === 2)) {
                // Unselect the last cell (backtracking)
                const lastCell = gameState.selectedCells.pop();
                lastCell.element.classList.remove('selected');
                
                // Remove the last trail element
                if (trailElements.length > 0) {
                    const lastTrail = trailElements.pop();
                    lastTrail.remove();
                }
                
                // Update the current word
                updateCurrentWord();
                
                // If we're back to just one cell, allow unselecting it on mouseup
                if (gameState.selectedCells.length === 1) {
                    initialCell = gameState.selectedCells[0].element;
                }
            }
            // Only select if not already selected and it's adjacent
            else if (index === -1 && (gameState.selectedCells.length === 0 || isAdjacentCell(row, col))) {
                selectCell(row, col, lastHoveredCell);
            }
        }
    }
    
    // Also check if we're in the early phase of detecting a drag
    if (initialCell && !hasMoved) {
        // Check if we've moved enough distance from the initial cell
        const cellRect = initialCell.getBoundingClientRect();
        const centerX = cellRect.left + cellRect.width / 2;
        const centerY = cellRect.top + cellRect.height / 2;
        
        const distanceX = Math.abs(e.clientX - centerX);
        const distanceY = Math.abs(e.clientY - centerY);
        
        // If moved more than 1/4 of the cell size, consider it a drag
        if (distanceX > cellRect.width / 4 || distanceY > cellRect.height / 4) {
            isDragging = true;
            isInTapMode = false;
            hasMoved = true;
        }
    }
});

// Update the document-level mouse events to handle drag or tap
document.addEventListener('mouseup', (e) => {
    if (initialCell && !hasMoved) {
        // Mouse up on the same cell without movement = tap
        const row = parseInt(initialCell.dataset.row);
        const col = parseInt(initialCell.dataset.col);
        
        // If we're starting a new word, enter tap mode
        if (gameState.selectedCells.length <= 1) {
            isInTapMode = true;
            isDragging = false;
        } else if (isInTapMode) {
            // We're already in tap mode, nothing special to do
        }
    } else if (gameState.selectedCells.length === 1 && isDragging) {
        // If we're down to just one cell in drag mode and lifting the finger,
        // unselect the last cell too
        const lastCell = gameState.selectedCells.pop();
        lastCell.element.classList.remove('selected');
        updateCurrentWord();
        
        // Reset input mode for next interaction
        isInTapMode = false;
        isDragging = false;
    }
    
    // Clean up after drag operation
    if (isDragging) {
        isDragging = false;
        
        // Only clear trails if we're not in tap mode
        if (!isInTapMode) {
            // Add fade-out animation to trail elements
            trailElements.forEach(trail => {
                trail.classList.add('trail-fade-out');
            });
            
            // Clear trails after animation completes
            setTimeout(() => {
                clearTrails();
            }, 600); // Match the fadeOut animation duration
        }

        // Auto-submit if the word is valid and we haven't unselected everything
        if (gameState.currentWord.length >= 3) {
            submitWord();
        }
    }
    
    // Reset tracking variables
    initialCell = null;
    lastHoveredCell = null;
    hasMoved = false;
});

// Add touch support for mobile devices
function addTouchSupport() {
    let lastTouchedCell = null;
    let touchInitialCell = null;
    let touchHasMoved = false;

    // Touch start - like mousedown, don't commit to a mode yet
    gameGrid.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);

        if (cell && cell.classList.contains('cell')) {
            e.preventDefault(); // Prevent scrolling
            
            // If we're already in tap mode, just do tap selection
            if (isInTapMode) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                selectCell(row, col, cell, true); // true for tap mode
                return;
            }
            
            // Track initial touch position
            touchInitialCell = cell;
            touchHasMoved = false;
            
            // Only select the first cell immediately to provide feedback
            if (gameState.selectedCells.length === 0) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                selectCell(row, col, cell);
            }
        }
    }, { passive: false });

    // Touch move - detect drag operation and continuously check position
    gameGrid.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const cell = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (!touchInitialCell) return;
        
        // If we've moved to a different cell, it's a drag operation
        if (cell && cell.classList.contains('cell')) {
            if (cell !== touchInitialCell && touchHasMoved === false) {
                isDragging = true;
                isInTapMode = false;
                touchHasMoved = true;
            }
            
            if (isDragging) {
                // Continuously check position relative to cell center
                const cellRect = cell.getBoundingClientRect();
                const cellWidth = cellRect.width;
                const cellHeight = cellRect.height;
                
                // Calculate position within the cell
                const relativeX = touch.clientX - cellRect.left;
                const relativeY = touch.clientY - cellRect.top;
                
                // Calculate distance from center as percentage of cell size
                const centerX = cellWidth / 2;
                const centerY = cellHeight / 2;
                const distanceFromCenterX = Math.abs(relativeX - centerX) / cellWidth;
                const distanceFromCenterY = Math.abs(relativeY - centerY) / cellHeight;
                
                // If we're close enough to the center, select the cell
                const maxDistanceFromCenter = 0.35; // 35% of distance to edge
                if (distanceFromCenterX <= maxDistanceFromCenter && 
                    distanceFromCenterY <= maxDistanceFromCenter) {
                    
                    // Make sure this cell isn't already selected
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    const index = gameState.selectedCells.findIndex(c => c.row === row && c.col === col);
                    
                    // Check if this is the second-to-last cell OR the first cell when we have only 2 cells
                    if ((index === gameState.selectedCells.length - 2 && gameState.selectedCells.length >= 2) ||
                        (index === 0 && gameState.selectedCells.length === 2)) {
                        // Unselect the last cell (backtracking)
                        const lastCell = gameState.selectedCells.pop();
                        lastCell.element.classList.remove('selected');
                        
                        // Remove the last trail element
                        if (trailElements.length > 0) {
                            const lastTrail = trailElements.pop();
                            lastTrail.remove();
                        }
                        
                        // Update the current word
                        updateCurrentWord();
                        // Update lastTouchedCell to the new last cell
                        lastTouchedCell = cell;
                        
                        // If we're back to just one cell, allow unselecting it on touch end
                        if (gameState.selectedCells.length === 1) {
                            touchInitialCell = gameState.selectedCells[0].element;
                        }
                    }
                    // Only select if not already selected and it's adjacent
                    else if (index === -1 && cell !== lastTouchedCell && 
                       (gameState.selectedCells.length === 0 || isAdjacentCell(row, col))) {
                        selectCell(row, col, cell);
                        lastTouchedCell = cell;
                    }
                }
            }
        }
        e.preventDefault(); // Prevent scrolling while selecting
    }, { passive: false });

    // Touch end - handle tap or end of drag
    document.addEventListener('touchend', (e) => {
        if (touchInitialCell && !touchHasMoved) {
            // Touch ended on the same cell without movement = tap
            // If we're starting a new word, enter tap mode
            if (gameState.selectedCells.length <= 1) {
                isInTapMode = true;
                isDragging = false;
            }
        } else if (gameState.selectedCells.length === 1 && isDragging) {
            // If we're down to just one cell in drag mode and lifting the finger,
            // unselect the last cell too
            const lastCell = gameState.selectedCells.pop();
            lastCell.element.classList.remove('selected');
            updateCurrentWord();
            
            // Reset input mode for next interaction
            isInTapMode = false;
            isDragging = false;
        }
        
        // Clean up after drag operation
        if (isDragging) {
            isDragging = false;
            
            // Only clear trails if we're not in tap mode
            if (!isInTapMode) {
                // Add fade-out animation to trail elements
                trailElements.forEach(trail => {
                    trail.classList.add('trail-fade-out');
                });
                
                // Clear trails after animation completes
                setTimeout(() => {
                    clearTrails();
                }, 600); // Match the fadeOut animation duration
            }

            // Auto-submit if the word is valid and we haven't unselected everything
            if (gameState.currentWord.length >= 3) {
                submitWord();
            }
        }
        
        // Reset tracking variables
        touchInitialCell = null;
        lastTouchedCell = null;
        touchHasMoved = false;
    });
    
    // Touch cancel - abort selection
    document.addEventListener('touchcancel', () => {
        isDragging = false;
        touchInitialCell = null;
        lastTouchedCell = null;
        touchHasMoved = false;
        
        // Only clear trails if not in tap mode
        if (!isInTapMode) {
            clearTrails();
        }
    });
}

// Select a cell when clicked
function selectCell(row, col, cellElement, isTapMode = false) {
    // Get the index in the selected cells array
    const index = gameState.selectedCells.findIndex(cell => cell.row === row && cell.col === col);

    // If cell is already selected, handle deselection
    if (index !== -1) {
        // For tap mode, we only allow deselecting the last cell
        if (index === gameState.selectedCells.length - 1) {
            gameState.selectedCells.pop();
            cellElement.classList.remove('selected');
            // Remove the last trail element if one exists
            if (trailElements.length > 0) {
                const lastTrail = trailElements.pop();
                lastTrail.remove();
            }
            updateCurrentWord();
            
            // If this was the last cell, reset input mode to allow both tap and drag
            if (gameState.selectedCells.length === 0) {
                isInTapMode = false;
                isDragging = false;
            }
        }
        return;
    }

    // Check if cell is adjacent to the last selected cell
    if (gameState.selectedCells.length > 0) {
        const lastCell = gameState.selectedCells[gameState.selectedCells.length - 1];

        // Calculate distance between cells
        const rowDiff = Math.abs(row - lastCell.row);
        const colDiff = Math.abs(col - lastCell.col);

        // Cell must be adjacent (horizontally, vertically, or diagonally)
        if (rowDiff > 1 || colDiff > 1) {
            showMessage('Select adjacent letters only');
            return;
        }
        
        // Always create a trail between the last selected cell and this one
        // The trail persists in tap mode but is cleared on mouseup/touchend in drag mode
        addTrailBetweenCells(lastCell.element, cellElement);
    }

    // Add cell to selected cells
    gameState.selectedCells.push({ row, col, element: cellElement });
    cellElement.classList.add('selected');

    // Update current word
    updateCurrentWord();
}

// Create a visual trail between two cells
function addTrailBetweenCells(fromCell, toCell) {
    // Get positions of both cells
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const gridRect = gameGrid.getBoundingClientRect();
    
    // Calculate the centers of each cell
    const fromCenterX = fromRect.left + fromRect.width / 2 - gridRect.left;
    const fromCenterY = fromRect.top + fromRect.height / 2 - gridRect.top;
    const toCenterX = toRect.left + toRect.width / 2 - gridRect.left;
    const toCenterY = toRect.top + toRect.height / 2 - gridRect.top;
    
    // Calculate the length and angle of the line
    const length = Math.sqrt(Math.pow(toCenterX - fromCenterX, 2) + Math.pow(toCenterY - fromCenterY, 2));
    const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX) * 180 / Math.PI;
    
    // Create trail element
    const trail = document.createElement('div');
    trail.className = 'selection-trail';
    trail.style.width = `${length}px`;
    trail.style.height = `${fromRect.height / 4}px`; // 1/4 of the cell height
    trail.style.left = `${fromCenterX}px`;
    trail.style.top = `${fromCenterY - (fromRect.height / 8)}px`; // Center vertically
    trail.style.transformOrigin = '0 50%';
    trail.style.transform = `rotate(${angle}deg)`;
    
    // Add to the DOM and track it
    gameGrid.appendChild(trail);
    trailElements.push(trail);
}

// Update the current word based on selected cells
function updateCurrentWord() {
    gameState.currentWord = gameState.selectedCells.map(cell => {
        return gameState.grid[cell.row][cell.col];
    }).join('');

    wordDisplay.textContent = gameState.currentWord;

    // Enable/disable buttons based on word length
    submitButton.disabled = gameState.currentWord.length < 3;
    clearButton.disabled = gameState.currentWord.length === 0;
}

// Submit a word
function submitWord() {
    const word = gameState.currentWord;

    // Check if word is valid
    if (word.length < 3) {
        showMessage('Words must be at least 3 letters');
        return;
    }

    // Check if word is in dictionary
    if (!gameState.dictionary.has(word)) {
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
            isInTapMode = false; // Exit tap mode after incorrect word
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
    timerDisplay.style.color = '#2ecc71';
    timerDisplay.style.transform = 'scale(1.1)';
    setTimeout(() => {
        timerDisplay.style.color = '#f39c12';
        timerDisplay.style.transform = 'scale(1)';
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
        isInTapMode = false;

        // Update stats
        updateStats();
    }, 500);

    showMessage(`+${timeBonus} seconds!`);
}

// Replace used letters with new ones
function replaceUsedLetters() {
    // Mark cells as used and replace letters
    for (const cell of gameState.selectedCells) {
        // Add fly-away animation
        cell.element.classList.add('fly-away');

        // Replace letter in grid after animation
        setTimeout(() => {
            // Replace letter in grid
            gameState.grid[cell.row][cell.col] = generateLetter();

            // Remove animation class and add the used class
            cell.element.classList.remove('fly-away');
            cell.element.classList.add('used');

            // Update letter in cell
            setTimeout(() => {
                cell.element.textContent = gameState.grid[cell.row][cell.col];
                cell.element.classList.remove('used');
            }, 100);
        }, 400);
    }
}

// Add a found word to the display
function addFoundWord(word, timeBonus) {
    const wordElement = document.createElement('div');
    wordElement.className = 'found-word';
    wordElement.textContent = `${word} +${timeBonus}s`;
    wordsFoundContainer.appendChild(wordElement);
}

// Clear the current selection
function clearSelection() {
    // Remove selected class from all cells
    for (const cell of gameState.selectedCells) {
        cell.element.classList.remove('selected');
    }

    // Clear selected cells array
    gameState.selectedCells = [];

    // Clear trails
    clearTrails();

    // Clear current word
    gameState.currentWord = '';
    wordDisplay.textContent = '';

    // Disable buttons
    submitButton.disabled = true;
    clearButton.disabled = true;
    
    // Exit tap mode
    isInTapMode = false;
}

// Clear all trail elements
function clearTrails() {
    trailElements.forEach(trail => {
        if (trail.parentNode) {
            trail.parentNode.removeChild(trail);
        }
    });
    trailElements = [];
}

// Shuffle the grid
function shuffleGrid() {
    // Add shuffling animation to all cells
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.add('shuffling');
    });

    // After animation delay, generate new grid
    setTimeout(() => {
        // Generate a new grid
        gameState.grid = generateGrid(gameState.gridSize);

        // Render the new grid
        renderGrid();

        // Clear selection
        clearSelection();
    }, 500);
}

// Update game stats
function updateStats() {
    wordsCountDisplay.textContent = gameState.foundWords.length;
    scoreDisplay.textContent = gameState.score; // Now displays total seconds added

    // Format elapsed time as MM:SS
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    elapsedTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Show a message
function showMessage(text) {
    messageDisplay.textContent = text;

    // Clear message after 2 seconds
    setTimeout(() => {
        messageDisplay.textContent = '';
    }, 2000);
}

// Toggle pause state
function togglePause() {
    if (gameState.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

// Pause the game
function pauseGame() {
    if (!gameState.timer || gameState.isPaused) return;
    
    gameState.isPaused = true;
    pauseIcon.style.display = 'none';
    resumeIcon.style.display = 'block';
    
    // Disable game controls except pause button
    submitButton.disabled = true;
    clearButton.disabled = true;
    shuffleButton.disabled = true;
    
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
function resumeGame() {
    if (!gameState.isPaused) return;
    
    gameState.isPaused = false;
    pauseIcon.style.display = 'block';
    resumeIcon.style.display = 'none';
    
    // Re-enable game controls
    submitButton.disabled = gameState.currentWord.length < 3;
    clearButton.disabled = gameState.currentWord.length === 0;
    shuffleButton.disabled = false;
    
    // Remove the pause overlay
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.parentNode.removeChild(pauseOverlay);
    }
    
    showMessage('Game resumed');
}

// Start the game
function startGame() {
    tutorialOverlay.style.display = 'none';

    // Start the timer
    gameState.timer = setInterval(updateTimer, 1000);
    
    // Initialize pause button state
    pauseIcon.style.display = 'block';
    resumeIcon.style.display = 'none';
    gameState.isPaused = false;
}

// Update the timer
function updateTimer() {
    // Don't update timer if game is paused
    if (gameState.isPaused) return;
    
    gameState.timeLeft--;
    gameState.elapsedTime++;

    // Update timer display
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update elapsed time in stats
    updateStats();

    // Check if time is up
    if (gameState.timeLeft <= 0) {
        endGame();
    }
}

// Helper function to check if a cell is adjacent to the last selected cell
function isAdjacentCell(row, col) {
    if (gameState.selectedCells.length === 0) return true;

    const lastCell = gameState.selectedCells[gameState.selectedCells.length - 1];
    const rowDiff = Math.abs(row - lastCell.row);
    const colDiff = Math.abs(col - lastCell.col);

    return rowDiff <= 1 && colDiff <= 1;
}

// End the game
function endGame() {
    clearInterval(gameState.timer);

    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'tutorial-overlay';
    gameOverScreen.style.display = 'flex';

    const gameOverContent = document.createElement('div');
    gameOverContent.id = 'tutorial';

    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = 'Game Over!';
    gameOverContent.appendChild(gameOverTitle);

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

// Initialize the game when the page loads
window.addEventListener('load', initializeGame);