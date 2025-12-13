/**
 * Save Status Indicator Component
 * 
 * Shows visual feedback for auto-save status:
 * - Saved (green) - with timestamp
 * - Saving (blue, spinning) - in progress
 * - Unsaved (orange) - changes pending
 * - Error (red) - save failed, click to retry
 */

'use client';

import { useEffect, useState } from 'react';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  onRetry?: () => void;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
}

export default function SaveStatusIndicator({ 
  status, 
  lastSaved,
  onRetry 
}: SaveStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string | null>(
    lastSaved ? formatTimeAgo(lastSaved) : null
  );

  // Update time ago every 10 seconds
  useEffect(() => {
    if (!lastSaved || status !== 'saved') return;

    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(lastSaved));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [lastSaved, status]);

  // Update time ago when lastSaved changes
  useEffect(() => {
    if (lastSaved) {
      setTimeAgo(formatTimeAgo(lastSaved));
    }
  }, [lastSaved]);

  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: '✓',
          text: 'Saved',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          detail: timeAgo,
        };
      case 'saving':
        return {
          icon: '↻',
          text: 'Saving...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          detail: null,
        };
      case 'unsaved':
        return {
          icon: '○',
          text: 'Unsaved changes',
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
          detail: null,
        };
      case 'error':
        return {
          icon: '✕',
          text: 'Save failed',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          detail: 'Click to retry',
        };
    }
  };

  const config = getStatusConfig();
  const isClickable = status === 'error' && onRetry;

  return (
    <div
      onClick={isClickable ? onRetry : undefined}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border
        ${config.bgColor} ${config.borderColor}
        ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
    >
      <span
        className={`${config.color} text-sm ${status === 'saving' ? 'animate-spin' : ''}`}
      >
        {config.icon}
      </span>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
      {config.detail && (
        <span className="text-xs text-gray-400">
          {config.detail}
        </span>
      )}
    </div>
  );
}

