// Dictionary management
import { gameState, showMessage } from './gameState.js';

// Initialize dictionary with words
export function initializeDictionary() {
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
            showMessage('Error loading dictionary');
        });
}

// Check if a word is valid
export function isValidWord(word) {
    // Word must be at least 3 letters
    if (word.length < 3) {
        return false;
    }
    
    // Word must be in the dictionary
    return gameState.dictionary.has(word);
} 