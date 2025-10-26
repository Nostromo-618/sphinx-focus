# Security Implementation Guide

## Overview

Sphinx Focus now implements comprehensive security measures to protect user data, based on best practices from modern web applications.

## Encryption

### AES-GCM 256-bit Encryption
- **Algorithm**: AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Key Size**: 256 bits
- **Implementation**: Web Crypto API (native browser implementation)
- **IV**: 12-byte random initialization vector per encryption operation

### Key Management
1. **Generation**: Keys are automatically generated on first use
2. **Storage**: Keys are stored in localStorage as JSON Web Keys (JWK)
3. **Scope**: Keys are browser-specific and domain-specific
4. **Persistence**: Keys persist across sessions but not across browsers/devices

### What Gets Encrypted
- ✅ Application state (tasks, sessions, statistics)
- ✅ User settings
- ❌ Timer state (for performance, less sensitive)
- ❌ Theme preference (low sensitivity)
- ❌ Encryption key itself (stored as JWK in localStorage)

## Data Validation

### Input Sanitization
All user inputs are sanitized to prevent XSS attacks:
```javascript
// Example: Task text sanitization
function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

### Timestamp Validation
- No future dates allowed
- Reasonable past limit (2020+)
- ISO 8601 format validation

### Structure Validation
All data structures are validated before storage:
- Required fields presence
- Type checking
- Range validation for numbers
- Array length limits

## Storage Limits

### Quota Management
- **Total Storage**: 5MB soft limit
- **Tasks**: Maximum 1,000 tasks
- **Sessions**: Maximum 10,000 sessions
- **Import Files**: Maximum 10MB

### Automatic Cleanup
When limits are approached:
1. Oldest sessions are removed first
2. User is notified
3. Export is recommended

## Import/Export Security

### Export
- Plain JSON format (for portability)
- Excludes runtime state
- Sanitizes all data before export
- Users should store backups securely

### Import
Multiple validation layers:
1. **File Type**: Only .json files accepted
2. **File Size**: 10MB maximum
3. **JSON Parsing**: Validates JSON structure
4. **Data Validation**: Checks all fields
5. **Sanitization**: Cleans all imported data
6. **Deduplication**: Removes duplicate entries

## Migration Strategy

### Automatic Migration
For users upgrading from unencrypted versions:

```javascript
// Migration flow
1. Check for unencrypted data
2. Validate structure
3. Sanitize data
4. Encrypt using new service
5. Save encrypted version
6. Set migration flag
```

### Safety Features
- Non-destructive (old data preserved during migration)
- One-time operation
- Automatic detection
- Error recovery

## Threat Model

### Protected Against
✅ **XSS Attacks**: Input sanitization  
✅ **Data Tampering**: Encryption + validation  
✅ **Storage Poisoning**: Quota limits  
✅ **Malicious Imports**: File validation  
✅ **Data Corruption**: Structure validation

### Not Protected Against
❌ **Physical Access**: If attacker has browser access, they can access the encryption key  
❌ **Browser Extensions**: Malicious extensions with localStorage access  
❌ **Developer Tools**: Users can view their own data  
❌ **Cross-Device Sync**: Data doesn't sync (feature, not bug)

## Best Practices for Users

### Data Security
1. **Use HTTPS**: Ensure you're accessing via HTTPS
2. **Keep Browser Updated**: Security patches are important
3. **Export Regularly**: Create backups of your data
4. **Secure Backups**: Store exported files safely
5. **Private Browsing**: Data is session-only in private mode

### Privacy Tips
1. **Clear Data**: Use "Clear All Data" when sharing devices
2. **Export Before Clearing**: Always backup before clearing
3. **Browser Security**: Use strong browser passwords
4. **Extensions**: Be cautious with installed extensions

## Technical Details

### Encryption Flow
```
User Data → JSON.stringify() → TextEncoder → AES-GCM Encrypt → localStorage
                                                  ↓
localStorage → AES-GCM Decrypt → TextDecoder → JSON.parse() → User Data
```

### Key Storage
```
localStorage['sphinxFocusCryptoKey'] = {
  "kty": "oct",
  "k": "...", // base64-encoded key material
  "alg": "A256GCM",
  "ext": true,
  "key_ops": ["encrypt", "decrypt"]
}
```

### Encrypted Data Format
```json
{
  "iv": [123, 45, 67, ...],      // 12-byte IV array
  "data": [89, 234, 156, ...]    // Encrypted data array
}
```

## Security Updates

### Version 2.0 (Current)
- ✅ AES-GCM encryption implemented
- ✅ Input sanitization added
- ✅ Import/export validation
- ✅ Storage quota management
- ✅ Automatic migration

### Future Enhancements
- 🔄 Optional cloud backup with end-to-end encryption
- 🔄 Password-protected exports
- 🔄 Biometric authentication option
- 🔄 Advanced audit logging

## Compliance

### Data Protection
- **GDPR Compliant**: No data leaves the device
- **CCPA Compliant**: Users have full control
- **No Cookies**: No tracking cookies used
- **No Analytics**: No data collection

### Transparency
- Open source code
- Public security documentation
- No hidden data collection
- No external API calls

## Reporting Security Issues

If you discover a security vulnerability:
1. **Do Not** open a public issue
2. Email security concerns to the maintainers
3. Allow reasonable time for patches
4. Responsible disclosure appreciated

## Testing

### Security Test Scenarios
See `TESTING.md` for comprehensive test cases including:
- Encryption/decryption cycles
- Migration scenarios
- Import validation
- XSS prevention
- Quota management

---

**Last Updated**: October 2025  
**Security Version**: 2.0  
**Encryption**: AES-GCM 256-bit

