import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaManager } from '../src/engine/MediaManager.js';

describe('MediaManager', () => {
  let sourceCanvas;
  let mediaManager;

  beforeEach(() => {
    sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 500;
    sourceCanvas.height = 500;
    mediaManager = new MediaManager(sourceCanvas);
  });

  it('should default to generative source type', () => {
    expect(mediaManager.sourceType).toBe('generative');
  });

  it('should clear drawing canvas when setSourceType("draw") is called', async () => {
    const clearSpy = vi.spyOn(mediaManager.drawingSource, 'clear');
    const result = await mediaManager.setSourceType('draw');

    expect(result).toBe(true);
    expect(mediaManager.sourceType).toBe('draw');
    expect(clearSpy).toHaveBeenCalled();
  });

  it('should handle webcam stop on mode switch', () => {
    const stopSpy = vi.spyOn(mediaManager, 'stopWebcam');
    mediaManager.sourceType = 'webcam';

    mediaManager.setSourceType('generative');
    expect(stopSpy).toHaveBeenCalled();
    expect(mediaManager.sourceType).toBe('generative');
  });
});
