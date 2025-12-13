/**
 * Cleanup Cron Route
 * Deletes expired sessions and their storage files
 * Should be called hourly via Vercel Cron or similar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get environment variables and strip quotes/spaces if present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '') || null;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, '') || null;
const cronSecret = process.env.CRON_SECRET?.trim().replace(/^["']|["']$/g, '') || null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for cleanup API');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `SET (${supabaseUrl.substring(0, 30)}...)` : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `SET (${supabaseServiceKey.length} chars)` : 'MISSING');
  console.error('Raw NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.error('Raw SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars` : 'undefined');
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
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  
  // Debug logging (remove in production)
  console.log('CRON_SECRET check:', {
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret?.length || 0,
    authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : 'missing',
    expectedHeader: cronSecret ? `Bearer ${cronSecret.substring(0, 20)}...` : 'N/A',
    match: cronSecret && authHeader === `Bearer ${cronSecret}`
  });
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: {
          hasSecret: !!cronSecret,
          receivedHeader: authHeader ? 'present' : 'missing',
          expectedFormat: 'Bearer <CRON_SECRET>'
        }
      },
      { status: 401 }
    );
  }
  
  // If no CRON_SECRET is set, allow access (for development)
  // In production, always require CRON_SECRET
  if (!cronSecret) {
    console.warn('WARNING: CRON_SECRET not set - allowing access (development mode)');
  }

  if (!supabaseAdmin) {
    console.error('supabaseAdmin is null - configuration check failed');
    return NextResponse.json(
      { 
        error: 'Cleanup API not configured',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
          urlLength: supabaseUrl?.length || 0,
          serviceKeyLength: supabaseServiceKey?.length || 0
        }
      },
      { status: 500 }
    );
  }

  try {
    // Get expired sessions
    const { data: expiredSessions, error: fetchError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired sessions:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return NextResponse.json({
        message: 'No expired sessions',
        deleted: 0,
      });
    }

    // Delete storage folders and session records
    let deletedCount = 0;
    const errors: string[] = [];

    for (const session of expiredSessions) {
      try {
        // Delete original images
        if (session.images_folder) {
          const { data: imageFiles } = await supabaseAdmin.storage
            .from('user-sessions')
            .list(session.images_folder, {
              limit: 1000,
              offset: 0,
            });

          if (imageFiles && imageFiles.length > 0) {
            const filePaths = imageFiles.map(f => `${session.images_folder}/${f.name}`);
            const { error: deleteError } = await supabaseAdmin.storage
              .from('user-sessions')
              .remove(filePaths);

            if (deleteError) {
              console.error(`Error deleting images for session ${session.id}:`, deleteError);
              errors.push(`Session ${session.id}: ${deleteError.message}`);
            }
          }
        }

        // Delete exports
        if (session.exports_folder) {
          const { data: exportFiles } = await supabaseAdmin.storage
            .from('user-sessions')
            .list(session.exports_folder, {
              limit: 1000,
              offset: 0,
            });

          if (exportFiles && exportFiles.length > 0) {
            const filePaths = exportFiles.map(f => `${session.exports_folder}/${f.name}`);
            const { error: deleteError } = await supabaseAdmin.storage
              .from('user-sessions')
              .remove(filePaths);

            if (deleteError) {
              console.error(`Error deleting exports for session ${session.id}:`, deleteError);
              errors.push(`Session ${session.id} exports: ${deleteError.message}`);
            }
          }
        }

        // Delete session record
        const { error: deleteError } = await supabaseAdmin
          .from('user_sessions')
          .delete()
          .eq('id', session.id);

        if (deleteError) {
          console.error(`Error deleting session record ${session.id}:`, deleteError);
          errors.push(`Session ${session.id} record: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
      } catch (error: any) {
        console.error(`Error processing session ${session.id}:`, error);
        errors.push(`Session ${session.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: 'Cleanup complete',
      deleted: deletedCount,
      total: expiredSessions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

