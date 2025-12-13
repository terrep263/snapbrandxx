# Sprint 4: Storage & Sessions Setup Guide

This guide walks you through setting up the temporary image storage system with 24-hour TTL.

## Prerequisites

- Sprint 0-3 complete (landing, auth, licensing, designs page)
- Supabase project configured
- Environment variables set up

## Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase-migrations.sql` (starting from the SPRINT 4 section)
4. Run the migration to create the `user_sessions` table

The migration includes:
- `user_sessions` table with proper indexes
- RLS policies for user access
- Cleanup function for expired sessions

## Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `user-sessions`
   - **Public**: NO (private bucket - required for signed URLs)
   - **File size limit**: 10 MB per file (adjust as needed)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`

4. Click **Create bucket**

## Step 3: Configure Storage RLS Policies

After creating the bucket, you need to add RLS policies. Run this SQL in the Supabase SQL Editor:

```sql
-- Users can only upload to their own folder
CREATE POLICY "Users can upload to own session folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-sessions' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can only read from their own folder
CREATE POLICY "Users can read own session files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-sessions' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can only delete from their own folder
CREATE POLICY "Users can delete own session files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-sessions' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

## Step 4: Environment Variables

Add to your `.env.local` file:

```bash
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# NEW - For cron job (if using Vercel approach)
CRON_SECRET=random_secret_string_here
```

**Important**: Generate a secure random string for `CRON_SECRET`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Configure Vercel Cron (If Deploying to Vercel)

The `vercel.json` file is already configured with the cleanup cron job. When you deploy to Vercel:

1. The cron job will automatically be set up
2. It will call `/api/cron/cleanup` every hour
3. Make sure `CRON_SECRET` is set in your Vercel environment variables

### Manual Cron Setup (Alternative)

If you're not using Vercel, you can:

1. **Use Supabase pg_cron** (if available):
   - Uncomment the pg_cron section in `supabase-migrations.sql`
   - Run it in Supabase SQL Editor

2. **Use external cron service**:
   - Set up a cron job to call `https://your-domain.com/api/cron/cleanup`
   - Include header: `Authorization: Bearer YOUR_CRON_SECRET`

## Step 6: Test the Implementation

### Test 1: Upload and Session Creation

1. Create a file upload UI or use the API directly
2. Upload 5 test images via POST to `/api/sessions/upload`
3. Check database - verify session record exists
4. Check Supabase Storage - verify files exist in `users/{user_id}/sessions/{session_id}/originals/`
5. Verify `expires_at` is 24 hours from now

### Test 2: Single Session Model

1. Upload batch of images (creates session A)
2. Note session A ID
3. Upload different batch (creates session B)
4. Check database - session A should be deleted
5. Check storage - session A folder should be deleted

### Test 3: Session Resume

1. Upload images
2. Go to My Designs page (`/app/designs`)
3. "Resume Last Session" button should appear
4. Shows correct image count and expiry time
5. Click button - should navigate to editor with session ID

### Test 4: TTL Cleanup (Manual)

1. Create a session
2. Manually update `expires_at` to past:
   ```sql
   UPDATE user_sessions 
   SET expires_at = NOW() - interval '1 hour'
   WHERE id = 'session-id';
   ```
3. Call cleanup endpoint: `GET /api/cron/cleanup` with `Authorization: Bearer YOUR_CRON_SECRET`
4. Verify session deleted from database
5. Verify storage files deleted

### Test 5: Signed URL Expiry

1. Get signed URL for an image (from upload response)
2. Wait 61 minutes
3. Try to access URL
4. Should return 403/expired error

## API Endpoints

### POST `/api/sessions/upload`

Upload images and create a new session.

**Headers:**
```
Authorization: Bearer <user_access_token>
Content-Type: multipart/form-data
```

**Body:**
- `images`: File[] (multiple image files)

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "image_count": 5,
    "expires_at": "2024-01-01T12:00:00Z",
    "images": ["signed_url_1", "signed_url_2", ...]
  }
}
```

### GET `/api/sessions/current`

Get user's active session (not expired).

**Headers:**
```
Authorization: Bearer <user_access_token>
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "image_count": 5,
    "expires_at": "2024-01-01T12:00:00Z",
    "images": ["signed_url_1", "signed_url_2", ...]
  }
}
```

**404** if no active session exists.

### GET `/api/cron/cleanup`

Cleanup expired sessions (called by cron).

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "message": "Cleanup complete",
  "deleted": 3,
  "total": 3
}
```

## Common Issues & Solutions

### Files not uploading?

- Check file size limits in Supabase bucket settings (default: 10 MB)
- Verify MIME types are allowed (`image/jpeg`, `image/png`, `image/webp`)
- Check RLS policies on storage bucket
- Ensure service role key is set correctly

### Session not deleting?

- Check cleanup function runs successfully
- Verify `expires_at` is in the past
- Check storage deletion permissions
- Look for errors in logs

### Signed URLs not working?

- Verify bucket is private (not public)
- Check URL hasn't expired (1 hour limit)
- Ensure user has access permissions
- Regenerate signed URLs if needed

### Cleanup not running automatically?

- Verify cron job is configured in Vercel
- Check Vercel cron logs
- Ensure `CRON_SECRET` is set correctly
- Test manually by calling the endpoint

### Storage RLS policies not working?

- Verify bucket name matches exactly: `user-sessions`
- Check folder structure: `users/{user_id}/sessions/{session_id}/...`
- Ensure user is authenticated
- Test with service role key to bypass RLS for debugging

## Security Checklist

- [ ] Storage bucket is private (not public)
- [ ] RLS policies prevent cross-user access
- [ ] Signed URLs have short expiry (1 hour)
- [ ] Service role key only used server-side
- [ ] Cleanup endpoint protected (cron secret)
- [ ] File uploads validated (size, type)
- [ ] User authentication required for all endpoints

## Performance Considerations

- Batch file uploads (don't upload one at a time)
- Use streaming for large files if needed
- Cleanup runs hourly - not after every upload
- Signed URL generation is fast (< 100ms per URL)
- Indexes on `user_id` and `expires_at` for fast queries

## Next Steps

After this sprint is complete and tested, proceed to:
**Sprint 5: Normalized Coordinates & Export**

This will ensure designs scale correctly across different image sizes.

## Notes

- 24-hour TTL balances UX and cost control
- Single session model keeps implementation simple
- Signed URLs prevent unauthorized access
- Cleanup is critical - test thoroughly
- Storage costs can add up - monitor usage in Supabase dashboard

