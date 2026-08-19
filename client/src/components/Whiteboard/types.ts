export type Point = {
  x: number;
  y: number;
};

export type ToolType = 'select' | 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export type DrawingElement = {
  id: string;
  tool: ToolType;
  points: Point[]; // For pen/eraser
  color: string;
  width: number;
  // For shapes (line, rectangle, circle)
  startPoint?: Point;
  endPoint?: Point;
  // For text
  text?: string;
  fontSize?: number;
};
