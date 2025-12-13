/**
 * Gumroad Webhook Endpoint
 * Receives purchase, refund, and chargeback events from Gumroad
 * 
 * Security:
 * - Optional signature verification (if Gumroad sends x-gumroad-signature header)
 * - Alternative: Secret URL parameter (GUMROAD_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.GUMROAD_WEBHOOK_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for webhook');
}

// Create admin client with service role key (server-side only)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Verify Gumroad webhook signature (if provided)
 * Note: Gumroad may not always send signatures - check their latest API docs
 */
function verifyGumroadSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false; // Can't verify without both
  }

  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Webhook service not configured' },
      { status: 500 }
    );
  }

  // Security: Verify secret URL parameter if provided
  const urlSecret = request.nextUrl.searchParams.get('secret');
  if (webhookSecret && urlSecret && urlSecret !== webhookSecret) {
    console.error('Invalid webhook secret in URL parameter');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get raw body text (form-encoded, not JSON)
    const rawBody = await request.text();
    
    // Parse form-encoded data
    const params = new URLSearchParams(rawBody);
    
    // Convert to object
    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }
    
    console.log('Gumroad webhook received:', data);
    
    // Optional: Verify signature from header (if Gumroad sends it)
    const signature = request.headers.get('x-gumroad-signature');
    if (signature && webhookSecret) {
      const isValid = verifyGumroadSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Extract key fields from form data
    const {
      sale_id,
      email,
      product_permalink,
      seller_id,
      refunded,
      disputed,
      price,
      currency,
    } = data;

    // Normalize email to lowercase
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Missing email in webhook payload' },
        { status: 400 }
      );
    }

    // Handle refunds and chargebacks
    // Gumroad sends "true" or "false" as strings
    const isRevoked = refunded === 'true' || disputed === 'true';
    
    if (isRevoked) {
      // Update or create entitlement with revoked status
      const { error } = await supabaseAdmin
        .from('entitlements')
        .upsert(
          {
            email: normalizedEmail,
            status: 'revoked',
            gumroad_order_id: sale_id,
            revoked_at: new Date().toISOString(),
            purchased_at: null, // Clear purchase date on revocation
          },
          {
            onConflict: 'email',
          }
        );

      if (error) {
        console.error('Error revoking entitlement:', error);
        return NextResponse.json(
          { error: 'Failed to revoke entitlement' },
          { status: 500 }
        );
      }

      console.log(`Entitlement revoked for ${normalizedEmail} (sale_id: ${sale_id})`);
      return NextResponse.json({ success: true, action: 'revoked' });
    }

    // Handle new purchase
    const { error } = await supabaseAdmin
      .from('entitlements')
      .upsert(
        {
          email: normalizedEmail,
          status: 'licensed',
          gumroad_order_id: sale_id,
          purchased_at: new Date().toISOString(),
          revoked_at: null, // Clear revocation date on new purchase
        },
        {
          onConflict: 'email',
        }
      );

    if (error) {
      console.error('Error creating/updating entitlement:', error);
      return NextResponse.json(
        { error: 'Failed to process entitlement' },
        { status: 500 }
      );
    }

    // Try to link to existing user
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const matchingUser = usersData?.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (matchingUser) {
      await supabaseAdmin
        .from('entitlements')
        .update({ user_id: matchingUser.id })
        .eq('email', normalizedEmail);
    }

    console.log(`Entitlement licensed for ${normalizedEmail} (sale_id: ${sale_id})`);
    return NextResponse.json({ success: true, action: 'licensed' });
  } catch (error) {
    console.error('Gumroad webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

