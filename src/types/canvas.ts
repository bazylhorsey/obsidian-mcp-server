/**
 * Types for Obsidian Canvas files
 * Based on official Obsidian canvas.d.ts
 */

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export type CanvasNode = CanvasFileNode | CanvasTextNode | CanvasLinkNode | CanvasGroupNode;

export interface CanvasNodeCommon {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface CanvasFileNode extends CanvasNodeCommon {
  type: 'file';
  file: string;
  subpath?: string;
}

export interface CanvasTextNode extends CanvasNodeCommon {
  type: 'text';
  text: string;
}

export interface CanvasLinkNode extends CanvasNodeCommon {
  type: 'link';
  url: string;
}

export interface CanvasGroupNode extends CanvasNodeCommon {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
  toEnd?: 'none' | 'arrow';
  color?: string;
  label?: string;
}

export interface CanvasColor {
  '1': string; // Red
  '2': string; // Orange
  '3': string; // Yellow
  '4': string; // Green
  '5': string; // Cyan
  '6': string; // Purple
}

export const CANVAS_COLORS: CanvasColor = {
  '1': '#ff6b6b',
  '2': '#f59e0b',
  '3': '#fbbf24',
  '4': '#10b981',
  '5': '#06b6d4',
  '6': '#a78bfa',
};
