# Test Email Whitelist

## Whitelisted Emails

The following emails have **complete access** without requiring a Gumroad purchase:

- `terrep263@gmail.com` - Test account with full access

## How It Works

The whitelist is checked in `/api/auth/check-license` before checking the entitlements table. If the user's email is in the whitelist, they automatically get `licensed: true` status.

## Adding More Test Emails

To add more test emails, edit `src/app/api/auth/check-license/route.ts` and add to the `TEST_WHITELIST` array:

```typescript
const TEST_WHITELIST = [
  'terrep263@gmail.com',
  'another-test@example.com', // Add more here
];
```

## Security Note

⚠️ **This is for development/testing only!**

- Remove whitelist before production deployment
- Or move whitelist to environment variables
- Whitelisted users bypass all license checks

## Testing

1. Log in with `terrep263@gmail.com` via magic link
2. You should have full access to all features
3. No Gumroad purchase required
4. All features work normally

