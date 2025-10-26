# Quick Start Guide - Testing the New Security Features

## Immediate Testing Steps

### 1. Open the App
```bash
# If you have http-server installed
npm run dev

# Or just open index.html directly in your browser
open index.html
```

### 2. First Time Experience
When you open the app, you should see:
1. **Disclaimer Modal** - Accept it to continue
2. **Normal App Interface** - Everything should work as before

### 3. Verify Encryption
Open your browser's Developer Tools (F12):

```javascript
// In Console, check for encrypted data:
localStorage.getItem('sphinxFocusState')
// You should see: {"iv":[...],"data":[...]}
// NOT plain JSON!

// Check for encryption key:
localStorage.getItem('sphinxFocusCryptoKey')
// You should see a JWK object
```

### 4. Test Basic Functionality

#### Add a Task
1. Type "Test encryption" in task input
2. Click Add
3. Task should appear
4. Check localStorage - should be encrypted

#### Complete a Pomodoro
1. Change work duration to 0.1 minutes (for quick test)
2. Start timer
3. Wait 6 seconds
4. Session should complete
5. Check localStorage - data encrypted

#### Export Data
1. Click "Export Data"
2. Open the downloaded JSON file
3. You should see PLAIN JSON (not encrypted)
4. This is correct - exports are unencrypted for portability

#### Import Data
1. Use the exported file
2. Click "Import Data"
3. Select the file
4. Data should import successfully
5. All tasks should be restored

### 5. Test Migration (Advanced)

If you want to test the migration from unencrypted to encrypted:

```javascript
// 1. Clear everything
localStorage.clear();

// 2. Add OLD format data (unencrypted)
localStorage.setItem('sphinxFocusState', JSON.stringify({
  timer: {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    mode: 'work',
    sessionCount: 0,
    totalSeconds: 1500,
    currentSeconds: 1500
  },
  settings: {
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    sound: true,
    notification: true,
    autoBreak: false,
    autoPomodoro: false
  },
  tasks: [
    {id: Date.now(), text: "Test migration task", completed: false, createdAt: new Date().toISOString()}
  ],
  sessions: [],
  statistics: {
    todayPomodoros: 0,
    todayFocusTime: 0,
    todayTasks: 0,
    currentStreak: 0,
    weeklyData: []
  }
}));

// 3. Refresh the page
location.reload();

// 4. Check if data is now encrypted
localStorage.getItem('sphinxFocusState')
// Should now be: {"iv":[...],"data":[...]}

// 5. Verify your task is still there
// Should see "Test migration task" in the UI
```

### 6. Test XSS Protection

Try to add tasks with malicious content:

```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<b onclick="alert('XSS')">Click me</b>
```

Expected: All HTML/JavaScript should be escaped and shown as plain text.

### 7. Test Import Validation

Try to import invalid files:
1. Try a .txt file → Should reject
2. Try a huge file (>10MB) → Should reject
3. Try invalid JSON → Should show error
4. Try JSON with missing fields → Should show error

### 8. Verify Theme Persistence

1. Switch to dark theme
2. Refresh page
3. Theme should persist (stored separately from encrypted data)

---

## Common Issues & Solutions

### Issue: "Encryption key not available"
**Solution**: Clear localStorage completely and refresh

### Issue: Data not persisting
**Solution**: Check browser console for errors

### Issue: Can't import old data
**Solution**: The app only imports data exported from sphinx-focus

### Issue: Disclaimer keeps showing
**Solution**: Accept the disclaimer - it only shows once

---

## Quick Visual Checks

### ✅ Everything Working:
- Disclaimer shows on first visit
- Tasks can be added and completed
- Timer works normally
- Data persists after refresh
- Export downloads a file
- Import restores data
- No console errors
- localStorage shows encrypted data

### ❌ Something Wrong:
- Console shows errors
- Data doesn't persist
- Disclaimer doesn't show
- localStorage is plain JSON (not encrypted)

---

## Next Steps

After verifying everything works:

1. **Read SECURITY.md** - Understand security implementation
2. **Read TESTING.md** - Run comprehensive tests
3. **Read IMPROVEMENTS.md** - See what changed
4. **Update your docs** - If you have additional documentation

---

## Performance Check

Open browser DevTools Performance tab:
1. Record while using the app
2. Check that encryption operations are <5ms
3. No UI blocking should occur

---

## Browser Console Checks

Look for these console messages:

### Expected (Normal Operation):
```
(none if everything is working)
```

### Expected (First Time):
```
Starting data migration to encrypted format...
Migration completed successfully
```

### Expected (If Migration Fails):
```
Error during migration: [error message]
(App should still work with fresh state)
```

### NOT Expected (Problems):
```
Uncaught TypeError: ...
Encryption key not available
Failed to load state: ...
(These indicate bugs to fix)
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Disclaimer modal works
- [ ] Encryption is active
- [ ] Data persists across refreshes
- [ ] Export/Import works
- [ ] Theme persists
- [ ] Timer works correctly
- [ ] No console errors
- [ ] Migration tested
- [ ] XSS protection verified
- [ ] Import validation works
- [ ] Mobile responsive (test on phone)
- [ ] All browsers tested (Chrome, Firefox, Safari)

---

## Need Help?

Check these files:
- **SECURITY.md** - Security implementation details
- **TESTING.md** - Comprehensive test scenarios
- **IMPROVEMENTS.md** - What changed and why
- **README.md** - General usage instructions

---

**Remember**: The encryption is transparent to users. They shouldn't notice any difference except:
1. Disclaimer on first visit (one-time)
2. Data is now secure
3. Slightly larger localStorage usage (encryption overhead)

Everything else should work exactly as before! 🎉

