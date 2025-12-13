/**
 * Rotation Dial - Circular control for rotation
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface RotationDialProps {
  value: number; // 0-360 degrees
  onChange: (value: number) => void;
  size?: number;
}

export default function RotationDial({ value, onChange, size = 80 }: RotationDialProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const drawDial = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw outer circle
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw tick marks
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const x1 = centerX + Math.cos(angle) * (radius - 5);
      const y1 = centerY + Math.sin(angle) * (radius - 5);
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw rotation indicator line
    const rotationRad = (value * Math.PI) / 180;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(rotationRad) * (radius - 15),
      centerY + Math.sin(rotationRad) * (radius - 15)
    );
    ctx.stroke();

    // Draw center dot
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [value, size]);

  useEffect(() => {
    drawDial();
  }, [drawDial]);

  const getAngleFromPoint = useCallback((clientX: number, clientY: number): number => {
    if (!containerRef.current) return value;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 90) % 360; // Adjust so 0 is at top
    if (angle < 0) angle += 360;

    return angle;
  }, [value]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    const angle = getAngleFromPoint(clientX, clientY);
    onChange(angle);
  }, [getAngleFromPoint, onChange]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const angle = getAngleFromPoint(clientX, clientY);
    onChange(angle);
  }, [isDragging, getAngleFromPoint, onChange]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer select-none touch-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs text-gray-400 font-mono">{Math.round(value)}°</span>
      </div>
    </div>
  );
}

