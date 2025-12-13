/**
 * Smart Snapping System - Magnetic snapping to visual guidelines
 * 
 * Provides professional snapping behavior similar to Figma, Photoshop, Canva
 */

export interface SnapResult {
  position: number;
  snapped: boolean;
  snapGuide: number | null;
}

export interface SnapPositionResult {
  xNorm: number;
  yNorm: number;
  snappedX: boolean;
  snappedY: boolean;
  activeGuides: {
    horizontal: number | null;
    vertical: number | null;
  };
}

/**
 * Standard guide positions (normalized 0-1)
 * - 5%: Safe zone edges
 * - 50%: Center
 * - 95%: Safe zone opposite edges
 */
export const DEFAULT_HORIZONTAL_GUIDES = [0.05, 0.5, 0.95];
export const DEFAULT_VERTICAL_GUIDES = [0.05, 0.5, 0.95];

/**
 * Rule of Thirds guide positions (photography standard)
 */
export const THIRDS_HORIZONTAL_GUIDES = [0.05, 0.33, 0.5, 0.66, 0.95];
export const THIRDS_VERTICAL_GUIDES = [0.05, 0.33, 0.5, 0.66, 0.95];

/**
 * Snap a position to nearest guide if within threshold
 * 
 * @param position - Current position (0-1 normalized)
 * @param guides - Available guide positions
 * @param threshold - Snap threshold (default 0.03 = 3% of canvas)
 * @returns SnapResult with snapped position and guide info
 */
export function snapToGuide(
  position: number,
  guides: number[],
  threshold: number = 0.03
): SnapResult {
  if (!guides || guides.length === 0) {
    return { position, snapped: false, snapGuide: null };
  }
  
  // Find nearest guide
  let nearestGuide: number | null = null;
  let minDistance = Infinity;
  
  for (const guide of guides) {
    const distance = Math.abs(position - guide);
    if (distance < minDistance) {
      minDistance = distance;
      nearestGuide = guide;
    }
  }
  
  // Snap if within threshold
  if (nearestGuide !== null && minDistance < threshold) {
    return {
      position: nearestGuide,
      snapped: true,
      snapGuide: nearestGuide
    };
  }
  
  return { position, snapped: false, snapGuide: null };
}

/**
 * Snap both X and Y coordinates to guides
 * 
 * @param xNorm - Normalized X position (0-1)
 * @param yNorm - Normalized Y position (0-1)
 * @param horizontalGuides - Horizontal guide positions
 * @param verticalGuides - Vertical guide positions
 * @param enabled - Whether snapping is enabled
 * @param threshold - Snap threshold (default 0.03)
 * @returns SnapPositionResult with snapped positions and active guides
 */
export function snapPosition(
  xNorm: number,
  yNorm: number,
  horizontalGuides: number[],
  verticalGuides: number[],
  enabled: boolean = true,
  threshold: number = 0.03
): SnapPositionResult {
  if (!enabled) {
    return {
      xNorm,
      yNorm,
      snappedX: false,
      snappedY: false,
      activeGuides: { horizontal: null, vertical: null }
    };
  }
  
  const xSnap = snapToGuide(xNorm, verticalGuides, threshold);
  const ySnap = snapToGuide(yNorm, horizontalGuides, threshold);
  
  return {
    xNorm: xSnap.position,
    yNorm: ySnap.position,
    snappedX: xSnap.snapped,
    snappedY: ySnap.snapped,
    activeGuides: {
      horizontal: ySnap.snapGuide,
      vertical: xSnap.snapGuide
    }
  };
}

