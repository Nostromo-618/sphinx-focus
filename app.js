// App Version
const APP_VERSION = '2.2.0';

// State Management
let state = {
    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        hasStarted: false,
        mode: 'work', // work, break, longBreak
        sessionCount: 0,
        interval: null,
        totalSeconds: 25 * 60,
        currentSeconds: 25 * 60,
        lastUpdateTime: null // Track when timer was last updated
    },
    timerMode: 'pomodoro', // 'pomodoro' | 'fibonacci'
    fibonacci: {
        enabled: false,
        hasSeenModal: false, // Track if user has seen explanation modal
        currentIndex: 0, // Index in fibonacci array
        sequence: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
        customization: {
            decreaseThreshold: 7,    // Rating below this decreases
            increaseThreshold: 10,   // Rating at this increases
            minDuration: 1,          // Minimum minutes
            maxDuration: 89,         // Maximum minutes
            excludedNumbers: []      // Numbers to skip in sequence
        },
        lastInterval: 1 // Remember last used interval
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
        autoPomodoro: false,
        resumeTimer: true, // Resume timer after page refresh
        qualityDialog: true // Quality rating dialog after each session
    },
    tasks: [],
    sessions: [],
    qualityRatings: [], // Quality ratings for focus and rest sessions
    skippedSessions: {
        pomodoros: 0,
        rests: 0
    },
    statistics: {
        todayPomodoros: 0,
        todayFocusTime: 0,
        todayTasks: 0,
        currentStreak: 0,
        weeklyData: []
    }
};

let focusChart = null;
let qualityChart = null;
// BlurControl instance
let blurControl = null;


// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Display app version
    document.getElementById('appVersion').textContent = APP_VERSION;
    
    // Check disclaimer acceptance first
    checkDisclaimer();
    
    await loadState();
    initializeTheme();
    await restoreTimerState(); // Restore timer if it was running
    updateDisplay();
    updateStatistics();
    updateTaskList();
    initializeChart();
    initializeQualityChart();
    updateQualityStatistics(); // Initialize skip statistics display
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
    updateToggleSwitch('resumeTimerToggle', state.settings.resumeTimer);
    updateToggleSwitch('qualityDialogToggle', state.settings.qualityDialog);
    
    // Initialize Fibonacci mode UI
    updateTimerModeDisplay();
    updateModeToggleButtons();
    updateSessionSettingsVisibility();
    updateFibonacciSettingsButtonVisibility();
    
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
    
    // Initialize BlurControl
    initializeBlurControl();
});

// Theme Management
function initializeTheme() {
    // Check for saved theme preference first
    const savedThemePreference = storageService.getThemePreference() || 'system';
    
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
    storageService.saveThemePreference(preference);
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
    const currentPreference = storageService.getThemePreference() || 'system';
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
    state.timer.hasStarted = true;
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
    state.timer.hasStarted = false;
    const duration = getDurationForMode(state.timer.mode);
    
    // Handle decimal durations (for Fibonacci breaks)
    const totalSeconds = Math.round(duration * 60);
    state.timer.minutes = Math.floor(totalSeconds / 60);
    state.timer.seconds = totalSeconds % 60;
    state.timer.totalSeconds = totalSeconds;
    state.timer.currentSeconds = totalSeconds;
    state.timer.lastUpdateTime = null;
    
    updateDisplay();
    updateProgress();
    updateStartButton();
    saveTimerState(); // Save reset state
}

function skipSession() {
    pauseTimer();
    
    // Track skipped sessions
    if (state.timer.mode === 'work') {
        state.skippedSessions.pomodoros++;
    } else {
        // Count both break and longBreak as rests
        state.skippedSessions.rests++;
    }
    
    // Update quality statistics display
    updateQualityStatistics();
    saveState();
    
    nextSession();
}

function completeSession() {
    pauseTimer();
    
    // Clear the timer state since session is complete
    storageService.clearTimerState();
    
    // Play sound if enabled
    if (state.settings.sound) {
        playNotificationSound();
    }
    
    // Show notification if enabled
    if (state.settings.notification) {
        showBrowserNotification();
    }
    
    // Determine session type for quality dialog
    let qualitySessionType = null;
    let qualitySessionDuration = null;
    
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
        saveState();
        
        qualitySessionType = 'focus';
        qualitySessionDuration = state.settings.workDuration;
    } else {
        // Break or long break
        qualitySessionType = 'rest';
        qualitySessionDuration = state.timer.mode === 'longBreak' ? 
            state.settings.longBreakDuration : state.settings.breakDuration;
    }
    
    // Show in-app notification
    showNotification(
        state.timer.mode === 'work' ? 'Focus session complete!' : 'Break time over!',
        state.timer.mode === 'work' ? 'Time for a break' : 'Ready to focus?'
    );
    
    // Show quality dialog immediately if enabled
    if (state.settings.qualityDialog) {
        setTimeout(() => {
            showQualityDialog(qualitySessionType, qualitySessionDuration);
        }, 500);
    }
    
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
    // If Fibonacci mode is enabled, use Fibonacci durations
    if (state.fibonacci.enabled && state.timerMode === 'fibonacci') {
        switch(mode) {
            case 'work':
                return getFibonacciDuration();
            case 'break':
            case 'longBreak':
                const focusDuration = getFibonacciDuration();
                // Calculate break in decimal minutes (e.g., 0.2, 0.4, 0.6)
                const breakDecimal = calculateFibonacciBreak(focusDuration);
                // Return as decimal - resetTimer will handle conversion to minutes:seconds
                return breakDecimal;
            default:
                return getFibonacciDuration();
        }
    }
    
    // Standard Pomodoro mode
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
    } else if (state.timer.hasStarted) {
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span><span>Resume</span>';
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
        
        // Always add new tasks at the very top
        state.tasks.unshift(task);
        
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
            // Move uncompleted task to the very top
            state.tasks.splice(taskIndex, 1);
            state.tasks.unshift(task);
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

// Quality Chart Functions
function initializeQualityChart() {
    const ctx = document.getElementById('qualityChart').getContext('2d');
    
    qualityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Focus Quality',
                    data: [],
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    spanGaps: true
                },
                {
                    label: 'Rest Quality',
                    data: [],
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 10,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '/10';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 10.5,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        }
    });
    
    updateQualityChart();
}

function updateQualityChart() {
    if (!qualityChart) return;
    
    const ratings = state.qualityRatings || [];
    const emptyState = document.getElementById('qualityEmptyState');
    const chartContainer = qualityChart.canvas.parentElement;
    
    if (ratings.length === 0) {
        emptyState.classList.add('show');
        chartContainer.style.display = 'none';
        document.getElementById('avgFocusQuality').textContent = '-';
        document.getElementById('avgRestQuality').textContent = '-';
        document.getElementById('totalRatings').textContent = '0';
        return;
    }
    
    emptyState.classList.remove('show');
    chartContainer.style.display = 'block';
    
    // Prepare data
    const focusRatings = ratings.filter(r => r.type === 'focus');
    const restRatings = ratings.filter(r => r.type === 'rest');
    
    // Create combined time series
    const allRatings = [...ratings].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const labels = [];
    const focusData = [];
    const restData = [];
    
    allRatings.forEach(rating => {
        const date = new Date(rating.date);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        labels.push(`${dateStr} ${timeStr}`);
        
        if (rating.type === 'focus') {
            focusData.push(rating.quality);
            restData.push(null); // No rest data at this point
        } else {
            restData.push(rating.quality);
            focusData.push(null); // No focus data at this point
        }
    });
    
    qualityChart.data.labels = labels;
    qualityChart.data.datasets[0].data = focusData;
    qualityChart.data.datasets[1].data = restData;
    qualityChart.update();
    
    // Update statistics
    const avgFocus = focusRatings.length > 0 
        ? (focusRatings.reduce((sum, r) => sum + r.quality, 0) / focusRatings.length).toFixed(1)
        : '-';
    const avgRest = restRatings.length > 0
        ? (restRatings.reduce((sum, r) => sum + r.quality, 0) / restRatings.length).toFixed(1)
        : '-';
    
    document.getElementById('avgFocusQuality').textContent = avgFocus;
    document.getElementById('avgRestQuality').textContent = avgRest;
    document.getElementById('totalRatings').textContent = ratings.length;
    
    // Update skip statistics
    updateQualityStatistics();
}

function updateQualityStatistics() {
    // Update skipped sessions display
    const skippedPomodoros = state.skippedSessions?.pomodoros || 0;
    const skippedRests = state.skippedSessions?.rests || 0;
    
    document.getElementById('skippedPomodoros').textContent = skippedPomodoros;
    document.getElementById('skippedRests').textContent = skippedRests;
}

// Session History

// Settings
function openSettings() {
    document.getElementById('settingsModal').classList.add('show');
    updateStorageDisplay(); // Update storage info when opening settings
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

// Storage Info Modal
function openStorageInfo() {
    document.getElementById('storageInfoModal').classList.add('show');
}

function closeStorageInfo() {
    document.getElementById('storageInfoModal').classList.remove('show');
}

// Switch between info tabs
function switchInfoTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.info-tab');
    console.log('Found tabs:', tabs.length);
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.info-tab[data-tab="${tabName}"]`);
    console.log('Active tab:', activeTab);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update tab content
    const contents = document.querySelectorAll('.info-tab-content');
    console.log('Found content sections:', contents.length);
    contents.forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${tabName}TabContent`);
    console.log('Active content:', activeContent);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

// Update storage usage display
function updateStorageDisplay() {
    const storageInfo = storageService.getStorageInfo();
    
    // Update percentage text
    const percentText = document.getElementById('storageUsageText');
    if (percentText) {
        percentText.textContent = `${storageInfo.percentUsed}%`;
        
        // Color code based on usage
        if (storageInfo.percentUsed >= 90) {
            percentText.style.color = 'var(--danger-color)';
        } else if (storageInfo.percentUsed >= 75) {
            percentText.style.color = 'var(--warning-color)';
        } else {
            percentText.style.color = 'var(--success-color)';
        }
    }
    
    // Update progress bar
    const progressFill = document.getElementById('storageProgressFill');
    if (progressFill) {
        progressFill.style.width = `${storageInfo.percentUsed}%`;
        
        // Color code the progress bar
        if (storageInfo.percentUsed >= 90) {
            progressFill.style.background = 'var(--danger-color)';
        } else if (storageInfo.percentUsed >= 75) {
            progressFill.style.background = 'var(--warning-color)';
        } else {
            progressFill.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
        }
    }
    
    // Update details text
    const detailsText = document.getElementById('storageUsageDetails');
    if (detailsText) {
        const usedFormatted = storageService.formatBytes(storageInfo.currentSize);
        const maxFormatted = storageService.formatBytes(storageInfo.maxSize);
        detailsText.textContent = `${usedFormatted} of ${maxFormatted} used`;
    }
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
        hasStarted: state.timer.hasStarted,
        mode: state.timer.mode,
        sessionCount: state.timer.sessionCount,
        totalSeconds: state.timer.totalSeconds,
        currentSeconds: state.timer.currentSeconds,
        lastUpdateTime: state.timer.lastUpdateTime
    };
    storageService.saveTimerState(timerData);
}

// Restore timer state on page load
async function restoreTimerState() {
    const timerData = storageService.loadTimerState();
    if (timerData) {
        
        // If timer was running, calculate elapsed time
        if (timerData.isRunning && timerData.lastUpdateTime && state.settings.resumeTimer) {
            const elapsed = Math.floor((Date.now() - timerData.lastUpdateTime) / 1000);
            let remainingSeconds = timerData.currentSeconds - elapsed;
            
            // Check if timer should have completed
            if (remainingSeconds <= 0) {
                // Timer completed while page was closed
                state.timer.minutes = 0;
                state.timer.seconds = 0;
                state.timer.isRunning = false;
                state.timer.hasStarted = true;
                completeSession();
            } else {
                // Update timer with elapsed time
                state.timer.minutes = Math.floor(remainingSeconds / 60);
                state.timer.seconds = remainingSeconds % 60;
                state.timer.currentSeconds = remainingSeconds;
                state.timer.totalSeconds = timerData.totalSeconds;
                state.timer.mode = timerData.mode;
                state.timer.sessionCount = timerData.sessionCount;
                state.timer.hasStarted = true;
                
                // Resume timer
                startTimer();
                
                // Notify user that timer was resumed
                setTimeout(() => {
                    showNotification('Timer Resumed', 'Your session continued from where you left off');
                }, 1000);
            }
        } else {
            // Timer was paused, just restore the state
            state.timer.minutes = timerData.minutes;
            state.timer.seconds = timerData.seconds;
            state.timer.mode = timerData.mode;
            state.timer.sessionCount = timerData.sessionCount;
            state.timer.totalSeconds = timerData.totalSeconds;
            state.timer.currentSeconds = timerData.currentSeconds;
            state.timer.hasStarted = timerData.hasStarted || false;
        }
        
        updateTimerMode();
        updateProgress();
        updateStartButton();
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
async function saveState() {
    try {
        const result = await storageService.saveState(state);
        
        if (!result.success) {
            console.error('Failed to save state:', result.error);
            showNotification('Save Error', result.message || 'Failed to save data. Please try again.');
            return;
        }
        
        // Notify user if data was cleaned due to storage limits
        if (result.quotaExceeded) {
            showNotification('Storage Full', result.message);
        } else if (result.cleaned && result.storageStatus?.percentUsed >= 80) {
            showNotification('Storage Warning', `Storage is ${result.storageStatus.percentUsed}% full. Consider exporting and clearing old data.`);
        }
    } catch (error) {
        console.error('Failed to save state:', error);
        showNotification('Error', 'Failed to save data. Please try again.');
    }
}

async function loadState() {
    try {
        const loadedState = await storageService.loadState();
        
        if (loadedState) {
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
                timerMode: loadedState.timerMode || 'pomodoro',
                fibonacci: {
                    ...state.fibonacci,
                    ...loadedState.fibonacci
                },
                settings: {
                    ...state.settings,
                    ...loadedState.settings
                },
                qualityRatings: loadedState.qualityRatings || [],
                skippedSessions: loadedState.skippedSessions || {
                    pomodoros: 0,
                    rests: 0
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
    } catch (error) {
        console.error('Failed to load state:', error);
        showNotification('Error', 'Failed to load saved data');
    }
}

function exportData() {
    try {
        const dataBlob = storageService.exportData(state);
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `sphinx-focus-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Export Complete', 'Your data has been downloaded');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Export Failed', 'Could not export data. Please try again.');
    }
}

function importData() {
    document.getElementById('importFile').click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const importedState = await storageService.importData(file);
        
        // Merge imported state with current state
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
        
        await saveState();
        showNotification('Import Complete', 'Your data has been imported successfully');
        
        // Reload after a short delay to show notification
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('Import failed:', error);
        showNotification('Import Failed', error.message || 'Could not import the file');
    }
    
    event.target.value = '';
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        storageService.clearAllData();
        showNotification('Data Cleared', 'All data has been removed');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// Disclaimer Management
function checkDisclaimer() {
    const accepted = storageService.getDisclaimerAccepted();
    if (!accepted) {
        showDisclaimerModal();
    }
}

function showDisclaimerModal() {
    const modal = document.getElementById('disclaimerModal');
    modal.classList.add('show');
    
    // Blur the background content
    document.querySelector('.container').style.filter = 'blur(5px)';
    document.querySelector('.container').style.pointerEvents = 'none';
}

function hideDisclaimerModal() {
    const modal = document.getElementById('disclaimerModal');
    modal.classList.remove('show');
    
    // Remove blur from background
    document.querySelector('.container').style.filter = 'none';
    document.querySelector('.container').style.pointerEvents = 'auto';
}

function acceptDisclaimer() {
    storageService.saveDisclaimerAccepted(true);
    hideDisclaimerModal();
    showNotification('Welcome!', 'Thank you for accepting. Enjoy using Sphinx Focus!');
}

function declineDisclaimer() {
    if (confirm('You must accept the disclaimer to use this app. If you decline, the app will not function. Are you sure you want to decline?')) {
        // Show a message and keep the modal
        alert('You cannot use this app without accepting the disclaimer. Please refresh the page if you change your mind.');
    }
}

// Changelog Management
function openChangelog() {
    document.getElementById('changelogModal').classList.add('show');
}

function closeChangelog() {
    document.getElementById('changelogModal').classList.remove('show');
}

// Modal Background Click Handler
function closeModalOnBackgroundClick(event, modalId, closeFunction) {
    // Only close if clicking directly on the modal background, not its children
    if (event.target.id === modalId) {
        closeFunction();
    }
}

// Quality Dialog Background Click Handler (with Fibonacci mode check)
function closeQualityDialogOnBackgroundClick(event) {
    // Only close if clicking directly on the modal background
    if (event.target.id === 'qualityDialogModal') {
        // In Fibonacci mode, prevent closing for focus sessions
        if (state.fibonacci.enabled && state.timerMode === 'fibonacci' && currentQualitySessionType === 'focus') {
            showNotification('Rating Required', 'Please rate your focus session to continue in Fibonacci Mode');
            return;
        }
        closeQualityDialog();
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
    
    // Ctrl+F to toggle focus mode
    if (e.key === 'f' && (e.ctrlKey || e.metaKey) && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleFocusMode();
    }
}

// Quality Dialog Management
let currentQualitySessionType = null;
let currentQualitySessionDuration = null;

function showQualityDialog(sessionType, sessionDuration) {
    if (!state.settings.qualityDialog) return;
    
    currentQualitySessionType = sessionType;
    currentQualitySessionDuration = sessionDuration;
    
    const modal = document.getElementById('qualityDialogModal');
    const message = document.getElementById('qualityDialogMessage');
    const label = document.getElementById('qualityLabel');
    const slider = document.getElementById('qualitySlider');
    const valueDisplay = document.getElementById('qualityValue');
    
    // Set message based on session type
    if (sessionType === 'focus') {
        message.textContent = 'How would you rate your focus quality during this session?';
        label.textContent = 'Focus Quality Rating';
    } else {
        message.textContent = 'How would you rate your rest quality during this break?';
        label.textContent = 'Rest Quality Rating';
    }
    
    // Reset slider to middle value
    slider.value = 5;
    valueDisplay.textContent = 5;
    
    // Add slider event listener
    slider.oninput = function() {
        valueDisplay.textContent = this.value;
    };
    
    modal.classList.add('show');
}

function submitQualityRating() {
    const slider = document.getElementById('qualitySlider');
    const quality = parseInt(slider.value);
    
    // Save quality rating
    const rating = {
        id: Date.now(),
        date: new Date().toISOString(),
        type: currentQualitySessionType,
        quality: quality,
        sessionDuration: currentQualitySessionDuration
    };
    
    state.qualityRatings.push(rating);
    
    // Adjust Fibonacci interval if in Fibonacci mode and rating is for focus session
    if (state.fibonacci.enabled && state.timerMode === 'fibonacci' && currentQualitySessionType === 'focus') {
        adjustFibonacciInterval(quality);
    }
    
    saveState();
    
    // Update quality chart if it exists
    if (qualityChart) {
        updateQualityChart();
    }
    
    closeQualityDialog();
}

function skipQualityRating() {
    // In Fibonacci mode, don't allow skipping - rating is required
    if (state.fibonacci.enabled && state.timerMode === 'fibonacci' && currentQualitySessionType === 'focus') {
        showNotification('Rating Required', 'Please rate your focus session to continue in Fibonacci Mode');
        return;
    }
    closeQualityDialog();
}

function closeQualityDialog() {
    const modal = document.getElementById('qualityDialogModal');
    modal.classList.remove('show');
    currentQualitySessionType = null;
    currentQualitySessionDuration = null;
}

// ============================================
// Fibonacci Guided Mode Functions
// ============================================

/**
 * Get current Fibonacci duration based on index
 */
function getFibonacciDuration() {
    const index = state.fibonacci.currentIndex;
    return state.fibonacci.sequence[index];
}

/**
 * Calculate break duration based on focus time (1:5 ratio)
 */
function calculateFibonacciBreak(focusMinutes) {
    // 1:5 ratio - for every 5 minutes of focus, 1 minute of break
    const breakMinutes = focusMinutes / 5;
    // Round to 1 decimal place, minimum 0.2 minutes (12 seconds)
    return Math.max(0.2, Math.round(breakMinutes * 10) / 10);
}

/**
 * Adjust Fibonacci interval based on quality rating
 */
function adjustFibonacciInterval(rating) {
    if (!state.fibonacci.enabled) return;
    
    const { decreaseThreshold, increaseThreshold } = state.fibonacci.customization;
    const maxIndex = state.fibonacci.sequence.length - 1;
    
    // Decrease if rating below threshold and not at minimum
    if (rating < decreaseThreshold && state.fibonacci.currentIndex > 0) {
        state.fibonacci.currentIndex--;
        showNotification('Fibonacci Adjusted', `Decreased to ${getFibonacciDuration()} minutes`);
    }
    // Increase if rating at max threshold and not at maximum
    else if (rating >= increaseThreshold && state.fibonacci.currentIndex < maxIndex) {
        state.fibonacci.currentIndex++;
        showNotification('Fibonacci Adjusted', `Increased to ${getFibonacciDuration()} minutes`);
    }
    // 8-9 stays same (no notification needed)
    
    // Remember last interval
    state.fibonacci.lastInterval = getFibonacciDuration();
    saveState();
}

/**
 * Toggle Fibonacci mode on/off
 */
function toggleFibonacciMode() {
    // If already in Fibonacci mode, switch to Pomodoro
    if (state.timerMode === 'fibonacci') {
        switchToPomodoro();
        return;
    }
    
    // If timer is running, ask for confirmation
    if (state.timer.isRunning) {
        if (!confirm('Timer is currently running. Do you want to switch to Fibonacci Mode? This will reset the current session.')) {
            return;
        }
        pauseTimer();
    }
    
    // First time activation - show modal
    if (!state.fibonacci.hasSeenModal) {
        state.fibonacci.hasSeenModal = true;
        openFibonacciModal();
    } else {
        // Direct activation for subsequent uses
        activateFibonacciMode();
    }
}

/**
 * Actually activate Fibonacci mode (called from modal or toggle)
 */
function activateFibonacciMode() {
    state.timerMode = 'fibonacci';
    state.fibonacci.enabled = true;
    
    // Auto-enable Quality Dialog
    if (!state.settings.qualityDialog) {
        state.settings.qualityDialog = true;
        updateToggleSwitch('qualityDialogToggle', true);
        showNotification('Quality Dialog Enabled', 'Required for Fibonacci Guided Mode');
    }
    
    // Update UI
    updateTimerModeDisplay();
    updateModeToggleButtons();
    updateSessionSettingsVisibility();
    updateFibonacciSettingsButtonVisibility();
    
    // Reset timer with Fibonacci duration
    resetTimer();
    
    saveState();
    closeFibonacciModal();
    showNotification('Fibonacci Mode Active', `Starting with ${getFibonacciDuration()} minute sessions`);
}

/**
 * Switch to Pomodoro mode
 */
function switchToPomodoro() {
    // If already in Pomodoro mode, do nothing
    if (state.timerMode === 'pomodoro') {
        return;
    }
    
    // If timer is running, ask for confirmation
    if (state.timer.isRunning) {
        if (!confirm('Timer is currently running. Do you want to switch to Pomodoro Mode? This will reset the current session.')) {
            return;
        }
        pauseTimer();
    }
    
    state.timerMode = 'pomodoro';
    state.fibonacci.enabled = false;
    
    // Update UI
    updateTimerModeDisplay();
    updateModeToggleButtons();
    updateSessionSettingsVisibility();
    updateFibonacciSettingsButtonVisibility();
    
    // Reset timer with Pomodoro duration
    resetTimer();
    
    saveState();
    showNotification('Pomodoro Mode Active', 'Using standard Pomodoro intervals');
}

/**
 * Update timer mode display (card title)
 */
function updateTimerModeDisplay() {
    const titleElement = document.getElementById('timerModeTitle');
    if (titleElement) {
        titleElement.textContent = state.timerMode === 'fibonacci'
            ? 'Fibonacci Guided Mode'
            : 'Pomodoro Timer';
    }
}

/**
 * Update mode toggle button states
 */
function updateModeToggleButtons() {
    const pomodoroBtn = document.getElementById('pomodoroModeBtn');
    const fibonacciBtn = document.getElementById('fibonacciModeBtn');
    
    if (pomodoroBtn && fibonacciBtn) {
        if (state.timerMode === 'fibonacci') {
            pomodoroBtn.classList.remove('active');
            fibonacciBtn.classList.add('active');
        } else {
            pomodoroBtn.classList.add('active');
            fibonacciBtn.classList.remove('active');
        }
    }
}

/**
 * Update session settings visibility based on mode
 */
function updateSessionSettingsVisibility() {
    const sessionSettings = document.querySelector('.session-settings');
    if (sessionSettings) {
        if (state.timerMode === 'fibonacci') {
            sessionSettings.style.display = 'none';
        } else {
            sessionSettings.style.display = 'grid';
        }
    }
}

/**
 * Update Fibonacci settings button visibility
 */
function updateFibonacciSettingsButtonVisibility() {
    const settingsBtn = document.getElementById('fibonacciSettingsBtn');
    if (settingsBtn) {
        if (state.timerMode === 'fibonacci') {
            settingsBtn.style.display = 'flex';
        } else {
            settingsBtn.style.display = 'none';
        }
    }
}

/**
 * Open Fibonacci explanation modal
 */
function openFibonacciModal() {
    const modal = document.getElementById('fibonacciModal');
    if (modal) {
        // Load current customization values
        document.getElementById('fibDecreaseThreshold').value = state.fibonacci.customization.decreaseThreshold;
        document.getElementById('fibIncreaseThreshold').value = state.fibonacci.customization.increaseThreshold;
        document.getElementById('fibMinDuration').value = state.fibonacci.customization.minDuration;
        document.getElementById('fibMaxDuration').value = state.fibonacci.customization.maxDuration;
        
        const activateBtn = document.getElementById('activateFibBtn');
        if (state.fibonacci.enabled) {
            if (activateBtn) activateBtn.style.display = 'none';
        } else {
            if (activateBtn) activateBtn.style.display = 'inline-flex';
        }
        
        modal.classList.add('show');
    }
}

/**
 * Close Fibonacci modal
 */
function closeFibonacciModal() {
    const modal = document.getElementById('fibonacciModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function showFibInfo() {
    closeFibonacciModal();
    openStorageInfo();
    switchInfoTab('fibonacci');
}

/**
 * Save Fibonacci customization settings
 */
function saveFibonacciCustomization() {
    const decreaseThreshold = parseInt(document.getElementById('fibDecreaseThreshold').value);
    const increaseThreshold = parseInt(document.getElementById('fibIncreaseThreshold').value);
    const minDuration = parseInt(document.getElementById('fibMinDuration').value);
    const maxDuration = parseInt(document.getElementById('fibMaxDuration').value);
    
    // Validation
    if (decreaseThreshold >= increaseThreshold) {
        showNotification('Invalid Settings', 'Decrease threshold must be less than increase threshold');
        return;
    }
    
    if (minDuration >= maxDuration) {
        showNotification('Invalid Settings', 'Min duration must be less than max duration');
        return;
    }
    
    // Update state
    state.fibonacci.customization.decreaseThreshold = decreaseThreshold;
    state.fibonacci.customization.increaseThreshold = increaseThreshold;
    state.fibonacci.customization.minDuration = minDuration;
    state.fibonacci.customization.maxDuration = maxDuration;
    
    // Filter sequence based on min/max
    const fullSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    state.fibonacci.sequence = fullSequence.filter(num => num >= minDuration && num <= maxDuration);
    
    // Adjust current index if needed
    if (state.fibonacci.currentIndex >= state.fibonacci.sequence.length) {
        state.fibonacci.currentIndex = state.fibonacci.sequence.length - 1;
    }
    
    saveState();
    showNotification('Settings Saved', 'Fibonacci customization updated');
}

// ============================================
// BlurControl Integration
// ============================================

/**
 * Initialize BlurControl instance
 */
function initializeBlurControl() {
    blurControl = new BlurControl({
        blurAmount: '10px',
        transition: '0.4s ease',
        backdropColor: 'rgba(0, 0, 0, 0.4)',
        highlightFocused: true,
        containerSelector: 'body'
    });
}

/**
 * Toggle focus mode - blur everything except timer
 */
function toggleFocusMode() {
    if (!blurControl) {
        initializeBlurControl();
    }
    
    const isActive = blurControl.isBlurActive();
    
    if (isActive) {
        deactivateFocusMode();
    } else {
        activateFocusMode();
    }
}

/**
 * Activate focus mode
 */
function activateFocusMode() {
    if (!blurControl) {
        initializeBlurControl();
    }
    
    // Blur everything except timer and its controls
    blurControl.activate([
        '.timer-display',
        '.timer-controls',
        '.session-settings',
        '#focusModeBtn',
        '#focusModeIndicator'
    ]);
    
    // Update button appearance
    const btn = document.getElementById('focusModeBtn');
    if (btn) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary-color)';
        btn.style.color = 'white';
    }
    
    // Show indicator
    const indicator = document.getElementById('focusModeIndicator');
    if (indicator) {
        indicator.classList.add('show');
    }
    
    // Show notification
    showNotification('Focus Mode Active', 'Press ESC or Ctrl+F to exit');
}

/**
 * Deactivate focus mode
 */
function deactivateFocusMode() {
    if (blurControl) {
        blurControl.deactivate();
    }
    
    // Update button appearance
    const btn = document.getElementById('focusModeBtn');
    if (btn) {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
    }
    
    // Hide indicator
    const indicator = document.getElementById('focusModeIndicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
}

/**
 * Focus on a specific task
 * @param {number} taskId - Task ID to focus on
 */
function focusOnTask(taskId) {
    if (!blurControl) {
        initializeBlurControl();
    }
    
    // Blur everything except the specific task and task input
    blurControl.activate([
        `.task-item[data-task-id="${taskId}"]`,
        '.task-input-group',
        '#focusModeBtn',
        '#focusModeIndicator'
    ]);
    
    // Update button and indicator
    const btn = document.getElementById('focusModeBtn');
    if (btn) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary-color)';
        btn.style.color = 'white';
    }
    
    const indicator = document.getElementById('focusModeIndicator');
    if (indicator) {
        const indicatorText = indicator.querySelector('.blur-control-indicator-text');
        if (indicatorText) {
            indicatorText.textContent = 'Task Focus Active (ESC to exit)';
        }
        indicator.classList.add('show');
    }
}

/**
 * Focus on statistics section
 */
function focusOnStats() {
    if (!blurControl) {
        initializeBlurControl();
    }
    
    blurControl.activate([
        '.stats-grid',
        '.chart-container',
        '#focusModeBtn',
        '#focusModeIndicator'
    ]);
    
    updateFocusModeUI('Stats Focus Active (ESC to exit)');
}

/**
 * Update focus mode UI elements
 * @param {string} message - Message to display in indicator
 */
function updateFocusModeUI(message) {
    const btn = document.getElementById('focusModeBtn');
    if (btn) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary-color)';
        btn.style.color = 'white';
    }
    
    const indicator = document.getElementById('focusModeIndicator');
    if (indicator) {
        const indicatorText = indicator.querySelector('.blur-control-indicator-text');
        if (indicatorText) {
            indicatorText.textContent = message;
        }
        indicator.classList.add('show');
    }
}
