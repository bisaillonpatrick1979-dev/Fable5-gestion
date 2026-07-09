import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  accentClass?: string; // tailwind text color class for the label/border accent
}

export default function SignaturePad({ label, value, onChange, required, disabled, accentClass = 'text-gray-400' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Prepare canvas backing store at device pixel ratio for crisp lines
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e293b';
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    // Redraw existing signature (e.g. loaded from a saved document) onto the fresh canvas
    if (value) {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (canvas && ctx) {
        const img = new Image();
        img.onload = () => {
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = value;
      }
      setHasDrawn(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawingRef.current) return;
    const ctx = getContext();
    const from = lastPointRef.current;
    const to = getPos(e);
    if (ctx && from) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    lastPointRef.current = to;
    if (!hasDrawn) setHasDrawn(true);
  };

  const commitStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className={`text-[10px] uppercase font-bold tracking-wide ${accentClass}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hasDrawn && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-red-400 transition cursor-pointer"
          >
            <Eraser className="w-3 h-3" /> Effacer
          </button>
        )}
      </div>
      <div className={`relative border rounded-lg bg-white overflow-hidden ${disabled ? 'opacity-80' : 'border-gray-700'} ${!hasDrawn && required ? 'border-orange-500/60' : ''}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-32 touch-none cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitStroke}
          onPointerLeave={commitStroke}
          onPointerCancel={commitStroke}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-[11px] italic">
              {disabled ? 'Non signé' : 'Signez ici avec le doigt ou la souris'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
