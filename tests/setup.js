import { vi } from 'vitest';

function createMockContext2D() {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowBlur: 0,
    shadowColor: '',
    filter: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn()
    })
  };
  return ctx;
}

if (typeof window !== 'undefined' && HTMLCanvasElement) {
  HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') {
      if (!this._ctx2d) {
        this._ctx2d = createMockContext2D();
      }
      return this._ctx2d;
    }
    return null;
  };
}
