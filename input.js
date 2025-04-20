// Input handling
import { gameState, gameElements, showMessage, updateStats } from './gameState.js';
import { submitWord, addFoundWord } from './ui.js';
import { replaceUsedLetters } from './grid.js';
import { isValidWord } from './dictionary.js';

// Variables to track dragging state
let isDragging = false;
let lastHoveredCell = null;
let trailElements = []; // Array to track trail elements
let isInTapMode = false; // Track if we're in tap mode or drag mode
let initialCell = null; // Track initial cell for drag vs tap detection
let hasMoved = false; // Track if movement occurred during a mouse/touch down

// Add touch support for mobile devices
export function addTouchSupport() {
    let lastTouchedCell = null;
    let touchInitialCell = null;
    let touchHasMoved = false;

    // Touch start - like mousedown, don't commit to a mode yet
    gameElements.gameGrid.addEventListener('touchstart', (e) => {
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
    gameElements.gameGrid.addEventListener('touchmove', (e) => {
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

// Add mouse event handlers
export function setupMouseHandlers() {
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
}

// Select a cell when clicked
export function selectCell(row, col, cellElement, isTapMode = false) {
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
export function addTrailBetweenCells(fromCell, toCell) {
    // Get positions of both cells
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const gridRect = gameElements.gameGrid.getBoundingClientRect();
    
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
    gameElements.gameGrid.appendChild(trail);
    trailElements.push(trail);
}

// Update the current word based on selected cells
export function updateCurrentWord() {
    gameState.currentWord = gameState.selectedCells.map(cell => {
        return gameState.grid[cell.row][cell.col];
    }).join('');

    gameElements.wordDisplay.textContent = gameState.currentWord;

    // Enable/disable buttons based on word length
    gameElements.submitButton.disabled = gameState.currentWord.length < 3;
    gameElements.clearButton.disabled = gameState.currentWord.length === 0;
}

// Clear the current selection
export function clearSelection() {
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
    gameElements.wordDisplay.textContent = '';

    // Disable buttons
    gameElements.submitButton.disabled = true;
    gameElements.clearButton.disabled = true;
    
    // Exit tap mode
    isInTapMode = false;
}

// Clear all trail elements
export function clearTrails() {
    trailElements.forEach(trail => {
        if (trail.parentNode) {
            trail.parentNode.removeChild(trail);
        }
    });
    trailElements = [];
}

// Helper function to check if a cell is adjacent to the last selected cell
export function isAdjacentCell(row, col) {
    if (gameState.selectedCells.length === 0) return true;

    const lastCell = gameState.selectedCells[gameState.selectedCells.length - 1];
    const rowDiff = Math.abs(row - lastCell.row);
    const colDiff = Math.abs(col - lastCell.col);

    return rowDiff <= 1 && colDiff <= 1;
} 