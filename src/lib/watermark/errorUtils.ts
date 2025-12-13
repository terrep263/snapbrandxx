/**
 * Error Message Normalization
 * 
 * Sprint 5: Ensures all errors are readable and actionable.
 * No stack traces, no "Unexpected error" - every error must answer:
 * - What failed?
 * - Which image?
 * - What can the user do next?
 */

export interface NormalizedError {
  title: string;
  message: string;
  action?: string; // Suggested action for user
  imageName?: string; // If error is image-specific
}

/**
 * Normalize an error to a user-friendly message
 */
export function normalizeError(
  error: unknown,
  context?: {
    imageName?: string;
    operation?: string;
  }
): NormalizedError {
  const imageName = context?.imageName;
  const operation = context?.operation || 'operation';

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Image loading errors
    if (message.includes('failed to load image') || message.includes('load image')) {
      return {
        title: 'Image Loading Failed',
        message: imageName
          ? `Could not load "${imageName}". The file may be corrupted or in an unsupported format.`
          : 'Could not load image. The file may be corrupted or in an unsupported format.',
        action: 'Try removing this image and re-exporting.',
        imageName,
      };
    }

    // Canvas/rendering errors
    if (message.includes('canvas') || message.includes('context') || message.includes('render')) {
      return {
        title: 'Rendering Error',
        message: imageName
          ? `Could not render watermark on "${imageName}". The image may be too large or corrupted.`
          : 'Could not render watermark. The image may be too large or corrupted.',
        action: 'Try reducing image size or removing this image.',
        imageName,
      };
    }

    // Blob creation errors
    if (message.includes('blob') || message.includes('failed to create')) {
      return {
        title: 'Export Failed',
        message: imageName
          ? `Could not create export file for "${imageName}".`
          : 'Could not create export file.',
        action: 'Try exporting again or check available disk space.',
        imageName,
      };
    }

    // Font loading errors
    if (message.includes('font') || message.includes('typeface')) {
      return {
        title: 'Font Loading Error',
        message: 'A font used in your watermark could not be loaded.',
        action: 'Check that all fonts are properly installed or use a different font.',
      };
    }

    // Generic error with message
    return {
      title: `${operation} Failed`,
      message: imageName
        ? `Could not ${operation} "${imageName}": ${error.message}`
        : `Could not ${operation}: ${error.message}`,
      action: 'Please try again or contact support if the problem persists.',
      imageName,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      title: `${operation} Failed`,
      message: imageName ? `Could not ${operation} "${imageName}": ${error}` : `Could not ${operation}: ${error}`,
      action: 'Please try again.',
      imageName,
    };
  }

  // Unknown error
  return {
    title: `${operation} Failed`,
    message: imageName
      ? `An unexpected error occurred while processing "${imageName}".`
      : 'An unexpected error occurred.',
    action: 'Please try again or contact support if the problem persists.',
    imageName,
  };
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: NormalizedError): string {
  if (error.action) {
    return `${error.message} ${error.action}`;
  }
  return error.message;
}

