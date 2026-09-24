import { describe, it, expect, beforeEach } from 'vitest';
import { GenerativeParticleSource } from '../src/engine/GenerativeParticleSource.js';

describe('GenerativeParticleSource', () => {
  let canvas;
  let genSource;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    genSource = new GenerativeParticleSource(canvas);
  });

  it('should initialize with 75 particles for complexity 15', () => {
    expect(genSource.complexity).toBe(15);
    expect(genSource.particles.length).toBe(75);
  });

  it('should change particle count when complexity is updated', () => {
    genSource.setComplexity(20);
    expect(genSource.complexity).toBe(20);
    expect(genSource.particles.length).toBe(100);
  });

  it('should update palette themes correctly', () => {
    genSource.setPalette('cyber');
    expect(genSource.paletteHues).toEqual([180, 195, 300, 320]);

    genSource.setPalette('psychedelic');
    expect(genSource.paletteHues).toBeNull();
  });

  it('should update particles smoothly without errors', () => {
    expect(() => {
      genSource.update(0.016, { volume: 0.5, bass: 0.8, mid: 0.3, treble: 0.6 });
    }).not.toThrow();
  });
});
