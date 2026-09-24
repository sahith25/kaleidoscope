import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioAnalyzer } from '../src/engine/AudioAnalyzer.js';

describe('AudioAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new AudioAnalyzer();
  });

  it('should initialize with default parameters', () => {
    expect(analyzer.isActive).toBe(false);
    expect(analyzer.sourceMode).toBe('mic');
    expect(analyzer.audioData).toEqual({ volume: 0, bass: 0, mid: 0, treble: 0 });
  });

  it('should return zeroes when updating while inactive', () => {
    const data = analyzer.update();
    expect(data).toEqual({ volume: 0, bass: 0, mid: 0, treble: 0 });
  });

  it('should stop audio streams and audio context when stop is called', () => {
    const mockTrack = { stop: vi.fn() };
    analyzer.microphoneStream = { getTracks: () => [mockTrack] };
    analyzer.audioCtx = { state: 'running', close: vi.fn().mockResolvedValue() };
    analyzer.isActive = true;

    analyzer.stop();

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(analyzer.microphoneStream).toBeNull();
    expect(analyzer.audioCtx).toBeNull();
    expect(analyzer.isActive).toBe(false);
  });

  it('should calculate volume, bass, mid, treble from frequency data array', () => {
    analyzer.isActive = true;
    analyzer.analyser = {
      getByteFrequencyData: (arr) => {
        arr.fill(128); // Fill with half intensity
      }
    };
    analyzer.dataArray = new Uint8Array(128);

    const data = analyzer.update();

    expect(data.volume).toBeGreaterThan(0.4);
    expect(data.bass).toBeGreaterThan(0.4);
    expect(data.mid).toBeGreaterThan(0.4);
    expect(data.treble).toBeGreaterThan(0.4);
  });
});
