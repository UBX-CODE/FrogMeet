import { useState } from 'react';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import type { DrawingElement, ToolType } from './types';

export default function Whiteboard() {
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);

  const handleElementComplete = (element: DrawingElement) => {
    const newElements = [...elements, element];
    
    // If we are not at the end of history (e.g. undo was used), we discard the future history
    // historyStep goes from -1 (empty) to history.length - 1
    const newHistory = history.slice(0, historyStep + 1);
    
    setElements(newElements);
    setHistory([...newHistory, newElements]);
    setHistoryStep(newHistory.length);
  };

  const handleUndo = () => {
    if (historyStep >= 0) {
      const nextStep = historyStep - 1;
      setHistoryStep(nextStep);
      if (nextStep === -1) {
        setElements([]);
      } else {
        setElements(history[nextStep]);
      }
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setElements(history[nextStep]);
    }
  };

  const handleClear = () => {
    setElements([]);
    const newHistory = history.slice(0, historyStep + 1);
    setHistory([...newHistory, []]);
    setHistoryStep(newHistory.length);
  };

  return (
    <div className="relative w-full h-full flex p-2">
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={historyStep >= 0}
        canRedo={historyStep < history.length - 1}
      />
      <Canvas
        elements={elements}
        activeTool={activeTool}
        color={color}
        strokeWidth={strokeWidth}
        onElementComplete={handleElementComplete}
      />
    </div>
  );
}
