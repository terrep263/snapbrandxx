/**
 * License Check API Endpoint
 * Server-side verification of user's license status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for license check');
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

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'License check service not configured' },
      { status: 500 }
    );
  }

  // Get user from session token
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify user session
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user || !user.email) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Whitelist for testing (bypass license check)
  const TEST_WHITELIST = [
    'terrep263@gmail.com',
  ];
  
  const userEmail = user.email.toLowerCase();
  const isWhitelisted = TEST_WHITELIST.includes(userEmail);
  
  if (isWhitelisted) {
    console.log(`Whitelisted user accessed: ${userEmail}`);
    return NextResponse.json({
      licensed: true,
      status: 'whitelisted',
    });
  }

  // Check entitlement
  const { data: entitlement, error: entitlementError } = await supabaseAdmin
    .from('entitlements')
    .select('status')
    .eq('email', userEmail)
    .single();

  if (entitlementError && entitlementError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    console.error('Error checking entitlement:', entitlementError);
    return NextResponse.json(
      { error: 'Failed to check license' },
      { status: 500 }
    );
  }

  const licensed = entitlement?.status === 'licensed';

  return NextResponse.json({
    licensed,
    status: entitlement?.status || 'none',
  });
}

// Only allow GET
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

