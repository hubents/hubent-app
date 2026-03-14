"use client";

import { useRef, useEffect, useState, useCallback, type MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { RiDeleteBinLine } from "@remixicon/react";

interface SignatureCanvasProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  required?: boolean;
}

export function SignatureCanvas({ value, onChange, label, required }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const hasDrawnRef = useRef(false) as MutableRefObject<boolean>;

  const getCanvas = useCallback(() => canvasRef.current, []);
  const getCtx = useCallback(() => getCanvas()?.getContext("2d") ?? null, [getCanvas]);

  const initCanvas = useCallback(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111827";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
        hasDrawnRef.current = true;
      };
      img.src = value;
    }
  }, [getCanvas, getCtx, value]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = getCanvas();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = getCanvas();
    if (canvas && hasDrawnRef.current) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
    setHasDrawn(false);
    hasDrawnRef.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hasDrawn && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 gap-1 text-xs text-muted-foreground">
            <RiDeleteBinLine className="h-3 w-3" />
            Limpiar
          </Button>
        )}
      </div>
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: 150 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <p className="text-xs text-gray-400">Dibuja tu firma con el mouse o el dedo</p>
    </div>
  );
}
