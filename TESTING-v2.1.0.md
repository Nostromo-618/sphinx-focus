# Testing Guide for Version 2.1.0 - Quality Dialog Feature

## Overview
Version 2.1.0 introduces the Quality Dialog feature, which allows users to rate their focus and rest quality after each pomodoro session.

## Development Server
The development server is running at: http://localhost:3000

## Pre-Testing Checklist
- [x] Branch created: `dev-new-features`
- [x] Version bumped to 2.1.0
- [x] All code changes committed
- [x] No linter errors
- [x] Development server started

## Testing Scenarios

### 1. Quality Dialog - Focus Session
**Steps:**
1. Open http://localhost:3000
2. Accept the disclaimer if shown
3. Start a focus session (reduce duration to 1 minute for testing)
4. Wait for session to complete
5. Observe quality dialog appears after ~500ms

**Expected Results:**
- ✅ Dialog shows "Rate Your Session Quality"
- ✅ Message says "How would you rate your focus quality during this session?"
- ✅ Label shows "Focus Quality Rating"
- ✅ Slider ranges from 1-10, default at 5
- ✅ Value display updates in real-time when moving slider
- ✅ Submit and Skip buttons are visible

**Test Actions:**
- [ ] Move slider and verify value display updates
- [ ] Click Submit - verify dialog closes
- [ ] Check Quality Trends chart updates with new data point

### 2. Quality Dialog - Rest Session
**Steps:**
1. Complete a focus session (submit a rating)
2. Start the break session
3. Wait for break to complete
4. Observe quality dialog appears

**Expected Results:**
- ✅ Dialog shows with rest-specific message
- ✅ Message says "How would you rate your rest quality during this break?"
- ✅ Label shows "Rest Quality Rating"
- ✅ Slider works correctly
- ✅ Submit saves rest quality data

**Test Actions:**
- [ ] Rate the rest session (different value than focus)
- [ ] Verify chart now shows both focus and rest lines

### 3. Quality Dialog - Skip Functionality
**Steps:**
1. Complete another session
2. When quality dialog appears, click "Skip"

**Expected Results:**
- ✅ Dialog closes immediately
- ✅ No rating is saved
- ✅ Chart does not add new data point
- ✅ Statistics remain unchanged

### 4. Quality Chart Visualization
**Steps:**
1. Complete 3-4 sessions with ratings
2. Navigate to Quality Trends section
3. Examine the chart

**Expected Results:**
- ✅ Chart shows two lines: Focus (blue) and Rest (green)
- ✅ Data points plotted at correct timestamps
- ✅ Y-axis ranges from 0-10
- ✅ X-axis shows date/time labels
- ✅ Legend shows "Focus Quality" and "Rest Quality"
- ✅ Tooltips work on hover
- ✅ Chart is responsive

### 5. Quality Statistics
**Steps:**
1. With several ratings recorded, check the stats

**Expected Results:**
- ✅ Avg Focus Quality shows correct average (e.g., 7.5)
- ✅ Avg Rest Quality shows correct average
- ✅ Total Ratings shows correct count
- ✅ Values update in real-time after new ratings

### 6. Empty State
**Steps:**
1. Clear all data (Settings > Clear All Data)
2. Check Quality Trends section

**Expected Results:**
- ✅ Chart is hidden
- ✅ Empty state message appears
- ✅ Icon and text: "No quality ratings yet. Complete a session to start tracking!"
- ✅ Statistics show "-" or "0"

### 7. Settings Toggle
**Steps:**
1. Open Settings
2. Find "Quality Tracking" section
3. Toggle "Quality Dialog" off

**Expected Results:**
- ✅ Toggle switch turns off
- ✅ Disclaimer text is visible and helpful
- ✅ Complete a session - no quality dialog appears
- ✅ Toggle back on - quality dialog appears again

### 8. Theme Switching
**Steps:**
1. With quality data visible
2. Switch between Light/Dark/System themes

**Expected Results:**
- ✅ Quality dialog adapts to theme
- ✅ Chart colors remain readable
- ✅ Stats display correctly in both themes
- ✅ Slider maintains visual consistency

### 9. Data Export
**Steps:**
1. Have several quality ratings recorded
2. Click "Export Data"
3. Open exported JSON file

**Expected Results:**
- ✅ File downloads successfully
- ✅ JSON contains `qualityRatings` array
- ✅ Each rating has: id, date, type, quality, sessionDuration
- ✅ All ratings are present

### 10. Data Import
**Steps:**
1. Clear all data
2. Import the previously exported file

**Expected Results:**
- ✅ Import succeeds
- ✅ Quality ratings are restored
- ✅ Chart displays correctly
- ✅ Statistics are accurate

### 11. Backward Compatibility
**Steps:**
1. Create export file without quality ratings (mock v2.0 format)
2. Import it

**Expected Results:**
- ✅ Import succeeds without errors
- ✅ App handles missing qualityRatings gracefully
- ✅ Empty state shown for quality section

### 12. Auto-Start Interaction
**Steps:**
1. Enable "Auto-start Breaks" in settings
2. Enable "Quality Dialog" in settings
3. Complete a focus session

**Expected Results:**
- ✅ Quality dialog appears
- ✅ Break timer auto-starts (after 2s delay)
- ✅ User can still rate before break starts
- ✅ Dialog doesn't block timer functionality

### 13. Storage & Encryption
**Steps:**
1. Complete several sessions with ratings
2. Open DevTools > Application > Local Storage
3. Find `sphinxFocusState` key

**Expected Results:**
- ✅ Value is encrypted (looks like random string)
- ✅ Not readable in plain text
- ✅ Same security as other data

### 14. Page Refresh Persistence
**Steps:**
1. Add quality ratings
2. Refresh the page
3. Check Quality Trends section

**Expected Results:**
- ✅ All quality ratings persist
- ✅ Chart displays correctly
- ✅ Statistics are accurate
- ✅ Settings state maintained

### 15. Timer Resume with Quality Dialog
**Steps:**
1. Start a timer
2. Refresh page mid-session
3. Let timer complete

**Expected Results:**
- ✅ Timer resumes correctly
- ✅ Quality dialog appears on completion
- ✅ No duplicate dialogs
- ✅ Rating saves correctly

### 16. Mobile Responsiveness
**Steps:**
1. Open in mobile view (DevTools > Device toolbar)
2. Complete a session
3. Interact with quality dialog

**Expected Results:**
- ✅ Dialog fits screen properly
- ✅ Slider is touch-friendly
- ✅ Buttons are accessible
- ✅ Chart is responsive

### 17. Changelog Display
**Steps:**
1. Click version badge in header
2. Review changelog modal

**Expected Results:**
- ✅ Version 2.1.0 shows as "Current"
- ✅ All new features listed
- ✅ Quality Dialog feature described
- ✅ Chart feature mentioned
- ✅ Professional formatting

### 18. Long-term Usage
**Steps:**
1. Add 20+ quality ratings over multiple sessions
2. Check performance

**Expected Results:**
- ✅ Chart remains responsive
- ✅ No performance degradation
- ✅ Data saves correctly
- ✅ Statistics calculate accurately

### 19. Edge Cases
**Test scenarios:**
- [ ] Set slider to 1, submit
- [ ] Set slider to 10, submit
- [ ] Rapidly complete multiple sessions
- [ ] Skip 5 sessions in a row
- [ ] Mix of submitting and skipping

**Expected Results:**
- ✅ All edge cases handled gracefully
- ✅ No errors in console
- ✅ Data integrity maintained

### 20. Existing Features Validation
**Verify nothing broke:**
- [ ] Timer functions normally
- [ ] Tasks work correctly
- [ ] Statistics update properly
- [ ] Session history displays
- [ ] Export/Import works
- [ ] Notifications appear
- [ ] Sound plays
- [ ] Keyboard shortcuts work

## Bug Reporting
If you find any issues:
1. Note the steps to reproduce
2. Check browser console for errors
3. Verify in both light and dark themes
4. Test in different browsers if possible

## Known Limitations
- Maximum 10,000 quality ratings stored
- Quality dialog appears for all session types (work, break, long break)
- No historical filtering yet (shows all ratings)

## Success Criteria
All 20 test scenarios should pass before merging to main branch.

## Next Steps After Testing
1. ✅ All tests passing
2. Document any issues found
3. Fix critical bugs
4. Test fixes
5. Ready for merge to main

---

**Testing Date:** ___________
**Tester:** ___________
**Browser:** ___________
**OS:** ___________
**Result:** ⬜ PASS  ⬜ FAIL  ⬜ PARTIAL

**Notes:**
_______________________
_______________________
_______________________

