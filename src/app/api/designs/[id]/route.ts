/**
 * Single Design API Route
 * Handles GET (single design), PUT (update), DELETE
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Designs API not configured' },
      { status: 500 }
    );
  }

  const { id } = params;

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

  // Get single design (with ownership check)
  const { data, error } = await supabaseAdmin
    .from('user_designs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // Ownership check
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      );
    }
    console.error('Error fetching design:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ design: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Designs API not configured' },
      { status: 500 }
    );
  }

  const { id } = params;

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

  // Update design (with ownership check)
  const { data, error } = await supabaseAdmin
    .from('user_designs')
    .update({
      name,
      layers,
      thumbnail_url: thumbnail_url || null,
    })
    .eq('id', id)
    .eq('user_id', user.id) // Ownership check
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      );
    }
    console.error('Error updating design:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ design: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Designs API not configured' },
      { status: 500 }
    );
  }

  const { id } = params;

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

  // Delete design (with ownership check)
  const { error } = await supabaseAdmin
    .from('user_designs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Ownership check

  if (error) {
    console.error('Error deleting design:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

