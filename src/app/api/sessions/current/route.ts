/**
 * Current Session API Route
 * Gets user's active session (not expired)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables and strip quotes if present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '') || null;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, '') || null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for sessions API');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
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
      { error: 'Sessions API not configured' },
      { status: 500 }
    );
  }

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

  try {
    // Get active session (not expired)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 404 }
      );
    }

    // List files in session
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('user-sessions')
      .list(session.images_folder, {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      console.error('Error listing files:', listError);
      // Return session info even if file listing fails
      return NextResponse.json({
        session: {
          id: session.id,
          image_count: session.image_count,
          expires_at: session.expires_at,
          images: [],
        },
      });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        session: {
          id: session.id,
          image_count: session.image_count,
          expires_at: session.expires_at,
          images: [],
        },
      });
    }

    // Generate signed URLs
    const signedUrls = await Promise.all(
      files.map(async (file) => {
        const { data } = await supabaseAdmin.storage
          .from('user-sessions')
          .createSignedUrl(`${session.images_folder}/${file.name}`, 3600); // 1 hour
        return data?.signedUrl || null;
      })
    );

    return NextResponse.json({
      session: {
        id: session.id,
        image_count: session.image_count,
        expires_at: session.expires_at,
        images: signedUrls.filter(url => url !== null),
      },
    });
  } catch (error: any) {
    console.error('Error fetching current session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

