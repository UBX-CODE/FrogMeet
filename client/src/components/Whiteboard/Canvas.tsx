import { useEffect, useRef, useState, useCallback } from 'react';
import type { DrawingElement, ToolType } from './types';

type CanvasProps = {
  elements: DrawingElement[];
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  onElementComplete: (element: DrawingElement) => void;
};

export default function Canvas({
  elements,
  activeTool,
  color,
  strokeWidth,
  onElementComplete
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      
      redrawCanvas();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing
    
    // We need to wait for layout
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, [elements]); // Also redraw when elements change

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We don't want to use scale here, because the dpr scale is already applied 
    // when setting the canvas context on resize. However, when we do clearRect, we need to divide by dpr
    // Actually, clearRect works in scaled coordinates if we use the unscaled width/height.
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const drawElement = (el: DrawingElement) => {
      ctx.beginPath();
      ctx.strokeStyle = el.tool === 'eraser' ? '#ffffff' : el.color;
      ctx.lineWidth = el.width;

      if ((el.tool === 'pen' || el.tool === 'eraser') && el.points.length > 0) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.tool === 'line' && el.startPoint && el.endPoint) {
        ctx.moveTo(el.startPoint.x, el.startPoint.y);
        ctx.lineTo(el.endPoint.x, el.endPoint.y);
        ctx.stroke();
      } else if (el.tool === 'rectangle' && el.startPoint && el.endPoint) {
        const x = Math.min(el.startPoint.x, el.endPoint.x);
        const y = Math.min(el.startPoint.y, el.endPoint.y);
        const w = Math.abs(el.startPoint.x - el.endPoint.x);
        const h = Math.abs(el.startPoint.y - el.endPoint.y);
        ctx.strokeRect(x, y, w, h);
      } else if (el.tool === 'circle' && el.startPoint && el.endPoint) {
        const radius = Math.sqrt(
          Math.pow(el.endPoint.x - el.startPoint.x, 2) +
          Math.pow(el.endPoint.y - el.startPoint.y, 2)
        );
        ctx.arc(el.startPoint.x, el.startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.tool === 'text' && el.startPoint && el.text) {
        ctx.font = `${el.fontSize || 24}px Inter, sans-serif`;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, el.startPoint.x, el.startPoint.y);
      }
    };

    // Draw saved elements
    elements.forEach(drawElement);

    // Draw current element
    if (currentElement) {
      drawElement(currentElement);
    }
  }, [elements, currentElement]);

  // Redraw when things change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getMousePos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'select') return;
    
    setIsDrawing(true);
    const pos = getMousePos(e);

    const newElement: DrawingElement = {
      id: crypto.randomUUID(),
      tool: activeTool,
      color: color,
      width: strokeWidth,
      points: [pos],
      startPoint: pos
    };

    if (activeTool === 'text') {
      const text = window.prompt('Enter text:');
      if (text) {
        newElement.text = text;
        newElement.fontSize = strokeWidth * 4; // Scale font size with stroke width roughly
        onElementComplete(newElement);
      }
      setIsDrawing(false);
      return;
    }

    setCurrentElement(newElement);
    
    // Capture pointer events to keep drawing even if mouse goes slightly outside
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentElement) return;

    const pos = getMousePos(e);

    if (activeTool === 'pen' || activeTool === 'eraser') {
      setCurrentElement({
        ...currentElement,
        points: [...currentElement.points, pos]
      });
    } else {
      // For shapes, update endpoint
      setCurrentElement({
        ...currentElement,
        endPoint: pos
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (currentElement) {
      // Finalize element
      onElementComplete(currentElement);
      setCurrentElement(null);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-white cursor-crosshair border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)]"
      style={{ touchAction: 'none' }} // Prevent scrolling on touch devices while drawing
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}
