/**
 * Gumroad Webhook Endpoint
 * Receives purchase, refund, and chargeback events from Gumroad
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Webhook service not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    const {
      sale_id,
      email,
      product_permalink,
      seller_id,
      refunded,
      disputed,
    } = body;

    // Normalize email to lowercase
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Missing email in webhook payload' },
        { status: 400 }
      );
    }

    // Handle refunds and chargebacks
    if (refunded === 'true' || refunded === true || disputed === 'true' || disputed === true) {
      const { error } = await supabaseAdmin
        .from('entitlements')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('gumroad_order_id', sale_id);

      if (error) {
        console.error('Error revoking entitlement:', error);
        return NextResponse.json(
          { error: 'Failed to revoke entitlement' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'revoked' });
    }

    // Handle new purchase
    const { data, error } = await supabaseAdmin
      .from('entitlements')
      .upsert(
        {
          email: normalizedEmail,
          status: 'licensed',
          gumroad_order_id: sale_id,
          purchased_at: new Date().toISOString(),
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

    return NextResponse.json({ success: true, action: 'licensed' });
  } catch (error) {
    console.error('Gumroad webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

