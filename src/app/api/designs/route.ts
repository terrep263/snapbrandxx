/**
 * Designs API Route
 * Handles GET (list designs) and POST (create design)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for designs API');
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
      { error: 'Designs API not configured' },
      { status: 500 }
    );
  }

  // Get authenticated user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // List user's designs
  const { data, error } = await supabaseAdmin
    .from('user_designs')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching designs:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ designs: data || [] });
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Designs API not configured' },
      { status: 500 }
    );
  }

  // Get authenticated user
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Parse request body
  const body = await request.json();
  const { name, layers, thumbnail_url } = body;

  if (!name || !layers) {
    return NextResponse.json(
      { error: 'Missing required fields: name and layers' },
      { status: 400 }
    );
  }

  // Create new design
  const { data, error } = await supabaseAdmin
    .from('user_designs')
    .insert({
      user_id: user.id,
      name,
      layers,
      thumbnail_url: thumbnail_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating design:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ design: data }, { status: 201 });
}

