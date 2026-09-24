import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KaleidoscopeEngine } from '../src/engine/KaleidoscopeEngine.js';

describe('KaleidoscopeEngine', () => {
  let mainCanvas;
  let sourceCanvas;
  let engine;

  beforeEach(() => {
    mainCanvas = document.createElement('canvas');
    sourceCanvas = document.createElement('canvas');
    mainCanvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 800
    });
    engine = new KaleidoscopeEngine(mainCanvas, sourceCanvas);
  });

  it('should initialize engine state correctly', () => {
    expect(engine.slices).toBe(12);
    expect(engine.mirror).toBe(true);
    expect(engine.spinSpeed).toBe(0.0);
    expect(engine.zoomScale).toBe(1.0);
    expect(engine.autoPaintAudio).toBe(false);
  });

  it('should compute canvas coordinates to source canvas coordinates correctly', () => {
    const coords = engine.getCanvasToSourceCoords(400, 400);
    expect(coords).toHaveProperty('x');
    expect(coords).toHaveProperty('y');
    expect(typeof coords.x).toBe('number');
    expect(typeof coords.y).toBe('number');
  });

  it('should update time, audio, spin, and render without crashing', () => {
    expect(() => {
      engine.update(0.016);
    }).not.toThrow();
  });
});
