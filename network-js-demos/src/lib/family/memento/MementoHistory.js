/**
 * MementoHistory - Manages undo/redo history using graph state snapshots
 *
 * Implements the Memento Pattern for undo/redo functionality
 * Stores full graph state snapshots for simple restore operations
 *
 * @class
 */
export class MementoHistory {
  /**
   * Create a new MementoHistory instance
   * @param {Object} options - Configuration options
   * @param {number} [options.maxHistorySize=10] - Maximum number of snapshots to keep
   */
  constructor(options = {}) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = options.maxHistorySize || 10;
  }

  /**
   * Save current state before making a change
   * Call this BEFORE performing an operation
   *
   * @param {GraphMemento} memento - Memento capturing current state
   */
  saveState(memento) {
    // Add to undo stack
    this.undoStack.push(memento);

    // Limit history size (remove oldest if exceeded)
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift(); // Remove oldest
    }

    // Clear redo stack - any new action invalidates redo history
    this.redoStack = [];
  }

  /**
   * Undo to previous state
   * Returns the memento to restore, or null if nothing to undo
   *
   * @returns {GraphMemento|null} Memento to restore, or null
   */
  undo() {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Pop from undo stack
    const memento = this.undoStack.pop();

    // Push to redo stack for potential redo
    this.redoStack.push(memento);

    // Return the memento to restore
    // Note: We return the one we just popped, which represents the state to go back to
    return memento;
  }

  /**
   * Redo to next state
   * Returns the memento to restore, or null if nothing to redo
   *
   * @returns {GraphMemento|null} Memento to restore, or null
   */
  redo() {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Pop from redo stack
    const memento = this.redoStack.pop();

    // Push back to undo stack
    this.undoStack.push(memento);

    // Return the memento to restore
    return memento;
  }

  /**
   * Check if undo is available
   * @returns {boolean} True if there are states to undo
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean} True if there are states to redo
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get the number of states that can be undone
   * @returns {number} Number of states in undo stack
   */
  getUndoCount() {
    return this.undoStack.length;
  }

  /**
   * Get the number of states that can be redone
   * @returns {number} Number of states in redo stack
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * Get description of the next state that would be undone
   * @returns {string|null} Description or null if undo stack is empty
   */
  getUndoDescription() {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].getDescription();
  }

  /**
   * Get description of the next state that would be redone
   * @returns {string|null} Description or null if redo stack is empty
   */
  getRedoDescription() {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].getDescription();
  }

  /**
   * Clear all history (both undo and redo stacks)
   * Useful when resetting the family tree
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get a summary of the history (for debugging)
   * @returns {Object} {undoCount, redoCount, canUndo, canRedo, nextUndo, nextRedo}
   */
  getHistorySummary() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      nextUndo: this.getUndoDescription(),
      nextRedo: this.getRedoDescription()
    };
  }
}

export default MementoHistory;
