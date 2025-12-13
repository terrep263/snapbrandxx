/**
 * Watermark State Management Context
 * 
 * Centralized state for watermarking system including:
 * - Job state (images, layers, overrides)
 * - Brand profiles
 * - Templates
 * - Logo library
 */

'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  WatermarkLayer,
  BrandProfile,
  Template,
  Job,
  ProcessedImage,
  Anchor,
  TextEffect,
  LogoEffect,
  TileMode,
  TextAlign,
  DEFAULT_TEXT_PRESETS,
} from './types';
import { LogoItem, getAllLogos, saveLogo, deleteLogo, updateLogoName } from '../logoLibrary';

interface WatermarkState {
  // Current job
  job: Job | null;
  
  // Brand profiles
  brandProfiles: BrandProfile[];
  activeBrandProfile: BrandProfile | null;
  
  // Templates
  templates: Template[];
  
  // Logo library
  logoLibrary: Map<string, LogoItem>;
  
  // UI state
  selectedImageId: string | null;
  selectedLayerId: string | null;
}

type WatermarkAction =
  | { type: 'SET_JOB'; payload: Job }
  | { type: 'SET_IMAGES'; payload: ProcessedImage[] }
  | { type: 'SET_GLOBAL_LAYERS'; payload: WatermarkLayer[] }
  | { type: 'SET_IMAGE_OVERRIDE'; payload: { imageId: string; layers: WatermarkLayer[] | null } }
  | { type: 'ADD_LAYER'; payload: { layer: WatermarkLayer; isGlobal: boolean; imageId?: string } }
  | { type: 'UPDATE_LAYER'; payload: { layerId: string; updates: Partial<WatermarkLayer>; isGlobal: boolean; imageId?: string } }
  | { type: 'DELETE_LAYER'; payload: { layerId: string; isGlobal: boolean; imageId?: string } }
  | { type: 'REORDER_LAYERS'; payload: { layerIds: string[]; isGlobal: boolean; imageId?: string } }
  | { type: 'SET_SELECTED_IMAGE'; payload: string | null }
  | { type: 'SET_SELECTED_LAYER'; payload: string | null }
  | { type: 'SET_BRAND_PROFILES'; payload: BrandProfile[] }
  | { type: 'SET_ACTIVE_BRAND_PROFILE'; payload: BrandProfile | null }
  | { type: 'SET_TEMPLATES'; payload: Template[] }
  | { type: 'SET_LOGO_LIBRARY'; payload: LogoItem[] }
  | { type: 'ADD_LOGO'; payload: LogoItem }
  | { type: 'REMOVE_LOGO'; payload: string }
  | { type: 'UPDATE_LOGO'; payload: LogoItem };

const initialState: WatermarkState = {
  job: null,
  brandProfiles: [],
  activeBrandProfile: null,
  templates: [],
  logoLibrary: new Map(),
  selectedImageId: null,
  selectedLayerId: null,
};

function watermarkReducer(state: WatermarkState, action: WatermarkAction): WatermarkState {
  switch (action.type) {
    case 'SET_JOB':
      return { ...state, job: action.payload };

    case 'SET_IMAGES':
      if (!state.job) return state;
      return {
        ...state,
        job: {
          ...state.job,
          images: action.payload,
          updatedAt: Date.now(),
        },
      };

    case 'SET_GLOBAL_LAYERS':
      if (!state.job) return state;
      return {
        ...state,
        job: {
          ...state.job,
          globalLayers: action.payload,
          updatedAt: Date.now(),
        },
      };

    case 'SET_IMAGE_OVERRIDE': {
      if (!state.job) return state;
      const { imageId, layers } = action.payload;
      const overrides = { ...state.job.overrides };
      
      if (layers === null) {
        delete overrides[imageId];
      } else {
        overrides[imageId] = layers;
      }

      return {
        ...state,
        job: {
          ...state.job,
          overrides,
          updatedAt: Date.now(),
        },
      };
    }

    case 'ADD_LAYER': {
      if (!state.job) return state;
      const { layer, isGlobal, imageId } = action.payload;
      
      if (isGlobal) {
        return {
          ...state,
          job: {
            ...state.job,
            globalLayers: [...state.job.globalLayers, layer],
            updatedAt: Date.now(),
          },
        };
      } else if (imageId) {
        const currentLayers = state.job.overrides[imageId] || state.job.globalLayers;
        const overrides = {
          ...state.job.overrides,
          [imageId]: [...currentLayers, layer],
        };
        return {
          ...state,
          job: {
            ...state.job,
            overrides,
            updatedAt: Date.now(),
          },
        };
      }
      return state;
    }

    case 'UPDATE_LAYER': {
      if (!state.job) return state;
      const { layerId, updates, isGlobal, imageId } = action.payload;
      
      if (isGlobal) {
        return {
          ...state,
          job: {
            ...state.job,
            globalLayers: state.job.globalLayers.map(l =>
              l.id === layerId ? { ...l, ...updates } : l
            ),
            updatedAt: Date.now(),
          },
        };
      } else if (imageId) {
        const currentLayers = state.job.overrides[imageId] || state.job.globalLayers;
        const overrides = {
          ...state.job.overrides,
          [imageId]: currentLayers.map(l =>
            l.id === layerId ? { ...l, ...updates } : l
          ),
        };
        return {
          ...state,
          job: {
            ...state.job,
            overrides,
            updatedAt: Date.now(),
          },
        };
      }
      return state;
    }

    case 'DELETE_LAYER': {
      if (!state.job) return state;
      const { layerId, isGlobal, imageId } = action.payload;
      
      if (isGlobal) {
        return {
          ...state,
          job: {
            ...state.job,
            globalLayers: state.job.globalLayers.filter(l => l.id !== layerId),
            updatedAt: Date.now(),
          },
        };
      } else if (imageId) {
        const currentLayers = state.job.overrides[imageId] || state.job.globalLayers;
        const overrides = {
          ...state.job.overrides,
          [imageId]: currentLayers.filter(l => l.id !== layerId),
        };
        return {
          ...state,
          job: {
            ...state.job,
            overrides,
            updatedAt: Date.now(),
          },
        };
      }
      return state;
    }

    case 'REORDER_LAYERS': {
      if (!state.job) return state;
      const { layerIds, isGlobal, imageId } = action.payload;
      
      if (isGlobal) {
        const layerMap = new Map(state.job.globalLayers.map(l => [l.id, l]));
        const reordered = layerIds.map(id => layerMap.get(id)).filter(Boolean) as WatermarkLayer[];
        return {
          ...state,
          job: {
            ...state.job,
            globalLayers: reordered,
            updatedAt: Date.now(),
          },
        };
      } else if (imageId) {
        const currentLayers = state.job.overrides[imageId] || state.job.globalLayers;
        const layerMap = new Map(currentLayers.map(l => [l.id, l]));
        const reordered = layerIds.map(id => layerMap.get(id)).filter(Boolean) as WatermarkLayer[];
        const overrides = {
          ...state.job.overrides,
          [imageId]: reordered,
        };
        return {
          ...state,
          job: {
            ...state.job,
            overrides,
            updatedAt: Date.now(),
          },
        };
      }
      return state;
    }

    case 'SET_SELECTED_IMAGE':
      return { ...state, selectedImageId: action.payload, selectedLayerId: null };

    case 'SET_SELECTED_LAYER':
      return { ...state, selectedLayerId: action.payload };

    case 'SET_BRAND_PROFILES':
      return { ...state, brandProfiles: action.payload };

    case 'SET_ACTIVE_BRAND_PROFILE':
      return { ...state, activeBrandProfile: action.payload };

    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };

    case 'SET_LOGO_LIBRARY': {
      const map = new Map<string, LogoItem>();
      action.payload.forEach(logo => map.set(logo.id, logo));
      return { ...state, logoLibrary: map };
    }

    case 'ADD_LOGO': {
      const map = new Map(state.logoLibrary);
      map.set(action.payload.id, action.payload);
      return { ...state, logoLibrary: map };
    }

    case 'REMOVE_LOGO': {
      const map = new Map(state.logoLibrary);
      map.delete(action.payload);
      return { ...state, logoLibrary: map };
    }

    case 'UPDATE_LOGO': {
      const map = new Map(state.logoLibrary);
      map.set(action.payload.id, action.payload);
      return { ...state, logoLibrary: map };
    }

    default:
      return state;
  }
}

interface WatermarkContextValue extends WatermarkState {
  // Job actions
  createJob: (images: ProcessedImage[]) => void;
  updateJob: (updates: Partial<Job>) => void;
  
  // Layer actions
  addLayer: (layer: WatermarkLayer, isGlobal?: boolean, imageId?: string) => void;
  updateLayer: (layerId: string, updates: Partial<WatermarkLayer>, isGlobal?: boolean, imageId?: string) => void;
  deleteLayer: (layerId: string, isGlobal?: boolean, imageId?: string) => void;
  reorderLayers: (layerIds: string[], isGlobal?: boolean, imageId?: string) => void;
  
  // Image override actions
  setImageOverride: (imageId: string, layers: WatermarkLayer[] | null) => void;
  resetImageOverride: (imageId: string) => void;
  
  // Selection
  selectImage: (imageId: string | null) => void;
  selectLayer: (layerId: string | null) => void;
  
  // Brand profile actions
  setActiveBrandProfile: (profile: BrandProfile | null) => void;
  
  // Template actions
  applyTemplate: (template: Template, brandProfile?: BrandProfile) => void;
  saveAsTemplate: (name: string, description?: string) => Template;
  
  // Logo library actions
  loadLogos: () => Promise<void>;
  addLogoToLibrary: (name: string, file: File) => Promise<LogoItem>;
  removeLogoFromLibrary: (logoId: string) => Promise<void>;
  updateLogoInLibrary: (logoId: string, name: string) => Promise<void>;
  
  // Helper: Get layers for an image
  getLayersForImage: (imageId: string) => WatermarkLayer[];
  
  // Helper: Create default layers
  createDefaultTextLayer: (text?: string) => WatermarkLayer;
  createDefaultLogoLayer: (logoId: string) => WatermarkLayer;
}

const WatermarkContext = createContext<WatermarkContextValue | null>(null);

export function WatermarkProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(watermarkReducer, initialState);

  // Initialize job
  const createJob = useCallback((images: ProcessedImage[]) => {
    const job: Job = {
      id: `job-${Date.now()}`,
      images,
      globalLayers: [],
      overrides: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'SET_JOB', payload: job });
    if (images.length > 0) {
      dispatch({ type: 'SET_SELECTED_IMAGE', payload: images[0].id });
    }
  }, []);

  const updateJob = useCallback((updates: Partial<Job>) => {
    if (!state.job) return;
    dispatch({ type: 'SET_JOB', payload: { ...state.job, ...updates, updatedAt: Date.now() } });
  }, [state.job]);

  // Layer actions
  const addLayer = useCallback((layer: WatermarkLayer, isGlobal = true, imageId?: string) => {
    dispatch({ type: 'ADD_LAYER', payload: { layer, isGlobal, imageId } });
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<WatermarkLayer>, isGlobal = true, imageId?: string) => {
    dispatch({ type: 'UPDATE_LAYER', payload: { layerId, updates, isGlobal, imageId } });
  }, []);

  const deleteLayer = useCallback((layerId: string, isGlobal = true, imageId?: string) => {
    dispatch({ type: 'DELETE_LAYER', payload: { layerId, isGlobal, imageId } });
  }, []);

  const reorderLayers = useCallback((layerIds: string[], isGlobal = true, imageId?: string) => {
    dispatch({ type: 'REORDER_LAYERS', payload: { layerIds, isGlobal, imageId } });
  }, []);

  // Image override actions
  const setImageOverride = useCallback((imageId: string, layers: WatermarkLayer[] | null) => {
    dispatch({ type: 'SET_IMAGE_OVERRIDE', payload: { imageId, layers } });
  }, []);

  const resetImageOverride = useCallback((imageId: string) => {
    dispatch({ type: 'SET_IMAGE_OVERRIDE', payload: { imageId, layers: null } });
  }, []);

  // Selection
  const selectImage = useCallback((imageId: string | null) => {
    dispatch({ type: 'SET_SELECTED_IMAGE', payload: imageId });
  }, []);

  const selectLayer = useCallback((layerId: string | null) => {
    dispatch({ type: 'SET_SELECTED_LAYER', payload: layerId });
  }, []);

  // Brand profile
  const setActiveBrandProfile = useCallback((profile: BrandProfile | null) => {
    dispatch({ type: 'SET_ACTIVE_BRAND_PROFILE', payload: profile });
  }, []);

  // Template actions
  const applyTemplate = useCallback((template: Template, brandProfile?: BrandProfile) => {
    if (!state.job) return;
    
    // Clone layers and replace placeholders
    const layers = template.layers.map(layer => {
      if (layer.type === 'text' && layer.text) {
        let text = layer.text;
        const profile = brandProfile || state.activeBrandProfile;
        
        if (profile) {
          text = text.replace(/{NAME}/g, profile.name || '');
          text = text.replace(/{WEBSITE}/g, profile.website || '');
          text = text.replace(/{HANDLE}/g, profile.handle || '');
        }
        
        return { ...layer, text };
      }
      return layer;
    });

    dispatch({ type: 'SET_GLOBAL_LAYERS', payload: layers });
  }, [state.job, state.activeBrandProfile]);

  const saveAsTemplate = useCallback((name: string, description?: string): Template => {
    if (!state.job) {
      throw new Error('No active job');
    }

    const template: Template = {
      id: `template-${Date.now()}`,
      name,
      description,
      brandProfileId: state.job.brandProfileId,
      layers: state.job.globalLayers,
      isBuiltIn: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch({ type: 'SET_TEMPLATES', payload: [...state.templates, template] });
    return template;
  }, [state.job, state.templates]);

  // Logo library actions
  const loadLogos = useCallback(async () => {
    try {
      const logos = await getAllLogos();
      dispatch({ type: 'SET_LOGO_LIBRARY', payload: logos });
    } catch (error) {
      console.error('Failed to load logos:', error);
    }
  }, []);

  const addLogoToLibrary = useCallback(async (name: string, file: File): Promise<LogoItem> => {
    const logo = await saveLogo(name, file);
    dispatch({ type: 'ADD_LOGO', payload: logo });
    return logo;
  }, []);

  const removeLogoFromLibrary = useCallback(async (logoId: string) => {
    await deleteLogo(logoId);
    dispatch({ type: 'REMOVE_LOGO', payload: logoId });
  }, []);

  const updateLogoInLibrary = useCallback(async (logoId: string, name: string) => {
    await updateLogoName(logoId, name);
    const logo = state.logoLibrary.get(logoId);
    if (logo) {
      dispatch({ type: 'UPDATE_LOGO', payload: { ...logo, name, updatedAt: Date.now() } });
    }
  }, [state.logoLibrary]);

  // Helpers
  const getLayersForImage = useCallback((imageId: string): WatermarkLayer[] => {
    if (!state.job) return [];
    return state.job.overrides[imageId] || state.job.globalLayers;
  }, [state.job]);

  const createDefaultTextLayer = useCallback((text: string = 'Your Brand'): WatermarkLayer => {
    const maxZIndex = state.job?.globalLayers && state.job.globalLayers.length > 0
      ? Math.max(...state.job.globalLayers.map(l => l.zIndex))
      : 0;

    return {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      zIndex: maxZIndex + 1,
      enabled: true,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: -5, // Legacy support
      offsetY: -5,
      scale: 1.25, // Default scale
      rotation: 0,
      opacity: 0.8,
      tileMode: TileMode.NONE,
      effect: TextEffect.SOLID,
      text,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontSizeRelative: 5, // 5% of image height
      textAlign: TextAlign.LEFT,
      color: '#ffffff',
    };
  }, [state.job]);

  const createDefaultLogoLayer = useCallback((logoId: string): WatermarkLayer => {
    const maxZIndex = state.job?.globalLayers && state.job.globalLayers.length > 0
      ? Math.max(...state.job.globalLayers.map(l => l.zIndex))
      : 0;

    return {
      id: `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'logo',
      zIndex: maxZIndex + 1,
      enabled: true,
      anchor: Anchor.CENTER,
      xNorm: 0.5, // Center of image
      yNorm: 0.5,
      offsetX: -5, // Legacy support
      offsetY: -5,
      scale: 1.25, // Default scale
      rotation: 0,
      opacity: 0.8,
      tileMode: TileMode.NONE,
      effect: LogoEffect.SOLID,
      logoId,
      backgroundBox: false,
    };
  }, [state.job]);

  // Load logos on mount
  useEffect(() => {
    loadLogos();
  }, [loadLogos]);

  const value: WatermarkContextValue = {
    ...state,
    createJob,
    updateJob,
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    setImageOverride,
    resetImageOverride,
    selectImage,
    selectLayer,
    setActiveBrandProfile,
    applyTemplate,
    saveAsTemplate,
    loadLogos,
    addLogoToLibrary,
    removeLogoFromLibrary,
    updateLogoInLibrary,
    getLayersForImage,
    createDefaultTextLayer,
    createDefaultLogoLayer,
  };

  return <WatermarkContext.Provider value={value}>{children}</WatermarkContext.Provider>;
}

export function useWatermark() {
  const context = useContext(WatermarkContext);
  if (!context) {
    throw new Error('useWatermark must be used within WatermarkProvider');
  }
  return context;
}


