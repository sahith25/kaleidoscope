/**
 * DrawingCanvasSource.js
 * Offscreen interactive paint/drawing canvas module.
 * Allows drawing strokes that instantly project into N-fold kaleidoscope symmetry.
 */
export class DrawingCanvasSource {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.brushSize = 12;
    this.brushColor = 'rainbow'; // 'rainbow' or hex color '#a855f7'
    this.isDrawing = false;
    this.lastPos = null;
    this.hueCounter = 0;

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
    // Preserve existing drawing contents during resize
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.canvas, 0, 0);

    this.canvas.width = w;
    this.canvas.height = h;

    this.initCanvas();
    this.ctx.drawImage(tempCanvas, 0, 0, w, h);
  }

  clear() {
    this.initCanvas();
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this.lastPos = { x, y };
    this.drawDot(x, y);
  }

  moveStroke(x, y) {
    if (!this.isDrawing || !this.lastPos) return;

    this.hueCounter += 3;
    const color = this.brushColor === 'rainbow' 
      ? `hsl(${this.hueCounter % 360}, 100%, 65%)` 
      : this.brushColor;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowBlur = this.brushSize * 1.5;
    this.ctx.shadowColor = color;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPos.x, this.lastPos.y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.restore();

    this.lastPos = { x, y };
  }

  endStroke() {
    this.isDrawing = false;
    this.lastPos = null;
  }

  drawDot(x, y) {
    this.hueCounter += 5;
    const color = this.brushColor === 'rainbow' 
      ? `hsl(${this.hueCounter % 360}, 100%, 65%)` 
      : this.brushColor;

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = this.brushSize * 1.5;
    this.ctx.shadowColor = color;

    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
}
