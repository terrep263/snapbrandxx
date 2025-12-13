# Testing the Cleanup Endpoint

## Current CRON_SECRET
```
cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf
```

## Test Command

### Using curl (if available):
```bash
curl -X GET http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf"
```

### Using PowerShell:
```powershell
$headers = @{
    "Authorization" = "Bearer cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf"
}
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/cron/cleanup" -Method GET -Headers $headers
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
```

### Using Browser/Postman:
- **URL**: `http://localhost:3000/api/cron/cleanup`
- **Method**: GET
- **Headers**:
  - `Authorization`: `Bearer cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf`

## Expected Responses

### Success (200 OK):
```json
{
  "message": "No expired sessions",
  "deleted": 0
}
```
or
```json
{
  "message": "Cleanup complete",
  "deleted": 3,
  "total": 3
}
```

### Unauthorized (401):
```json
{
  "error": "Unauthorized",
  "details": {
    "hasSecret": true,
    "receivedHeader": "present",
    "expectedFormat": "Bearer <CRON_SECRET>"
  }
}
```

## Troubleshooting

1. **Check server console logs** - The debug output will show:
   - Whether CRON_SECRET is loaded
   - What Authorization header was received
   - Whether they match

2. **Verify .env.local**:
   ```bash
   Get-Content .env.local | Select-String "^CRON_SECRET="
   ```
   Should show: `CRON_SECRET=cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf`

3. **Restart dev server** if you just added CRON_SECRET:
   - Stop server (Ctrl+C)
   - Start: `npm run dev`

4. **Check Authorization header format**:
   - Must be exactly: `Bearer <secret>` (with space after "Bearer")
   - No extra spaces or quotes

## Debug Output

The server console will now show debug information like:
```
CRON_SECRET check: {
  hasCronSecret: true,
  cronSecretLength: 64,
  authHeader: 'Bearer cf0879bf429c0280...',
  expectedHeader: 'Bearer cf0879bf429c0280...',
  match: true/false
}
```

Check this output to see what's happening!

