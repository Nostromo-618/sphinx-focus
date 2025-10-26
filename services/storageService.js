/**
 * Storage Service
 * Handles all localStorage operations with encryption, validation, and sanitization
 * Provides secure data management for Sphinx Focus
 */

// Storage keys
const STATE_STORAGE_KEY = 'sphinxFocusState';
const TIMER_STATE_KEY = 'sphinxFocusTimerState';
const THEME_PREFERENCE_KEY = 'sphinxFocusThemePreference';
const DISCLAIMER_ACCEPTED_KEY = 'sphinxFocusDisclaimerAccepted';
const MIGRATION_FLAG_KEY = 'sphinxFocusMigrated';

// Limits and constraints
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
const MAX_TASKS = 1000; // Maximum number of tasks
const MAX_SESSIONS = 10000; // Maximum number of sessions
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Sanitize string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate timestamp format and reasonableness
 * @param {string} timestamp - ISO timestamp to validate
 * @returns {boolean} True if valid
 */
function isValidTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    const now = Date.now();
    const minDate = new Date('2020-01-01').getTime();
    
    return (
      date instanceof Date &&
      !isNaN(date.getTime()) &&
      date.getTime() <= now && // No future dates
      date.getTime() > minDate // Reasonable past limit
    );
  } catch {
    return false;
  }
}

/**
 * Check if storage quota is within limits
 * @returns {boolean} True if within limits
 */
function checkStorageSize() {
  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        totalSize += (key.length + value.length) * 2; // UTF-16 encoding
      }
    }
    return totalSize < MAX_STORAGE_SIZE;
  } catch (error) {
    console.error('Error checking storage size:', error);
    return false;
  }
}

/**
 * Validate state object structure
 * @param {Object} state - State object to validate
 * @returns {boolean} True if valid
 */
function validateState(state) {
  if (!state || typeof state !== 'object') return false;
  
  // Check required top-level properties
  if (!state.timer || !state.settings || !Array.isArray(state.tasks) || 
      !Array.isArray(state.sessions) || !state.statistics) {
    return false;
  }
  
  // Validate timer object
  if (typeof state.timer.minutes !== 'number' || 
      typeof state.timer.seconds !== 'number' ||
      typeof state.timer.mode !== 'string') {
    return false;
  }
  
  // Validate settings object
  if (typeof state.settings.workDuration !== 'number' ||
      typeof state.settings.breakDuration !== 'number' ||
      typeof state.settings.sound !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Sanitize and validate a task object
 * @param {Object} task - Task to validate
 * @returns {Object|null} Sanitized task or null if invalid
 */
function sanitizeTask(task) {
  if (!task || typeof task !== 'object') return null;
  if (typeof task.text !== 'string' || !task.text.trim()) return null;
  if (typeof task.id !== 'number') return null;
  
  return {
    id: task.id,
    text: sanitizeString(task.text).substring(0, 500), // Limit length
    completed: Boolean(task.completed),
    createdAt: isValidTimestamp(task.createdAt) ? task.createdAt : new Date().toISOString()
  };
}

/**
 * Sanitize and validate a session object
 * @param {Object} session - Session to validate
 * @returns {Object|null} Sanitized session or null if invalid
 */
function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  if (!isValidTimestamp(session.date)) return null;
  if (typeof session.duration !== 'number' || session.duration < 1 || session.duration > 120) return null;
  
  return {
    id: session.id || Date.now(),
    date: session.date,
    duration: Math.floor(session.duration),
    type: session.type === 'break' ? 'break' : 'work',
    completed: Boolean(session.completed)
  };
}

/**
 * Storage Service - Main API
 */
const storageService = {
  /**
   * Check if migration from unencrypted data is needed
   * @returns {Promise<boolean>}
   */
  async needsMigration() {
    try {
      const migrated = localStorage.getItem(MIGRATION_FLAG_KEY);
      if (migrated === 'true') return false;
      
      // Check if old unencrypted data exists
      const oldData = localStorage.getItem(STATE_STORAGE_KEY);
      if (!oldData) return false;
      
      // Try to parse as plain JSON (unencrypted)
      try {
        JSON.parse(oldData);
        return true; // It's plain JSON, needs migration
      } catch {
        return false; // Already encrypted
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  },

  /**
   * Migrate unencrypted data to encrypted format
   * @returns {Promise<boolean>}
   */
  async migrateData() {
    try {
      console.log('Starting data migration to encrypted format...');
      
      const oldData = localStorage.getItem(STATE_STORAGE_KEY);
      if (!oldData) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return true;
      }
      
      // Parse old unencrypted data
      const state = JSON.parse(oldData);
      
      // Validate and sanitize
      if (!validateState(state)) {
        console.warn('Invalid state structure during migration, skipping');
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return false;
      }
      
      // Save using encrypted method
      await this.saveState(state);
      
      // Mark as migrated
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Error during migration:', error);
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true'); // Prevent retry loops
      return false;
    }
  },

  /**
   * Load state from encrypted storage
   * @returns {Promise<Object|null>}
   */
  async loadState() {
    try {
      // Check if migration is needed
      if (await this.needsMigration()) {
        await this.migrateData();
      }
      
      const encrypted = localStorage.getItem(STATE_STORAGE_KEY);
      if (!encrypted) return null;
      
      // Try to decrypt
      try {
        const decrypted = await encryptionService.decrypt(encrypted);
        const state = JSON.parse(decrypted);
        
        // Validate structure
        if (!validateState(state)) {
          console.error('Invalid state structure');
          return null;
        }
        
        // Sanitize arrays
        state.tasks = state.tasks
          .map(task => sanitizeTask(task))
          .filter(task => task !== null)
          .slice(-MAX_TASKS); // Limit number of tasks
        
        state.sessions = state.sessions
          .map(session => sanitizeSession(session))
          .filter(session => session !== null)
          .slice(-MAX_SESSIONS); // Limit number of sessions
        
        return state;
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        
        // Try to parse as plain JSON (fallback for migration edge case)
        try {
          const state = JSON.parse(encrypted);
          if (validateState(state)) {
            // Re-save encrypted
            await this.saveState(state);
            return state;
          }
        } catch {
          // Both encrypted and plain parsing failed
          return null;
        }
      }
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  },

  /**
   * Save state to encrypted storage
   * @param {Object} state - State object to save
   * @returns {Promise<boolean>}
   */
  async saveState(state) {
    try {
      // Validate state structure
      if (!validateState(state)) {
        throw new Error('Invalid state structure');
      }
      
      // Check storage size
      if (!checkStorageSize()) {
        console.warn('Storage quota nearly exceeded');
        // Try to free up space by limiting history
        if (state.sessions.length > 100) {
          state.sessions = state.sessions.slice(-100);
        }
      }
      
      // Sanitize state before saving
      const sanitizedState = {
        ...state,
        tasks: state.tasks
          .map(task => sanitizeTask(task))
          .filter(task => task !== null)
          .slice(-MAX_TASKS),
        sessions: state.sessions
          .map(session => sanitizeSession(session))
          .filter(session => session !== null)
          .slice(-MAX_SESSIONS)
      };
      
      // Encrypt and save
      const stateJson = JSON.stringify(sanitizedState);
      const encrypted = await encryptionService.encrypt(stateJson);
      localStorage.setItem(STATE_STORAGE_KEY, encrypted);
      
      return true;
    } catch (error) {
      console.error('Error saving state:', error);
      return false;
    }
  },

  /**
   * Load timer state (not encrypted for performance)
   * @returns {Object|null}
   */
  loadTimerState() {
    try {
      const timerData = localStorage.getItem(TIMER_STATE_KEY);
      if (!timerData) return null;
      return JSON.parse(timerData);
    } catch (error) {
      console.error('Error loading timer state:', error);
      return null;
    }
  },

  /**
   * Save timer state (not encrypted for performance)
   * @param {Object} timerState
   * @returns {boolean}
   */
  saveTimerState(timerState) {
    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState));
      return true;
    } catch (error) {
      console.error('Error saving timer state:', error);
      return false;
    }
  },

  /**
   * Clear timer state
   */
  clearTimerState() {
    try {
      localStorage.removeItem(TIMER_STATE_KEY);
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  },

  /**
   * Export data with validation
   * @param {Object} state - State to export
   * @returns {Blob}
   */
  exportData(state) {
    try {
      // Sanitize before export
      const sanitizedState = {
        ...state,
        tasks: state.tasks.map(task => sanitizeTask(task)).filter(t => t),
        sessions: state.sessions.map(session => sanitizeSession(session)).filter(s => s),
        // Remove runtime properties
        timer: {
          ...state.timer,
          isRunning: false,
          interval: null,
          lastUpdateTime: null
        }
      };
      
      const dataStr = JSON.stringify(sanitizedState, null, 2);
      return new Blob([dataStr], { type: 'application/json' });
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  },

  /**
   * Import and validate data from file
   * @param {File} file - File to import
   * @returns {Promise<Object>}
   */
  async importData(file) {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        reject(new Error('Invalid file type. Please upload a JSON file.'));
        return;
      }
      
      // Check file size
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        reject(new Error('File too large. Maximum size is 10MB.'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const result = event.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Failed to read file content');
          }
          
          // Parse JSON
          let importedState;
          try {
            importedState = JSON.parse(result);
          } catch {
            throw new Error('Invalid JSON format');
          }
          
          // Validate structure
          if (!validateState(importedState)) {
            throw new Error('Invalid state structure in import file');
          }
          
          // Sanitize all data
          const sanitizedState = {
            ...importedState,
            tasks: importedState.tasks
              .map(task => sanitizeTask(task))
              .filter(task => task !== null)
              .slice(-MAX_TASKS),
            sessions: importedState.sessions
              .map(session => sanitizeSession(session))
              .filter(session => session !== null)
              .slice(-MAX_SESSIONS),
            timer: {
              ...importedState.timer,
              isRunning: false,
              interval: null,
              lastUpdateTime: null
            }
          };
          
          if (sanitizedState.tasks.length === 0 && sanitizedState.sessions.length === 0) {
            throw new Error('No valid data found in import file');
          }
          
          resolve(sanitizedState);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  },

  /**
   * Get theme preference
   * @returns {string|null}
   */
  getThemePreference() {
    try {
      const theme = localStorage.getItem(THEME_PREFERENCE_KEY);
      if (theme && ['light', 'dark', 'system'].includes(theme)) {
        return theme;
      }
      return null;
    } catch (error) {
      console.error('Error reading theme preference:', error);
      return null;
    }
  },

  /**
   * Save theme preference
   * @param {string} theme
   * @returns {boolean}
   */
  saveThemePreference(theme) {
    try {
      if (!['light', 'dark', 'system'].includes(theme)) {
        throw new Error('Invalid theme value');
      }
      localStorage.setItem(THEME_PREFERENCE_KEY, theme);
      return true;
    } catch (error) {
      console.error('Error saving theme preference:', error);
      return false;
    }
  },

  /**
   * Get disclaimer accepted status
   * @returns {boolean}
   */
  getDisclaimerAccepted() {
    try {
      return localStorage.getItem(DISCLAIMER_ACCEPTED_KEY) === 'true';
    } catch (error) {
      console.error('Error reading disclaimer status:', error);
      return false;
    }
  },

  /**
   * Save disclaimer accepted status
   * @param {boolean} accepted
   * @returns {boolean}
   */
  saveDisclaimerAccepted(accepted) {
    try {
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, accepted.toString());
      return true;
    } catch (error) {
      console.error('Error saving disclaimer status:', error);
      return false;
    }
  },

  /**
   * Clear all data (with confirmation handled by caller)
   * @returns {boolean}
   */
  clearAllData() {
    try {
      localStorage.removeItem(STATE_STORAGE_KEY);
      localStorage.removeItem(TIMER_STATE_KEY);
      localStorage.removeItem(MIGRATION_FLAG_KEY);
      // Keep theme preference and disclaimer acceptance
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
};

