# Storage Management & Quota Handling

## Overview

Sphinx Focus now includes intelligent storage management to handle localStorage limitations and prevent data loss when storage quotas are reached.

## LocalStorage Limits

### Browser-Specific Limits

| Browser | Typical Limit |
|---------|---------------|
| Chrome/Edge | ~10MB |
| Firefox | ~10MB |
| Safari (macOS) | ~5MB |
| Safari (iOS) | ~5MB |
| Mobile Browsers | ~5MB |

### Encryption Overhead

- AES-GCM 256-bit encryption adds ~33% overhead
- 5MB of raw data becomes ~6.5MB encrypted
- Conservative limit set to 4MB to account for this

## Sphinx Focus Storage Strategy

### Current Limits (Version 2.1.1)

```javascript
MAX_STORAGE_SIZE: 4MB          // Conservative limit
WARNING_THRESHOLD: 3MB         // 75% usage warning
MAX_TASKS: 500                 // Down from 1,000
MAX_SESSIONS: 1,000            // Down from 10,000
MAX_QUALITY_RATINGS: 1,000     // Down from 10,000
DATA_RETENTION_DAYS: 90        // Auto-delete data older than 90 days
```

### Storage Usage (Estimated)

**Typical session after 1 week of use:**
- 50 sessions @ ~100 bytes each = 5KB
- 50 quality ratings @ ~80 bytes each = 4KB
- 20 tasks @ ~150 bytes each = 3KB
- **Total: ~12KB** ✅ Well within limits

**Heavy user after 3 months:**
- 500 sessions @ ~100 bytes = 50KB
- 500 quality ratings @ ~80 bytes = 40KB
- 50 tasks @ ~150 bytes = 7.5KB
- **Total: ~97.5KB** ✅ Still safe

**Edge case (hitting limits):**
- 1,000 sessions = 100KB
- 1,000 quality ratings = 80KB
- 500 tasks = 75KB
- Plus metadata, encryption overhead
- **Total: ~400-500KB** ✅ Comfortable

## What Happens When Storage Gets Full

### Automatic Protection Layers

#### Layer 1: Proactive Cleanup (75-79% usage)
- Automatic removal of data older than 90 days
- Keeps last 500 sessions and ratings
- Removes completed tasks older than 7 days
- User sees: "Storage Warning" notification

#### Layer 2: Medium Cleanup (80-89% usage)
- Keeps last 250 sessions and ratings
- Removes all completed tasks
- User sees: "Storage is X% full" notification

#### Layer 3: Aggressive Cleanup (90%+ usage)
- Keeps only last 100 sessions and ratings
- Keeps only active tasks (max 50)
- Applied automatically if save fails
- User sees: "Storage was full. Older data has been removed."

#### Layer 4: Quota Exceeded Error Handling
When `QuotaExceededError` is thrown:

```javascript
1. Catch the error
2. Apply aggressive cleanup
3. Retry save
4. If still fails:
   - Notify user
   - Suggest export and manual cleanup
```

### User Notifications

**Storage Warning (80%+):**
```
⚠️ Storage Warning
Storage is 85% full. Consider exporting and clearing old data.
```

**Storage Full (Quota Exceeded):**
```
⚠️ Storage Full
Storage was full. Older data has been removed to save new data.
```

**Critical Failure:**
```
❌ Save Error
Storage is full. Please export your data and clear old sessions.
```

## Progressive Cleanup Strategies

### Light Cleanup (75-79% usage)
```javascript
Sessions: Keep last 500
Quality Ratings: Keep last 500
Tasks: Remove completed tasks > 7 days old
Result: ~50-60% size reduction
```

### Medium Cleanup (80-89% usage)
```javascript
Sessions: Keep last 250
Quality Ratings: Keep last 250
Tasks: Remove all completed tasks
Result: ~70-75% size reduction
```

### Aggressive Cleanup (90%+ usage)
```javascript
Sessions: Keep last 100
Quality Ratings: Keep last 100
Tasks: Keep only active tasks (max 50)
Result: ~85-90% size reduction
```

## Data Retention Policy

### Automatic Deletion
- Data older than **90 days** is automatically removed
- Runs on every save operation
- No user intervention required
- Console logs cleanup actions

### What Gets Cleaned
- ✅ Old sessions (work/break records)
- ✅ Old quality ratings (focus/rest ratings)
- ❌ Tasks (never auto-deleted by age)
- ❌ Settings (always preserved)
- ❌ Skip counters (always preserved)

## Storage API

### Get Storage Information

```javascript
const info = storageService.getStorageInfo();
// Returns:
{
  withinLimit: true,
  nearingLimit: false,
  currentSize: 245760,      // bytes
  maxSize: 4194304,         // 4MB
  percentUsed: 6,           // percentage
  availableSpace: 3948544   // bytes
}
```

### Format Storage Size

```javascript
const formatted = storageService.formatBytes(245760);
// Returns: "240 KB"
```

### Save State Response

```javascript
const result = await storageService.saveState(state);
// Returns:
{
  success: true,
  cleaned: false,              // true if cleanup was applied
  quotaExceeded: false,        // true if quota was hit
  message: "...",              // user-friendly message if issues
  storageStatus: { ... }       // current storage info
}
```

## Best Practices for Users

### Regular Maintenance
1. **Export data monthly** - Use "Export Data" button
2. **Clear old sessions** - After exporting, use "Clear All Data"
3. **Complete and delete tasks** - Don't let task list grow indefinitely

### Monitoring Storage
- Watch for storage warnings in notifications
- Check console logs for cleanup actions
- Export data when warnings appear

### Data Safety
1. **Export before clearing** - Always export first
2. **Keep backups** - Store exports safely
3. **Regular exports** - Don't wait for warnings

## Technical Implementation

### Error Detection

```javascript
// Multiple ways to detect quota errors
if (error.name === 'QuotaExceededError' ||   // Standard
    error.code === 22 ||                      // Firefox
    error.code === 1014 ||                    // Safari
    error.message?.includes('quota'))          // Fallback
```

### Cleanup Priority
1. ✅ Old data (90+ days) - Always removed first
2. ✅ Oldest sessions - Keep only recent
3. ✅ Oldest ratings - Keep only recent
4. ✅ Completed tasks - Remove if needed
5. ❌ Active tasks - Never auto-removed
6. ❌ Settings - Never removed
7. ❌ Theme/disclaimer - Never removed

## Comparison: Before vs After

### Before (Version 2.1.0)
- ❌ Silent failures when storage full
- ❌ No user notifications
- ❌ Weak cleanup (sessions to 100)
- ❌ Max 10,000 sessions (could exceed quota)
- ❌ No automatic old data removal
- ❌ No storage monitoring

### After (Version 2.1.1)
- ✅ Quota errors caught and handled
- ✅ User notified of storage issues
- ✅ Progressive cleanup strategies
- ✅ Max 1,000 sessions (safer limits)
- ✅ Automatic 90-day retention policy
- ✅ Storage usage tracking

## FAQ

**Q: What if I lose data during cleanup?**
A: The app always exports data before cleanup. Use "Export Data" regularly to maintain backups.

**Q: Can I change the 90-day retention?**
A: Currently hardcoded. Future versions may add user control.

**Q: Will cleanup affect my current stats?**
A: Recent data (last 100-500 entries) is always preserved. Current day stats are never affected.

**Q: How do I see my storage usage?**
A: Open browser console and call `storageService.getStorageInfo()` or check for warning notifications.

**Q: What happens on mobile?**
A: Same limits apply. Mobile Safari has stricter 5MB limits, so cleanup may occur sooner.

**Q: Does encryption affect storage?**
A: Yes, adds ~33% overhead. This is factored into our 4MB limit.

## Summary

Sphinx Focus now intelligently manages localStorage with:

- ✅ **Automatic cleanup** when storage fills
- ✅ **User notifications** for storage issues  
- ✅ **Progressive strategies** based on usage
- ✅ **90-day retention** policy
- ✅ **Graceful error handling** for QuotaExceededError
- ✅ **Safe limits** (1,000 sessions/ratings)
- ✅ **No data loss** - cleanup is intelligent and conservative

**Result:** Users can safely use Sphinx Focus for months/years without worrying about storage limits!

