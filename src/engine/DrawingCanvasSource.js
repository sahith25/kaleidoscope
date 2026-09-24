/**
 * DrawingCanvasSource.js
 * Offscreen interactive paint/drawing canvas module.
 * Supports multi-finger touches, audio-reactive simulated finger brushes, and interconnected finger string art webs.
 */
export class DrawingCanvasSource {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.brushSize = 2;
    this.brushColor = 'rainbow'; // 'rainbow' or hex color '#a855f7'
    this.strokePositions = {}; // id -> { x, y }
    this.hueCounter = 0;
    this.connectFingers = true; // String Art / Interconnected Web mode (default enabled)

    this.initCanvas();
  }

  initCanvas() {
    // Fill initial dark backdrop with subtle radial glow
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.fillStyle = '#0a0d16';
    this.ctx.fillRect(0, 0, w, h);

    const grad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  resize(w, h) {
    if (w <= 0 || h <= 0) return;
    const oldW = this.canvas.width;
    const oldH = this.canvas.height;
    if (oldW === w && oldH === h) return;

    // Preserve existing drawing contents centered during resize
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = oldW;
    tempCanvas.height = oldH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.canvas, 0, 0);

    this.canvas.width = w;
    this.canvas.height = h;

    this.initCanvas();
    const offsetX = (w - oldW) / 2;
    const offsetY = (h - oldH) / 2;
    this.ctx.drawImage(tempCanvas, offsetX, offsetY);
  }

  clear() {
    this.strokePositions = {};
    this.initCanvas();
  }

  startStroke(x, y, id = 0) {
    this.strokePositions[id] = { x, y };
    this.drawDot(x, y, id);

    if (this.connectFingers) {
      this.drawConnectingWeb(Object.values(this.strokePositions));
    }
  }

  getStrokeColor(id = 0, offset = 0) {
    if (this.brushColor === 'rainbow') {
      const hue = (this.hueCounter + id * 70 + offset) % 360;
      return `hsl(${hue}, 100%, 65%)`;
    }
    return this.brushColor;
  }

  moveStroke(x, y, id = 0) {
    if (!this.strokePositions[id]) {
      this.startStroke(x, y, id);
      return;
    }

    const lastPos = this.strokePositions[id];
    this.strokePositions[id] = { x, y };

    // 1. Draw connecting web mesh layer FIRST so individual finger strokes render ON TOP (iPad stack layer behavior)
    if (this.connectFingers) {
      this.drawConnectingWeb(Object.values(this.strokePositions));
    }

    // 2. Draw continuous finger line on top
    this.hueCounter += 2;
    const color = this.getStrokeColor(id);

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowBlur = Math.max(3, this.brushSize * 1.5);
    this.ctx.shadowColor = color;

    this.ctx.beginPath();
    this.ctx.moveTo(lastPos.x, lastPos.y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  endStroke(id = 0) {
    delete this.strokePositions[id];
  }

  drawDot(x, y, id = 0) {
    this.hueCounter += 4;
    const color = this.getStrokeColor(id);

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = Math.max(3, this.brushSize * 1.5);
    this.ctx.shadowColor = color;

    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(1, this.brushSize / 2), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawConnectingWeb(points) {
    if (!points || points.length < 2) return;

    this.hueCounter += 2;
    this.ctx.save();
    this.ctx.lineWidth = Math.max(1, this.brushSize * 0.8);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        if (!p1 || !p2) continue;

        const color = this.getStrokeColor(i, j * 65);

        this.ctx.strokeStyle = color;
        this.ctx.shadowBlur = Math.max(3, this.brushSize * 1.5);
        this.ctx.shadowColor = color;

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }
}
