import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingCanvasSource } from '../src/engine/DrawingCanvasSource.js';

describe('DrawingCanvasSource', () => {
  let canvas;
  let drawingSource;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    drawingSource = new DrawingCanvasSource(canvas);
  });

  it('should initialize with default brush size of 2px', () => {
    expect(drawingSource.brushSize).toBe(2);
    expect(drawingSource.brushColor).toBe('rainbow');
    expect(drawingSource.strokePositions).toEqual({});
  });

  it('should clear canvas and reset stroke positions', () => {
    drawingSource.startStroke(100, 100, 1);
    expect(drawingSource.strokePositions[1]).toBeDefined();

    drawingSource.clear();
    expect(drawingSource.strokePositions).toEqual({});
  });

  it('should start, move, and end strokes for multi-finger touch IDs', () => {
    drawingSource.startStroke(10, 20, 1);
    expect(drawingSource.strokePositions[1]).toEqual({ x: 10, y: 20 });

    drawingSource.moveStroke(30, 40, 1);
    expect(drawingSource.strokePositions[1]).toEqual({ x: 30, y: 40 });

    drawingSource.startStroke(50, 60, 2);
    expect(drawingSource.strokePositions[2]).toEqual({ x: 50, y: 60 });

    drawingSource.endStroke(1);
    expect(drawingSource.strokePositions[1]).toBeUndefined();
    expect(drawingSource.strokePositions[2]).toEqual({ x: 50, y: 60 });
  });

  it('should resize canvas while maintaining content canvas size', () => {
    drawingSource.resize(1000, 1000);
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(1000);
  });
});
