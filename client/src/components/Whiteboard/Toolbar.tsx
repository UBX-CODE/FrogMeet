import { MousePointer2, Pencil, Eraser, Minus, Square, Circle, Type, Undo, Redo, Trash2 } from 'lucide-react';
import type { ToolType } from './types';

type ToolbarProps = {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const COLORS = ['#000000', '#FF3300', '#0055FF', '#00E676', '#FF0055', '#F5A623', '#9013FE'];
const WIDTHS = [2, 4, 6, 8, 12, 16];

export default function Toolbar({
  activeTool,
  setActiveTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}: ToolbarProps) {
  
  const ToolButton = ({ tool, icon: Icon, label }: { tool: ToolType, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTool(tool)}
      title={label}
      className={`flex items-center justify-center p-2 border-[3px] border-black transition-all ${
        activeTool === tool
          ? 'bg-black text-white shadow-none translate-x-1 translate-y-1'
          : 'bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-[#F4F0E6] active:shadow-none active:translate-x-1 active:translate-y-1'
      }`}
    >
      <Icon size={20} />
    </button>
  );

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-4 bg-white p-4 border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] w-20 sm:w-24 md:w-auto h-auto max-h-[calc(100%-2rem)] overflow-y-auto">
      {/* Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ToolButton tool="select" icon={MousePointer2} label="Select" />
        <ToolButton tool="pen" icon={Pencil} label="Pen" />
        <ToolButton tool="eraser" icon={Eraser} label="Eraser" />
        <ToolButton tool="line" icon={Minus} label="Line" />
        <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
        <ToolButton tool="circle" icon={Circle} label="Circle" />
        <ToolButton tool="text" icon={Type} label="Text" />
      </div>

      <div className="w-full h-[4px] bg-black my-1"></div>

      {/* Colors */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider hidden md:block">Color</span>
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-none border-[3px] border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform ${color === c ? 'scale-125 shadow-none translate-y-1' : ''}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-[4px] bg-black my-1"></div>

      {/* Stroke Width */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider hidden md:block">Size</span>
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0 px-1">
          {WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`rounded-full bg-black transition-transform ${strokeWidth === w ? 'ring-2 ring-offset-2 ring-black scale-125' : 'opacity-60 hover:opacity-100'}`}
              style={{ width: w + 2, height: w + 2 }}
              title={`${w}px`}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-[4px] bg-black my-1"></div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="flex items-center justify-center p-2 bg-white text-black border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-[#F4F0E6] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:shadow-none disabled:translate-x-1 disabled:translate-y-1 transition-all"
        >
          <Undo size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className="flex items-center justify-center p-2 bg-white text-black border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-[#F4F0E6] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:shadow-none disabled:translate-x-1 disabled:translate-y-1 transition-all"
        >
          <Redo size={18} />
        </button>
        <button
          onClick={onClear}
          title="Clear Canvas"
          className="flex items-center justify-center p-2 bg-[#FF3300] text-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
