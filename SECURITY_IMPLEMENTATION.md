# Security Implementation Guide

## Rate Limiting & CSRF Protection

This document describes the security features implemented in the Cherekh Center website.

---

## ✅ **Rate Limiting**

### **Implementation**
- **Location**: `src/utils/rateLimiter.ts`
- **Type**: Client-side rate limiting with localStorage persistence

### **Features**
- Configurable rate limits per action type
- Automatic cleanup of expired records
- Persistent storage across page reloads
- Throttle and debounce utilities

### **Rate Limit Presets**

| Action | Limit | Window |
|--------|------|--------|
| **Booking Form** | 5 submissions | 1 hour |
| **Contact Form** | 10 submissions | 1 hour |
| **Admin Login** | 5 attempts | 15 minutes |
| **API Calls** | 100 requests | 1 minute |

### **Usage Example**
```typescript
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  try {
    await withRateLimit(RateLimitPresets.BOOKING_FORM, async () => {
      // Your form submission logic here
      await submitBooking(formData)
    })
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      alert(error.message)
    }
  }
}
```

### **Custom Rate Limits**
```typescript
await withRateLimit({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  key: 'custom_action',
}, async () => {
  // Your action
})
```

---

## ✅ **CSRF Protection**

### **Implementation**
- **Location**: `src/utils/csrf.ts`
- **Type**: Client-side CSRF token generation and validation

### **Features**
- Secure random token generation (32 bytes)
- Token expiration (24 hours)
- Origin validation
- Referrer validation
- Automatic token refresh

### **CSRF Token Lifecycle**
1. **Generation**: Token generated on first use
2. **Storage**: Stored in localStorage with expiration
3. **Validation**: Checked on every form submission
4. **Refresh**: Auto-refreshed when expired

### **Usage Example**
```typescript
import { getCSRFToken, validateFormSubmission, createProtectedFormData } from '../utils/csrf'

// In your form component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Add CSRF token to form data
  const protectedData = createProtectedFormData(formData)
  
  // Validate submission
  if (!validateFormSubmission(protectedData)) {
    alert('Security validation failed. Please refresh the page.')
    return
  }
  
  // Proceed with submission
  await submitForm(protectedData)
}

// In your form JSX
<form onSubmit={handleSubmit}>
  <input type="hidden" name="_csrf" value={getCSRFToken()} />
  {/* Other form fields */}
</form>
```

### **Validation Checks**
1. **Origin Check**: Validates request comes from allowed origins
2. **Referrer Check**: Validates referrer is same-origin
3. **Token Check**: Validates CSRF token matches and is not expired

### **Allowed Origins**
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`
- `https://cherekhresort.com`
- `https://www.cherekhresort.com`

---

## 🔒 **Protected Forms**

The following forms now have rate limiting and CSRF protection:

1. **Room Booking Form** (`/booking`)
   - Rate limit: 5 submissions/hour
   - CSRF token included

2. **Conference Room Booking** (`/conference-room/booking`)
   - Rate limit: 5 submissions/hour
   - CSRF token included

3. **Contact Form** (`/contact`)
   - Rate limit: 10 submissions/hour
   - CSRF token included

4. **Admin Login** (`/login`)
   - Rate limit: 5 attempts/15 minutes
   - CSRF token included

---

## 🚀 **Backend Integration (Future)**

When you integrate with a backend (Supabase recommended), you'll need to:

### **Rate Limiting**
- Move rate limiting to backend middleware
- Use Redis or database for distributed rate limiting
- Implement IP-based rate limiting

### **CSRF Protection**
- Generate tokens on the server
- Store tokens in HTTP-only cookies
- Validate tokens on the server side
- Use SameSite cookie attribute

### **Example Backend Integration**
```typescript
// Backend API call with CSRF-protected body (token in `_csrf` field)
const protectedData = createProtectedFormData(formData)
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(protectedData),
})
```

---

## 📊 **Security Status**

| Feature | Status | Notes |
|---------|--------|-------|
| **Client-Side Rate Limiting** | ✅ Implemented | Works for current localStorage setup |
| **CSRF Token Generation** | ✅ Implemented | Secure random tokens |
| **CSRF Token Validation** | ✅ Implemented | Origin + Referrer + Token checks |
| **Form Protection** | ✅ Implemented | All forms protected |
| **Backend Rate Limiting** | ⚠️ Pending | Requires backend integration |
| **Server-Side CSRF** | ⚠️ Pending | Requires backend integration |

---

## 🔐 **Best Practices**

1. **Never disable rate limiting** - It's your first line of defense
2. **Always validate CSRF tokens** - Even for internal APIs
3. **Rotate tokens regularly** - Current: 24 hours
4. **Monitor rate limit violations** - Log suspicious activity
5. **Use HTTPS in production** - Required for secure cookies

---

## 📝 **Notes**

- Current implementation is **client-side only** and suitable for development
- For production, **backend integration is required** for true security
- Rate limits can be adjusted in `RateLimitPresets` object
- CSRF tokens auto-expire after 24 hours
- All security features work seamlessly with existing forms

---

*Last Updated: January 2025*

