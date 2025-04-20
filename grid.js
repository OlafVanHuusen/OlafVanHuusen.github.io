// Grid management
import { gameState, gameElements, updateStats } from './gameState.js';
import { renderGrid } from './ui.js';
import { clearSelection } from './input.js';

// Generate a grid of letters
export function generateGrid(size) {
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
export function generateLetter() {
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

// Shuffle the grid
export function shuffleGrid() {
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

// Replace used letters with new ones
export function replaceUsedLetters() {
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