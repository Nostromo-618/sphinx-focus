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
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (conservative, accounting for encryption overhead)
const WARNING_STORAGE_SIZE = 3 * 1024 * 1024; // 3MB warning threshold
const MAX_TASKS = 500; // Maximum number of tasks (reduced for safety)
const MAX_SESSIONS = 1000; // Maximum number of sessions (reduced from 10000)
const MAX_QUALITY_RATINGS = 1000; // Maximum number of quality ratings (reduced from 10000)
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DATA_RETENTION_DAYS = 90; // Keep data for 90 days by default

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
 * Get current storage usage in bytes
 * @returns {number} Current storage size in bytes
 */
function getStorageSize() {
  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        totalSize += (key.length + value.length) * 2; // UTF-16 encoding
      }
    }
    return totalSize;
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 0;
  }
}

/**
 * Check if storage quota is within limits
 * @returns {Object} Storage status info
 */
function checkStorageSize() {
  try {
    const currentSize = getStorageSize();
    const percentUsed = (currentSize / MAX_STORAGE_SIZE) * 100;
    
    return {
      withinLimit: currentSize < MAX_STORAGE_SIZE,
      nearingLimit: currentSize >= WARNING_STORAGE_SIZE,
      currentSize,
      maxSize: MAX_STORAGE_SIZE,
      percentUsed: Math.round(percentUsed),
      availableSpace: MAX_STORAGE_SIZE - currentSize
    };
  } catch (error) {
    console.error('Error checking storage size:', error);
    return {
      withinLimit: false,
      nearingLimit: true,
      currentSize: 0,
      maxSize: MAX_STORAGE_SIZE,
      percentUsed: 100,
      availableSpace: 0
    };
  }
}

/**
 * Clean old data beyond retention period
 * @param {Object} state - State object to clean
 * @returns {Object} Cleaned state
 */
function cleanOldData(state) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
  const cutoffTime = cutoffDate.getTime();
  
  // Clean old sessions
  if (state.sessions && state.sessions.length > 0) {
    const originalCount = state.sessions.length;
    state.sessions = state.sessions.filter(session => {
      const sessionDate = new Date(session.date).getTime();
      return sessionDate > cutoffTime;
    });
    
    if (state.sessions.length < originalCount) {
      console.log(`Cleaned ${originalCount - state.sessions.length} old sessions beyond ${DATA_RETENTION_DAYS} days`);
    }
  }
  
  // Clean old quality ratings
  if (state.qualityRatings && state.qualityRatings.length > 0) {
    const originalCount = state.qualityRatings.length;
    state.qualityRatings = state.qualityRatings.filter(rating => {
      const ratingDate = new Date(rating.date).getTime();
      return ratingDate > cutoffTime;
    });
    
    if (state.qualityRatings.length < originalCount) {
      console.log(`Cleaned ${originalCount - state.qualityRatings.length} old quality ratings beyond ${DATA_RETENTION_DAYS} days`);
    }
  }
  
  return state;
}

/**
 * Progressive cleanup strategy when storage is full
 * @param {Object} state - State object to trim
 * @param {string} level - Cleanup level: 'light', 'medium', 'aggressive'
 * @returns {Object} Trimmed state
 */
function progressiveCleanup(state, level = 'light') {
  console.log(`Applying ${level} cleanup strategy`);
  
  switch (level) {
    case 'light':
      // Keep last 500 sessions, 500 quality ratings
      state.sessions = state.sessions.slice(-500);
      state.qualityRatings = (state.qualityRatings || []).slice(-500);
      // Remove completed tasks older than 7 days
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      state.tasks = state.tasks.filter(task => {
        if (!task.completed) return true;
        const taskDate = new Date(task.createdAt).getTime();
        return taskDate > weekAgo;
      });
      break;
      
    case 'medium':
      // Keep last 250 sessions, 250 quality ratings
      state.sessions = state.sessions.slice(-250);
      state.qualityRatings = (state.qualityRatings || []).slice(-250);
      // Remove all completed tasks
      state.tasks = state.tasks.filter(task => !task.completed);
      break;
      
    case 'aggressive':
      // Keep last 100 sessions, 100 quality ratings
      state.sessions = state.sessions.slice(-100);
      state.qualityRatings = (state.qualityRatings || []).slice(-100);
      // Keep only active tasks
      state.tasks = state.tasks.filter(task => !task.completed).slice(-50);
      break;
  }
  
  return state;
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
  
  // Quality ratings is optional (for backward compatibility)
  if (state.qualityRatings !== undefined && !Array.isArray(state.qualityRatings)) {
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
 * Sanitize and validate a quality rating object
 * @param {Object} rating - Quality rating to validate
 * @returns {Object|null} Sanitized rating or null if invalid
 */
function sanitizeQualityRating(rating) {
  if (!rating || typeof rating !== 'object') return null;
  if (!isValidTimestamp(rating.date)) return null;
  if (typeof rating.quality !== 'number' || rating.quality < 1 || rating.quality > 10) return null;
  if (!['focus', 'rest'].includes(rating.type)) return null;
  
  return {
    id: rating.id || Date.now(),
    date: rating.date,
    type: rating.type,
    quality: Math.floor(rating.quality),
    sessionDuration: typeof rating.sessionDuration === 'number' ? Math.floor(rating.sessionDuration) : 0
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
        
        // Sanitize quality ratings (optional, for backward compatibility)
        if (state.qualityRatings) {
          state.qualityRatings = state.qualityRatings
            .map(rating => sanitizeQualityRating(rating))
            .filter(rating => rating !== null)
            .slice(-MAX_QUALITY_RATINGS);
        } else {
          state.qualityRatings = [];
        }
        
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
   * @returns {Promise<Object>} Result object with success status and details
   */
  async saveState(state) {
    try {
      // Validate state structure
      if (!validateState(state)) {
        throw new Error('Invalid state structure');
      }
      
      // Clean old data first
      state = cleanOldData(state);
      
      // Sanitize state before saving
      let sanitizedState = {
        ...state,
        tasks: state.tasks
          .map(task => sanitizeTask(task))
          .filter(task => task !== null)
          .slice(-MAX_TASKS),
        sessions: state.sessions
          .map(session => sanitizeSession(session))
          .filter(session => session !== null)
          .slice(-MAX_SESSIONS),
        qualityRatings: (state.qualityRatings || [])
          .map(rating => sanitizeQualityRating(rating))
          .filter(rating => rating !== null)
          .slice(-MAX_QUALITY_RATINGS),
        skippedSessions: state.skippedSessions || { pomodoros: 0, rests: 0 }
      };
      
      // Check storage size before saving
      const storageStatus = checkStorageSize();
      
      // Progressive cleanup if needed
      if (storageStatus.nearingLimit || !storageStatus.withinLimit) {
        console.warn(`Storage at ${storageStatus.percentUsed}% - applying cleanup`);
        
        if (storageStatus.percentUsed >= 90) {
          sanitizedState = progressiveCleanup(sanitizedState, 'aggressive');
        } else if (storageStatus.percentUsed >= 80) {
          sanitizedState = progressiveCleanup(sanitizedState, 'medium');
        } else {
          sanitizedState = progressiveCleanup(sanitizedState, 'light');
        }
      }
      
      // Try to save
      try {
        const stateJson = JSON.stringify(sanitizedState);
        const encrypted = await encryptionService.encrypt(stateJson);
        localStorage.setItem(STATE_STORAGE_KEY, encrypted);
        
        return {
          success: true,
          cleaned: storageStatus.nearingLimit,
          storageStatus: checkStorageSize()
        };
      } catch (saveError) {
        // Check if it's a quota exceeded error
        if (saveError.name === 'QuotaExceededError' || 
            saveError.code === 22 || 
            saveError.code === 1014 ||
            saveError.message?.includes('quota')) {
          
          console.error('Storage quota exceeded! Applying aggressive cleanup...');
          
          // Apply aggressive cleanup
          sanitizedState = progressiveCleanup(sanitizedState, 'aggressive');
          
          // Try saving again
          try {
            const stateJson = JSON.stringify(sanitizedState);
            const encrypted = await encryptionService.encrypt(stateJson);
            localStorage.setItem(STATE_STORAGE_KEY, encrypted);
            
            return {
              success: true,
              cleaned: true,
              quotaExceeded: true,
              message: 'Storage was full. Older data has been removed to save new data.',
              storageStatus: checkStorageSize()
            };
          } catch (retryError) {
            console.error('Failed to save even after cleanup:', retryError);
            return {
              success: false,
              quotaExceeded: true,
              message: 'Storage is full. Please export your data and clear old sessions.',
              storageStatus: checkStorageSize()
            };
          }
        }
        
        throw saveError; // Re-throw if not quota error
      }
    } catch (error) {
      console.error('Error saving state:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to save data. Please try again.'
      };
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
        qualityRatings: (state.qualityRatings || [])
          .map(rating => sanitizeQualityRating(rating))
          .filter(r => r),
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
            qualityRatings: (importedState.qualityRatings || [])
              .map(rating => sanitizeQualityRating(rating))
              .filter(rating => rating !== null)
              .slice(-MAX_QUALITY_RATINGS),
            timer: {
              ...importedState.timer,
              isRunning: false,
              interval: null,
              lastUpdateTime: null
            }
          };
          
          if (sanitizedState.tasks.length === 0 && sanitizedState.sessions.length === 0 && sanitizedState.qualityRatings.length === 0) {
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
   * Get current storage usage information
   * @returns {Object} Storage status information
   */
  getStorageInfo() {
    return checkStorageSize();
  },

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

