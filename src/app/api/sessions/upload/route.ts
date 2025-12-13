/**
 * Upload API Route
 * Handles image upload and session creation with 24-hour TTL
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

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Sessions API not configured' },
      { status: 500 }
    );
  }

  // Authenticate user
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
    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Delete existing active session for this user (single session model)
    const { data: existingSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('id, images_folder, exports_folder')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString());

    if (existingSessions && existingSessions.length > 0) {
      for (const session of existingSessions) {
        // Delete storage folders
        if (session.images_folder) {
          // List all files in the folder and delete them
          const { data: imageFiles } = await supabaseAdmin.storage
            .from('user-sessions')
            .list(session.images_folder, {
              limit: 1000,
              offset: 0,
            });

          if (imageFiles && imageFiles.length > 0) {
            const pathsToDelete = imageFiles.map(f => `${session.images_folder}/${f.name}`);
            await supabaseAdmin.storage.from('user-sessions').remove(pathsToDelete);
          }
        }
        if (session.exports_folder) {
          const { data: exportFiles } = await supabaseAdmin.storage
            .from('user-sessions')
            .list(session.exports_folder, {
              limit: 1000,
              offset: 0,
            });

          if (exportFiles && exportFiles.length > 0) {
            const pathsToDelete = exportFiles.map(f => `${session.exports_folder}/${f.name}`);
            await supabaseAdmin.storage.from('user-sessions').remove(pathsToDelete);
          }
        }
        // Delete session record
        await supabaseAdmin.from('user_sessions').delete().eq('id', session.id);
      }
    }

    // Generate new session ID
    const sessionId = crypto.randomUUID();
    const imagesFolder = `users/${user.id}/sessions/${sessionId}/originals`;
    const exportsFolder = `users/${user.id}/sessions/${sessionId}/exports`;

    // Upload files to storage
    const uploadedPaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${file.name}`);
        continue;
      }

      const fileBuffer = await file.arrayBuffer();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `image-${i + 1}-${Date.now()}.${fileExtension}`;
      const storagePath = `${imagesFolder}/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('user-sessions')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error for file:', file.name, uploadError);
        throw uploadError;
      }

      uploadedPaths.push(storagePath);
    }

    if (uploadedPaths.length === 0) {
      return NextResponse.json(
        { error: 'No valid image files uploaded' },
        { status: 400 }
      );
    }

    // Create session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour TTL

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: user.id,
        images_folder: imagesFolder,
        exports_folder: exportsFolder,
        expires_at: expiresAt.toISOString(),
        image_count: uploadedPaths.length,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      throw sessionError;
    }

    // Generate signed URLs for images (1 hour expiry)
    const signedUrls = await Promise.all(
      uploadedPaths.map(async (path) => {
        const { data } = await supabaseAdmin.storage
          .from('user-sessions')
          .createSignedUrl(path, 3600); // 1 hour
        return data?.signedUrl || null;
      })
    );

    return NextResponse.json({
      session: {
        id: session.id,
        image_count: uploadedPaths.length,
        expires_at: session.expires_at,
        images: signedUrls.filter(url => url !== null),
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

