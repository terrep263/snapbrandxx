/**
 * Font Library Service
 * Manages fonts stored in Supabase Storage and database
 */

import { supabase } from './supabase';

export interface FontRecord {
  id: string;
  name: string;
  file_path: string;
  family_name: string;
  tags: string[];
  created_at: string;
}

const FONTS_BUCKET = 'fonts';
const MAX_FONTS = 500;
const FONT_CACHE_KEY = 'snapbrandxx-fonts-cache';
const FONT_LOADED_CACHE = new Set<string>(); // Track which fonts are loaded via FontFace

/**
 * Get public URL for a font file
 */
export function getFontUrl(filePath: string): string {
  if (!supabase) return '';
  const { data } = supabase.storage.from(FONTS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Get all fonts from database
 */
export async function getAllFonts(): Promise<FontRecord[]> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    // Try cache first
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(FONT_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const cacheTime = parsed.timestamp || 0;
          // Cache for 5 minutes
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            return parsed.fonts || [];
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }

    const { data, error } = await supabase
      .from('fonts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fonts:', error);
      throw error;
    }

    // Cache the result
    if (typeof window !== 'undefined' && data) {
      sessionStorage.setItem(
        FONT_CACHE_KEY,
        JSON.stringify({ fonts: data, timestamp: Date.now() })
      );
    }

    return data || [];
  } catch (error) {
    console.error('Failed to load fonts:', error);
    return [];
  }
}

/**
 * Get current font count
 */
export async function getFontCount(): Promise<number> {
  if (!supabase) return 0;

  try {
    const { count, error } = await supabase
      .from('fonts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error counting fonts:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to count fonts:', error);
    return 0;
  }
}

/**
 * Extract font family name from font file metadata
 */
async function extractFontFamily(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Try to extract font name from TTF/OTF metadata
        // This is a simplified approach - full font parsing would require a library
        // For now, we'll use the filename
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        resolve(name || 'Custom Font');
      } catch {
        resolve(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.onerror = () => resolve(file.name.replace(/\.[^/.]+$/, ''));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Upload fonts to Supabase
 */
export async function uploadFonts(files: File[]): Promise<{ success: number; errors: string[] }> {
  if (!supabase) {
    throw new Error('Supabase not configured. Please check your environment variables.');
  }

  const errors: string[] = [];
  let successCount = 0;

  // Check current font count
  const currentCount = await getFontCount();
  if (currentCount + files.length > MAX_FONTS) {
    throw new Error(
      `Cannot upload ${files.length} fonts. Current count: ${currentCount}, Maximum: ${MAX_FONTS}. ` +
      `You can upload at most ${MAX_FONTS - currentCount} more fonts.`
    );
  }

  for (const file of files) {
    try {
      // Validate file type
      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(extension)) {
        errors.push(`${file.name}: Invalid file type. Only .ttf, .otf, .woff, .woff2 are allowed.`);
        continue;
      }

      // Generate unique path
      const fileId = crypto.randomUUID();
      const filePath = `${fileId}/${file.name}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from(FONTS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        errors.push(`${file.name}: Upload failed - ${uploadError.message}`);
        continue;
      }

      // Extract font name
      const fontName = await extractFontFamily(file);
      const familyName = `SnapBrandXX_Font_${fileId.substring(0, 8)}`;

      // Insert into database
      const { error: dbError } = await supabase.from('fonts').insert({
        name: fontName,
        file_path: filePath,
        family_name: familyName,
        tags: [],
      });

      if (dbError) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from(FONTS_BUCKET).remove([filePath]);
        errors.push(`${file.name}: Database insert failed - ${dbError.message}`);
        continue;
      }

      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${file.name}: ${message}`);
    }
  }

  // Clear cache after upload
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(FONT_CACHE_KEY);
  }

  return { success: successCount, errors };
}

/**
 * Delete a font
 */
export async function deleteFont(id: string, filePath: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(FONTS_BUCKET)
    .remove([filePath]);

  if (storageError) {
    console.error('Error deleting font file:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('fonts')
    .delete()
    .eq('id', id);

  if (dbError) {
    throw dbError;
  }

  // Clear cache
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(FONT_CACHE_KEY);
  }
}

/**
 * Load a font using FontFace API (lazy loading)
 */
export async function loadFont(fontRecord: FontRecord): Promise<boolean> {
  // Check if already loaded
  if (FONT_LOADED_CACHE.has(fontRecord.family_name)) {
    return true;
  }

  try {
    const fontUrl = getFontUrl(fontRecord.file_path);
    if (!fontUrl) {
      throw new Error('Failed to get font URL');
    }

    const font = new FontFace(fontRecord.family_name, `url(${fontUrl})`);
    await font.load();
    document.fonts.add(font);
    
    FONT_LOADED_CACHE.add(fontRecord.family_name);
    return true;
  } catch (error) {
    console.error(`Failed to load font ${fontRecord.family_name}:`, error);
    return false;
  }
}

/**
 * Preload fonts that are currently in use
 */
export async function preloadFontsInUse(fontFamilyNames: string[], allFonts: FontRecord[]): Promise<void> {
  const fontsToLoad = allFonts.filter(f => fontFamilyNames.includes(f.family_name));
  
  await Promise.all(
    fontsToLoad.map(font => loadFont(font))
  );
}


