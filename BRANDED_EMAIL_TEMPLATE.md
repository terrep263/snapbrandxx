# Branded Magic Link Email Template

## How to Customize in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Select **Magic Link** template
4. Customize the template below

## Custom Branded Template

### Subject Line
```
Your SnapBrandXX Login Link
```

### Email Body (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; background-color: #FAFAFA; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #C42A2A 0%, #9E2222 100%); padding: 30px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: bold; font-family: 'Courier New', monospace;">
                SnapBrandXX
              </h1>
              <p style="color: #FFFFFF; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
                Professional Watermarking Platform
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1A1A1A; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Welcome to SnapBrandXX
              </h2>
              
              <p style="color: #4B5563; margin: 0 0 20px 0; font-size: 16px;">
                Click the button below to securely log in to your workspace:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #C42A2A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Log In to SnapBrandXX
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="color: #6B7280; margin: 20px 0 0 0; font-size: 14px; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #C42A2A; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <!-- Expiry Notice -->
              <div style="margin-top: 30px; padding: 16px; background-color: #F5E6E6; border-left: 4px solid #C42A2A; border-radius: 4px;">
                <p style="color: #9E2222; margin: 0; font-size: 14px; font-weight: 500;">
                  ⏱️ This link will expire in 1 hour for security.
                </p>
              </div>
              
              <!-- Security Note -->
              <p style="color: #6B7280; margin: 30px 0 0 0; font-size: 13px; line-height: 1.6;">
                If you didn't request this login link, you can safely ignore this email. 
                Your account remains secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 13px;">
                <strong>SnapBrandXX</strong> - Brand every image once, perfectly, at scale
              </p>
              <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                © 2024 SnapBrandXX. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Plain Text Version (Fallback)

```
Welcome to SnapBrandXX

Click the link below to securely log in to your workspace:

{{ .ConfirmationURL }}

This link will expire in 1 hour for security.

If you didn't request this login link, you can safely ignore this email. 
Your account remains secure.

---
SnapBrandXX - Brand every image once, perfectly, at scale
© 2024 SnapBrandXX. All rights reserved.
```

## Supabase Template Variables

Supabase provides these variables you can use:

- `{{ .ConfirmationURL }}` - The magic link URL (required)
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The token (usually not needed)
- `{{ .TokenHash }}` - Hashed token (usually not needed)

## Steps to Apply

1. **Go to Supabase Dashboard**
   - Your Project → Authentication → Email Templates

2. **Select "Magic Link" Template**

3. **Replace the default template** with the HTML above

4. **Save the template**

5. **Test it**
   - Send a test magic link
   - Check your email
   - Verify branding appears correctly

## Customization Options

You can customize:
- **Colors**: Change `#C42A2A` (brand-red) to your preferred color
- **Logo**: Add an image URL in the header section
- **Fonts**: Adjust font-family in the style tags
- **Layout**: Modify padding, spacing, etc.
- **Copy**: Change the text to match your brand voice

## Preview

The email will look like:
- **Header**: Red gradient with "SnapBrandXX" branding
- **Content**: Clean, professional layout
- **CTA Button**: Red "Log In to SnapBrandXX" button
- **Footer**: Simple footer with copyright

## Testing

After saving:
1. Go to `/login`
2. Enter your email
3. Check your inbox
4. Verify the branded email appears

The email should now match your SnapBrandXX branding instead of the default Supabase template!

