# Testing Guide for Sphinx Focus

## Overview

This document outlines comprehensive test scenarios for all security and functionality improvements implemented in Sphinx Focus v2.0.

## 1. Encryption Tests

### Test 1.1: Fresh Installation
**Scenario**: First time user visiting the app

**Steps**:
1. Clear all browser data
2. Open the app
3. Check localStorage for `sphinxFocusCryptoKey`
4. Add a task
5. Check localStorage for encrypted state

**Expected Results**:
- ✅ Encryption key is automatically generated
- ✅ State data in localStorage is encrypted (JSON with iv and data arrays)
- ✅ App functions normally
- ✅ Task is visible in UI

### Test 1.2: Encryption/Decryption Cycle
**Scenario**: Verify data can be encrypted and decrypted correctly

**Steps**:
1. Add multiple tasks
2. Complete some sessions
3. Refresh the page
4. Verify all data is restored

**Expected Results**:
- ✅ All tasks are restored correctly
- ✅ Session history is intact
- ✅ Statistics are accurate
- ✅ No data corruption

### Test 1.3: Encryption Key Persistence
**Scenario**: Verify encryption key persists across sessions

**Steps**:
1. Use the app and create data
2. Close the browser
3. Reopen the browser and navigate to app
4. Check data is still accessible

**Expected Results**:
- ✅ Same encryption key is used
- ✅ All data is decrypted correctly
- ✅ No re-encryption needed

---

## 2. Migration Tests

### Test 2.1: Unencrypted to Encrypted Migration
**Scenario**: User upgrading from version 1.0 (unencrypted) to 2.0 (encrypted)

**Steps**:
1. Create old format data in localStorage:
```javascript
localStorage.setItem('sphinxFocusState', JSON.stringify({
  timer: {...},
  settings: {...},
  tasks: [{id: 1, text: "Test Task", completed: false, createdAt: "..."}],
  sessions: [],
  statistics: {...}
}));
```
2. Refresh the page
3. Verify data is migrated

**Expected Results**:
- ✅ Data is automatically detected as unencrypted
- ✅ Migration occurs seamlessly
- ✅ Data is now encrypted in localStorage
- ✅ Migration flag is set
- ✅ All data is preserved
- ✅ No duplicate migration on subsequent loads

### Test 2.2: Already Migrated Detection
**Scenario**: Prevent duplicate migration

**Steps**:
1. Complete migration (Test 2.1)
2. Refresh page multiple times
3. Check migration flag

**Expected Results**:
- ✅ Migration only runs once
- ✅ Flag prevents re-migration
- ✅ No performance impact

---

## 3. Data Validation Tests

### Test 3.1: XSS Prevention
**Scenario**: Attempt to inject malicious scripts via task input

**Steps**:
1. Try to add task with HTML: `<script>alert('XSS')</script>`
2. Try to add task with HTML: `<img src=x onerror=alert('XSS')>`
3. Check stored data and rendered output

**Expected Results**:
- ✅ Scripts are sanitized
- ✅ No alert is triggered
- ✅ HTML entities are escaped
- ✅ Plain text is stored safely

### Test 3.2: Timestamp Validation
**Scenario**: Prevent invalid timestamps

**Steps**:
1. Try to import data with future timestamps
2. Try to import data with invalid date formats
3. Try to import data with dates before 2020

**Expected Results**:
- ✅ Future dates are rejected
- ✅ Invalid formats are rejected
- ✅ Very old dates are rejected
- ✅ Valid dates are accepted

### Test 3.3: Data Structure Validation
**Scenario**: Reject malformed data

**Steps**:
1. Try to import JSON missing required fields
2. Try to import JSON with wrong types
3. Try to import completely invalid structure

**Expected Results**:
- ✅ Missing fields are detected
- ✅ Type errors are caught
- ✅ User-friendly error message shown
- ✅ App remains stable

---

## 4. Import/Export Tests

### Test 4.1: Valid Export
**Scenario**: Export data successfully

**Steps**:
1. Create tasks and sessions
2. Click "Export Data"
3. Open exported JSON file

**Expected Results**:
- ✅ File downloads successfully
- ✅ JSON is valid and readable
- ✅ All data is present
- ✅ No runtime properties (isRunning, interval, etc.)
- ✅ Data is unencrypted (for portability)

### Test 4.2: Valid Import
**Scenario**: Import previously exported data

**Steps**:
1. Export data
2. Clear all data
3. Import the exported file
4. Verify restoration

**Expected Results**:
- ✅ File is accepted
- ✅ Data is validated
- ✅ All tasks restored
- ✅ All sessions restored
- ✅ Statistics updated
- ✅ Success notification shown

### Test 4.3: Invalid File Type
**Scenario**: Reject non-JSON files

**Steps**:
1. Try to import .txt file
2. Try to import .csv file
3. Try to import .exe file

**Expected Results**:
- ✅ File type error shown
- ✅ No data is modified
- ✅ App remains stable

### Test 4.4: Oversized File
**Scenario**: Reject files over 10MB

**Steps**:
1. Create a file larger than 10MB
2. Try to import it

**Expected Results**:
- ✅ Size limit error shown
- ✅ File is rejected
- ✅ No memory issues

### Test 4.5: Malicious Import
**Scenario**: Protect against malicious import data

**Steps**:
1. Try to import with XSS in task names
2. Try to import with SQL-like injection
3. Try to import with excessive data (20,000 tasks)

**Expected Results**:
- ✅ XSS is sanitized
- ✅ Injection attempts are cleaned
- ✅ Excessive data is truncated to limits
- ✅ User is notified of truncation

---

## 5. Storage Quota Tests

### Test 5.1: Approaching Quota
**Scenario**: Handle near-quota situations gracefully

**Steps**:
1. Fill localStorage to ~4.5MB
2. Try to add more sessions
3. Monitor behavior

**Expected Results**:
- ✅ Warning logged to console
- ✅ Old sessions are removed
- ✅ New data is saved
- ✅ App remains functional

### Test 5.2: Task Limit
**Scenario**: Enforce maximum task limit

**Steps**:
1. Import file with 1,500 tasks
2. Check resulting state

**Expected Results**:
- ✅ Only 1,000 most recent tasks kept
- ✅ User is notified
- ✅ No performance degradation

### Test 5.3: Session Limit
**Scenario**: Enforce maximum session limit

**Steps**:
1. Import file with 15,000 sessions
2. Check resulting state

**Expected Results**:
- ✅ Only 10,000 most recent sessions kept
- ✅ Statistics remain accurate
- ✅ Chart displays correctly

---

## 6. Disclaimer Tests

### Test 6.1: First Time User
**Scenario**: Disclaimer shown to new users

**Steps**:
1. Clear all localStorage
2. Open app
3. Observe disclaimer modal

**Expected Results**:
- ✅ Disclaimer modal is shown
- ✅ Background is blurred
- ✅ App is not interactive until accepted
- ✅ Cannot close modal without action

### Test 6.2: Accept Disclaimer
**Scenario**: User accepts disclaimer

**Steps**:
1. Trigger disclaimer (Test 6.1)
2. Click "I Agree"
3. Use app

**Expected Results**:
- ✅ Modal closes
- ✅ Background unblurs
- ✅ App becomes interactive
- ✅ Acceptance is stored
- ✅ Modal doesn't show on refresh

### Test 6.3: Decline Disclaimer
**Scenario**: User declines disclaimer

**Steps**:
1. Trigger disclaimer
2. Click "Decline"
3. Confirm in dialog

**Expected Results**:
- ✅ Confirmation dialog shown
- ✅ Warning message displayed
- ✅ Modal remains visible
- ✅ App remains blocked

---

## 7. Error Handling Tests

### Test 7.1: Corrupt Encrypted Data
**Scenario**: Handle corrupted localStorage gracefully

**Steps**:
1. Manually corrupt encrypted data in localStorage
2. Refresh page
3. Observe behavior

**Expected Results**:
- ✅ Error is caught
- ✅ Error logged to console
- ✅ App loads with default state
- ✅ User is notified
- ✅ No crash or blank screen

### Test 7.2: Missing Encryption Key
**Scenario**: Handle deleted encryption key

**Steps**:
1. Delete `sphinxFocusCryptoKey` from localStorage
2. Keep encrypted state
3. Refresh page

**Expected Results**:
- ✅ New key is generated
- ✅ Old data cannot be decrypted
- ✅ Fresh start with new data
- ✅ No errors thrown

### Test 7.3: Network Failure (CDN)
**Scenario**: Handle Chart.js CDN failure

**Steps**:
1. Block Chart.js CDN
2. Load app
3. Check statistics section

**Expected Results**:
- ✅ App still loads
- ✅ Chart section shows fallback
- ✅ Other features work normally

---

## 8. Integration Tests

### Test 8.1: Complete User Flow
**Scenario**: Full user journey from start to finish

**Steps**:
1. First time user (disclaimer)
2. Accept disclaimer
3. Add tasks
4. Start timer
5. Complete session
6. Check statistics
7. Export data
8. Clear data
9. Import data

**Expected Results**:
- ✅ All steps complete successfully
- ✅ Data persists correctly
- ✅ No errors in console
- ✅ UI updates appropriately

### Test 8.2: Theme + Data Encryption
**Scenario**: Verify theme doesn't interfere with encryption

**Steps**:
1. Add data
2. Switch themes multiple times
3. Refresh page
4. Verify data

**Expected Results**:
- ✅ Data remains encrypted
- ✅ Theme preference separate
- ✅ Both persist correctly

### Test 8.3: Timer State + Encryption
**Scenario**: Verify timer state handling

**Steps**:
1. Start timer
2. Wait 5 minutes
3. Refresh page (timer should resume)
4. Check encrypted state

**Expected Results**:
- ✅ Timer state NOT encrypted (performance)
- ✅ Main state IS encrypted
- ✅ Timer resumes correctly
- ✅ Session completes properly

---

## 9. Performance Tests

### Test 9.1: Encryption Performance
**Scenario**: Measure encryption overhead

**Steps**:
1. Time saveState() with 100 tasks
2. Compare to old unencrypted version

**Expected Results**:
- ✅ Encryption adds <5ms overhead
- ✅ No noticeable UI lag
- ✅ Acceptable performance

### Test 9.2: Large Dataset
**Scenario**: Handle large amounts of data

**Steps**:
1. Import 1,000 tasks
2. Import 10,000 sessions
3. Navigate app
4. Check responsiveness

**Expected Results**:
- ✅ Data loads in <2 seconds
- ✅ UI remains responsive
- ✅ Charts render correctly
- ✅ No browser freezing

---

## 10. Cross-Browser Tests

### Test 10.1: Browser Compatibility
**Scenario**: Verify encryption works across browsers

**Test Matrix**:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**For Each Browser**:
1. Create data
2. Export data
3. Import in different browser
4. Verify functionality

**Expected Results**:
- ✅ Encryption works in all browsers
- ✅ Exports are compatible
- ✅ No browser-specific issues

---

## Automated Testing

### Future Improvements
Consider adding:
- Unit tests for encryption service
- Unit tests for validation functions
- Integration tests with Playwright
- Performance benchmarks
- Fuzz testing for imports

---

## Test Results Log

| Test ID | Status | Date | Notes |
|---------|--------|------|-------|
| 1.1     | ⏳     | -    | Pending manual test |
| 1.2     | ⏳     | -    | Pending manual test |
| 1.3     | ⏳     | -    | Pending manual test |
| ...     | ...    | ...  | ... |

---

**Last Updated**: October 2025  
**Version**: 2.0  
**Test Coverage**: Comprehensive manual tests defined

