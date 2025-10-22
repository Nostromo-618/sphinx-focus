// State Management
let state = {
    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        mode: 'work', // work, break, longBreak
        sessionCount: 0,
        interval: null,
        totalSeconds: 25 * 60,
        currentSeconds: 25 * 60,
        lastUpdateTime: null // Track when timer was last updated
    },
    settings: {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        sound: true,
        notification: true,
        notificationPermission: 'default', // Track permission state
        autoBreak: false,
        autoPomodoro: false
    },
    tasks: [],
    sessions: [],
    statistics: {
        todayPomodoros: 0,
        todayFocusTime: 0,
        todayTasks: 0,
        currentStreak: 0,
        weeklyData: []
    }
};

let focusChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadState();
    initializeTheme();
    restoreTimerState(); // Restore timer if it was running
    updateDisplay();
    updateStatistics();
    updateSessionHistory();
    updateTaskList();
    initializeChart();
    initializeNotifications(); // Better notification handling
    
    // Update settings inputs
    document.getElementById('workDuration').value = state.settings.workDuration;
    document.getElementById('breakDuration').value = state.settings.breakDuration;
    document.getElementById('longBreakDuration').value = state.settings.longBreakDuration;
    document.getElementById('sessionsUntilLongBreak').value = state.settings.sessionsUntilLongBreak;
    
    // Update toggle switches
    updateToggleSwitch('soundToggle', state.settings.sound);
    updateToggleSwitch('notificationToggle', state.settings.notification);
    updateToggleSwitch('autoBreakToggle', state.settings.autoBreak);
    updateToggleSwitch('autoPomodoroToggle', state.settings.autoPomodoro);
    
    // Add event listeners for settings changes
    document.getElementById('workDuration').addEventListener('change', updateSettings);
    document.getElementById('breakDuration').addEventListener('change', updateSettings);
    document.getElementById('longBreakDuration').addEventListener('change', updateSettings);
    document.getElementById('sessionsUntilLongBreak').addEventListener('change', updateSettings);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Add task input enter key handler
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
});

// Theme Management
function initializeTheme() {
    // Check for saved theme preference first
    const savedThemePreference = localStorage.getItem('sphinxFocusThemePreference') || 'system';
    
    applyTheme(savedThemePreference);
    updateThemeIcon(savedThemePreference);
    
    // Listen for system theme changes if preference is 'system'
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentPreference = localStorage.getItem('sphinxFocusThemePreference') || 'system';
        if (currentPreference === 'system') {
            const systemTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
        }
    });
}

function applyTheme(preference) {
    let actualTheme;
    
    if (preference === 'system') {
        // Use system preference
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
        // Use user's explicit choice
        actualTheme = preference;
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme);
}

function setTheme(preference) {
    localStorage.setItem('sphinxFocusThemePreference', preference);
    applyTheme(preference);
    updateThemeIcon(preference);
    closeThemeDropdown();
}

function updateThemeIcon(preference) {
    const icon = document.getElementById('themeIcon');
    
    if (preference === 'light') {
        icon.textContent = 'light_mode';
    } else if (preference === 'dark') {
        icon.textContent = 'dark_mode';
    } else {
        icon.textContent = 'contrast';
    }
    
    // Update active state in dropdown
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const activeOption = document.querySelector(`.theme-option[onclick="setTheme('${preference}')"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
}

function toggleThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    dropdown.classList.toggle('show');
    
    // Update active state
    const currentPreference = localStorage.getItem('sphinxFocusThemePreference') || 'system';
    updateThemeIcon(currentPreference);
}

function closeThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    dropdown.classList.remove('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const themeSelector = document.querySelector('.theme-selector');
    if (themeSelector && !themeSelector.contains(event.target)) {
        closeThemeDropdown();
    }
});

// Timer Functions
function toggleTimer() {
    if (state.timer.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    state.timer.isRunning = true;
    state.timer.lastUpdateTime = Date.now();
    updateStartButton();
    saveTimerState(); // Save immediately when starting
    
    state.timer.interval = setInterval(() => {
        if (state.timer.seconds === 0) {
            if (state.timer.minutes === 0) {
                completeSession();
                return;
            }
            state.timer.minutes--;
            state.timer.seconds = 59;
        } else {
            state.timer.seconds--;
        }
        state.timer.currentSeconds = state.timer.minutes * 60 + state.timer.seconds;
        state.timer.lastUpdateTime = Date.now();
        updateDisplay();
        updateProgress();
        saveTimerState(); // Save timer state every second
    }, 1000);
}

function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.interval);
    state.timer.lastUpdateTime = null;
    updateStartButton();
    saveTimerState(); // Save when pausing
}

function resetTimer() {
    pauseTimer();
    const duration = getDurationForMode(state.timer.mode);
    state.timer.minutes = duration;
    state.timer.seconds = 0;
    state.timer.totalSeconds = duration * 60;
    state.timer.currentSeconds = duration * 60;
    state.timer.lastUpdateTime = null;
    updateDisplay();
    updateProgress();
    saveTimerState(); // Save reset state
}

function skipSession() {
    pauseTimer();
    nextSession();
}

function completeSession() {
    pauseTimer();
    
    // Clear the timer state since session is complete
    localStorage.removeItem('sphinxFocusTimerState');
    
    // Play sound if enabled
    if (state.settings.sound) {
        playNotificationSound();
    }
    
    // Show notification if enabled
    if (state.settings.notification) {
        showBrowserNotification();
    }
    
    // Save session
    if (state.timer.mode === 'work') {
        const session = {
            id: Date.now(),
            date: new Date().toISOString(),
            duration: state.settings.workDuration,
            type: 'work',
            completed: true
        };
        state.sessions.push(session);
        state.statistics.todayPomodoros++;
        state.statistics.todayFocusTime += state.settings.workDuration;
        updateStatistics();
        updateSessionHistory();
        saveState();
    }
    
    // Show in-app notification
    showNotification(
        state.timer.mode === 'work' ? 'Focus session complete!' : 'Break time over!',
        state.timer.mode === 'work' ? 'Time for a break' : 'Ready to focus?'
    );
    
    // Auto-start next session if enabled
    setTimeout(() => {
        if ((state.timer.mode === 'work' && state.settings.autoBreak) ||
            (state.timer.mode !== 'work' && state.settings.autoPomodoro)) {
            nextSession();
            startTimer();
        } else {
            nextSession();
        }
    }, 2000);
}

function nextSession() {
    if (state.timer.mode === 'work') {
        state.timer.sessionCount++;
        if (state.timer.sessionCount % state.settings.sessionsUntilLongBreak === 0) {
            state.timer.mode = 'longBreak';
        } else {
            state.timer.mode = 'break';
        }
    } else {
        state.timer.mode = 'work';
    }
    
    resetTimer();
    updateTimerMode();
}

function getDurationForMode(mode) {
    switch(mode) {
        case 'work':
            return state.settings.workDuration;
        case 'break':
            return state.settings.breakDuration;
        case 'longBreak':
            return state.settings.longBreakDuration;
        default:
            return 25;
    }
}

function updateDisplay() {
    const minutes = String(state.timer.minutes).padStart(2, '0');
    const seconds = String(state.timer.seconds).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${minutes}:${seconds}`;
    
    // Update page title
    if (state.timer.isRunning) {
        document.title = `${minutes}:${seconds} - Sphinx Focus`;
    } else {
        document.title = 'Sphinx Focus - Pomodoro Timer';
    }
}

function updateProgress() {
    const progressCircle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 88;
    const progress = state.timer.currentSeconds / state.timer.totalSeconds;
    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = offset;
}

function updateTimerMode() {
    const modeElement = document.getElementById('timerMode');
    modeElement.className = 'timer-mode';
    
    switch(state.timer.mode) {
        case 'work':
            modeElement.textContent = 'Focus Time';
            modeElement.classList.add('work');
            break;
        case 'break':
            modeElement.textContent = 'Short Break';
            modeElement.classList.add('break');
            break;
        case 'longBreak':
            modeElement.textContent = 'Long Break';
            modeElement.classList.add('long-break');
            break;
    }
}

function updateStartButton() {
    const btn = document.getElementById('startBtn');
    if (state.timer.isRunning) {
        btn.innerHTML = '<span class="material-symbols-outlined">pause</span><span>Pause</span>';
    } else {
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span><span>Start</span>';
    }
}

// Task Management
function addTask() {
    const input = document.getElementById('taskInput');
    const taskText = input.value.trim();
    
    if (taskText) {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        state.tasks.push(task);
        input.value = '';
        updateTaskList();
        saveState();
    }
}

function toggleTask(taskId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = state.tasks[taskIndex];
        task.completed = !task.completed;
        
        if (task.completed) {
            state.statistics.todayTasks++;
            updateStatistics();
            
            // Move completed task to bottom
            state.tasks.splice(taskIndex, 1);
            state.tasks.push(task);
        } else {
            // Move uncompleted task to top (before other completed tasks)
            state.tasks.splice(taskIndex, 1);
            const firstCompletedIndex = state.tasks.findIndex(t => t.completed);
            if (firstCompletedIndex !== -1) {
                state.tasks.splice(firstCompletedIndex, 0, task);
            } else {
                state.tasks.push(task);
            }
        }
        
        updateTaskList();
        saveState();
    }
}

function deleteTask(taskId) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    updateTaskList();
    saveState();
}

// Drag and Drop functionality
let draggedElement = null;
let draggedIndex = null;

function initializeDragAndDrop() {
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach((item, index) => {
        // Dragstart event
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            draggedIndex = parseInt(item.dataset.taskIndex);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        // Dragend event
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            draggedElement = null;
            draggedIndex = null;
            
            // Remove all drag-over classes
            document.querySelectorAll('.task-item').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
        
        // Dragover event
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedElement !== item) {
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Remove drag-over from all items
                document.querySelectorAll('.task-item').forEach(el => {
                    el.classList.remove('drag-over');
                });
                
                item.classList.add('drag-over');
            }
        });
        
        // Drop event
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedElement !== item) {
                const dropIndex = parseInt(item.dataset.taskIndex);
                
                // Reorder the tasks array
                const [movedTask] = state.tasks.splice(draggedIndex, 1);
                state.tasks.splice(dropIndex, 0, movedTask);
                
                // Update UI and save
                updateTaskList();
                saveState();
            }
            
            item.classList.remove('drag-over');
        });
        
        // Dragleave event
        item.addEventListener('dragleave', (e) => {
            if (e.target === item) {
                item.classList.remove('drag-over');
            }
        });
    });
}

function updateTaskList() {
    const taskList = document.getElementById('taskList');
    
    if (state.tasks.length === 0) {
        taskList.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">No tasks yet. Add one above!</div>';
        return;
    }
    
    taskList.innerHTML = state.tasks.map((task, index) => `
        <div class="task-item ${task.completed ? 'completed' : ''}" 
             draggable="true" 
             data-task-id="${task.id}"
             data-task-index="${index}">
            <div class="task-content">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
                <span class="task-text">${task.text}</span>
            </div>
            <button class="task-delete" onclick="deleteTask(${task.id})">✕</button>
        </div>
    `).join('');
    
    // Add drag and drop event listeners
    initializeDragAndDrop();
}

// Statistics
function updateStatistics() {
    // Today's stats
    document.getElementById('todayPomodoros').textContent = state.statistics.todayPomodoros;
    
    const hours = Math.floor(state.statistics.todayFocusTime / 60);
    const minutes = state.statistics.todayFocusTime % 60;
    document.getElementById('todayFocusTime').textContent = `${hours}h ${minutes}m`;
    
    document.getElementById('todayTasks').textContent = state.statistics.todayTasks;
    document.getElementById('currentStreak').textContent = state.statistics.currentStreak;
    
    // Update chart
    updateChart();
}

function initializeChart() {
    const ctx = document.getElementById('focusChart').getContext('2d');
    
    // Generate last 7 days data
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
        
        // Get data for this day from sessions
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayMinutes = state.sessions
            .filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            })
            .reduce((total, session) => total + session.duration, 0);
        
        data.push(dayMinutes);
    }
    
    focusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Focus Minutes',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (!focusChart) return;
    
    // Update chart with new data
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayMinutes = state.sessions
            .filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= dayStart && sessionDate <= dayEnd;
            })
            .reduce((total, session) => total + session.duration, 0);
        
        data.push(dayMinutes);
    }
    
    focusChart.data.datasets[0].data = data;
    focusChart.update();
}

// Session History
function updateSessionHistory() {
    const historyContainer = document.getElementById('sessionHistory');
    
    if (state.sessions.length === 0) {
        historyContainer.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 20px;">No sessions yet. Start your first Pomodoro!</div>';
        return;
    }
    
    const recentSessions = state.sessions.slice(-10).reverse();
    
    historyContainer.innerHTML = recentSessions.map(session => {
        const date = new Date(session.date);
        const timeStr = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        
        return `
            <div class="session-item">
                <div class="session-info">
                    <div class="session-date">${dateStr} at ${timeStr}</div>
                    <div class="session-details">Focus Session</div>
                </div>
                <div class="session-duration">${session.duration} min</div>
            </div>
        `;
    }).join('');
}

// Settings
function openSettings() {
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

function toggleSetting(setting) {
    // Special handling for notification setting
    if (setting === 'notification') {
        if (!state.settings[setting] && 'Notification' in window) {
            // Turning on notifications
            if (Notification.permission === 'default') {
                // Request permission first
                Notification.requestPermission().then(permission => {
                    state.settings.notificationPermission = permission;
                    if (permission === 'granted') {
                        state.settings.notification = true;
                        updateToggleSwitch('notificationToggle', true);
                    } else {
                        // Permission denied, keep toggle off
                        state.settings.notification = false;
                        updateToggleSwitch('notificationToggle', false);
                        showNotification('Permission Denied', 'Browser notifications require permission');
                    }
                    saveState();
                });
                return;
            } else if (Notification.permission === 'granted') {
                state.settings.notification = true;
            } else {
                // Permission was denied
                showNotification('Permission Denied', 'Please enable notifications in browser settings');
                return;
            }
        } else {
            // Turning off notifications
            state.settings.notification = false;
        }
    } else {
        state.settings[setting] = !state.settings[setting];
    }
    
    updateToggleSwitch(setting + 'Toggle', state.settings[setting]);
    saveState();
}

function updateToggleSwitch(elementId, isActive) {
    const toggle = document.getElementById(elementId);
    if (toggle) {
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

function updateSettings() {
    state.settings.workDuration = parseInt(document.getElementById('workDuration').value);
    state.settings.breakDuration = parseInt(document.getElementById('breakDuration').value);
    state.settings.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
    state.settings.sessionsUntilLongBreak = parseInt(document.getElementById('sessionsUntilLongBreak').value);
    
    // Reset timer if settings changed
    if (!state.timer.isRunning) {
        resetTimer();
    }
    
    saveState();
}

// Notifications
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Initialize notifications and check/restore permission state
function initializeNotifications() {
    if ('Notification' in window) {
        // Update our stored permission state
        state.settings.notificationPermission = Notification.permission;
        
        // Only request if we haven't asked before (permission is 'default')
        // and notifications are enabled in settings
        if (Notification.permission === 'default' && state.settings.notification) {
            Notification.requestPermission().then(permission => {
                state.settings.notificationPermission = permission;
                saveState();
                
                // Update toggle if permission was denied
                if (permission === 'denied') {
                    state.settings.notification = false;
                    updateToggleSwitch('notificationToggle', false);
                }
            });
        }
        
        // If permission was previously granted but toggle is off, respect that
        if (Notification.permission === 'granted' && state.settings.notification) {
            updateToggleSwitch('notificationToggle', true);
        }
    }
}

// Save timer state separately for frequent updates
function saveTimerState() {
    const timerData = {
        minutes: state.timer.minutes,
        seconds: state.timer.seconds,
        isRunning: state.timer.isRunning,
        mode: state.timer.mode,
        sessionCount: state.timer.sessionCount,
        totalSeconds: state.timer.totalSeconds,
        currentSeconds: state.timer.currentSeconds,
        lastUpdateTime: state.timer.lastUpdateTime
    };
    localStorage.setItem('sphinxFocusTimerState', JSON.stringify(timerData));
}

// Restore timer state on page load
function restoreTimerState() {
    const savedTimer = localStorage.getItem('sphinxFocusTimerState');
    if (savedTimer) {
        const timerData = JSON.parse(savedTimer);
        
        // If timer was running, calculate elapsed time
        if (timerData.isRunning && timerData.lastUpdateTime) {
            const elapsed = Math.floor((Date.now() - timerData.lastUpdateTime) / 1000);
            let remainingSeconds = timerData.currentSeconds - elapsed;
            
            // Check if timer should have completed
            if (remainingSeconds <= 0) {
                // Timer completed while page was closed
                state.timer.minutes = 0;
                state.timer.seconds = 0;
                state.timer.isRunning = false;
                completeSession();
            } else {
                // Update timer with elapsed time
                state.timer.minutes = Math.floor(remainingSeconds / 60);
                state.timer.seconds = remainingSeconds % 60;
                state.timer.currentSeconds = remainingSeconds;
                state.timer.totalSeconds = timerData.totalSeconds;
                state.timer.mode = timerData.mode;
                state.timer.sessionCount = timerData.sessionCount;
                
                // Resume timer
                startTimer();
            }
        } else {
            // Timer was paused, just restore the state
            state.timer.minutes = timerData.minutes;
            state.timer.seconds = timerData.seconds;
            state.timer.mode = timerData.mode;
            state.timer.sessionCount = timerData.sessionCount;
            state.timer.totalSeconds = timerData.totalSeconds;
            state.timer.currentSeconds = timerData.currentSeconds;
        }
        
        updateTimerMode();
        updateProgress();
    }
}

function showBrowserNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const title = state.timer.mode === 'work' ? 'Focus session complete!' : 'Break time over!';
        const body = state.timer.mode === 'work' ? 'Time for a break' : 'Ready to focus?';
        
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧘</text></svg>'
        });
    }
}

function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Data Management
function saveState() {
    localStorage.setItem('sphinxFocusState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('sphinxFocusState');
    if (saved) {
        const loadedState = JSON.parse(saved);
        
        // Merge with default state to ensure all properties exist
        state = {
            ...state,
            ...loadedState,
            timer: {
                ...state.timer,
                ...loadedState.timer,
                isRunning: false,
                interval: null
            },
            settings: {
                ...state.settings,
                ...loadedState.settings
            }
        };
        
        // Check if today's stats need to be reset
        const today = new Date().toDateString();
        const lastSession = state.sessions[state.sessions.length - 1];
        if (!lastSession || new Date(lastSession.date).toDateString() !== today) {
            state.statistics.todayPomodoros = 0;
            state.statistics.todayFocusTime = 0;
            state.statistics.todayTasks = 0;
        }
    }
}

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `sphinx-focus-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Export Complete', 'Your data has been downloaded');
}

function importData() {
    document.getElementById('importFile').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            
            // Validate the imported data
            if (importedState.timer && importedState.settings && importedState.tasks && importedState.sessions) {
                state = {
                    ...state,
                    ...importedState,
                    timer: {
                        ...state.timer,
                        ...importedState.timer,
                        isRunning: false,
                        interval: null
                    }
                };
                
                saveState();
                location.reload();
            } else {
                showNotification('Import Failed', 'Invalid data format');
            }
        } catch (error) {
            showNotification('Import Failed', 'Could not parse the file');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem('sphinxFocusState');
        localStorage.removeItem('sphinxFocusTimerState');
        localStorage.removeItem('sphinxFocusTheme');
        location.reload();
    }
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Space bar to start/pause
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleTimer();
    }
    
    // R to reset
    if (e.key === 'r' && e.target.tagName !== 'INPUT') {
        resetTimer();
    }
    
    // S to skip
    if (e.key === 's' && e.target.tagName !== 'INPUT') {
        skipSession();
    }
}
