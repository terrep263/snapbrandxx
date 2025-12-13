# Sprint 4: API Reference

Quick reference for testing the sessions API endpoints.

## Endpoints

### 1. Upload Images
**POST** `/api/sessions/upload`

**Headers:**
```
Authorization: Bearer <user_access_token>
```

**Body:** `multipart/form-data`
- `images`: File[] (multiple image files)

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/sessions/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"
```

**Response:**
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "image_count": 3,
    "expires_at": "2024-01-02T12:00:00.000Z",
    "images": [
      "https://...signed-url-1...",
      "https://...signed-url-2...",
      "https://...signed-url-3..."
    ]
  }
}
```

---

### 2. Get Current Session
**GET** `/api/sessions/current`

**Headers:**
```
Authorization: Bearer <user_access_token>
```

**Example (cURL):**
```bash
curl -X GET http://localhost:3000/api/sessions/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200 OK):**
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "image_count": 3,
    "expires_at": "2024-01-02T12:00:00.000Z",
    "images": [
      "https://...signed-url-1...",
      "https://...signed-url-2...",
      "https://...signed-url-3..."
    ]
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "No active session"
}
```

---

### 3. Cleanup Expired Sessions
**GET** or **POST** `/api/cron/cleanup`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Example (cURL):**
```bash
curl -X GET http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response:**
```json
{
  "message": "Cleanup complete",
  "deleted": 3,
  "total": 3
}
```

**Response (no expired sessions):**
```json
{
  "message": "No expired sessions",
  "deleted": 0
}
```

---

## Testing Workflow

### 1. Upload Test Images
```bash
# Get access token from browser (check localStorage or network tab)
TOKEN="your_access_token_here"

# Upload images
curl -X POST http://localhost:3000/api/sessions/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@test1.jpg" \
  -F "images=@test2.jpg"
```

### 2. Check Current Session
```bash
curl -X GET http://localhost:3000/api/sessions/current \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Single Session Model
```bash
# Upload first batch
curl -X POST http://localhost:3000/api/sessions/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@batch1.jpg"

# Upload second batch (should delete first batch)
curl -X POST http://localhost:3000/api/sessions/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@batch2.jpg"
```

### 4. Test Cleanup
```bash
# First, manually expire a session in database:
# UPDATE user_sessions SET expires_at = NOW() - interval '1 hour' WHERE id = 'session-id';

# Then run cleanup
CRON_SECRET="your_cron_secret"
curl -X GET http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## JavaScript/TypeScript Examples

### Upload Images (Frontend)
```typescript
async function uploadImages(files: File[]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  const response = await fetch('/api/sessions/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.session;
}
```

### Get Current Session (Frontend)
```typescript
async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch('/api/sessions/current', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 404) {
    return null; // No active session
  }

  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }

  const data = await response.json();
  return data.session;
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing files, invalid data)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (no active session)
- `500` - Internal Server Error

---

## Notes

- Signed URLs expire after 1 hour
- Sessions expire after 24 hours
- Only one active session per user
- File size limit: 10 MB per file (configurable)
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

