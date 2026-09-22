/**
 * KaleidoscopeEngine.js
 * High-performance 2D Canvas N-Fold Symmetry Mirroring Engine.
 */
import { GenerativeParticleSource } from './GenerativeParticleSource.js';
import { AudioAnalyzer } from './AudioAnalyzer.js';
import { MediaManager } from './MediaManager.js';

export class KaleidoscopeEngine {
  constructor(mainCanvas, sourceCanvas) {
    this.canvas = mainCanvas;
    this.ctx = mainCanvas.getContext('2d', { alpha: false });

    this.sourceCanvas = sourceCanvas;
    this.sourceCtx = sourceCanvas.getContext('2d');

    // Engine Modules
    this.generativeSource = new GenerativeParticleSource(sourceCanvas);
    this.audioAnalyzer = new AudioAnalyzer();
    this.mediaManager = new MediaManager(sourceCanvas);

    // Kaleidoscope State & Parameters
    this.slices = 12;
    this.mirror = true;
    this.spinSpeed = 0.0;
    this.zoomScale = 1.0;
    this.zoomPulse = 0.0;
    this.trailEffect = 0.15;
    this.colorShiftRate = 0.5;

    // Interactive Drag / Pan & Angle State
    this.panOffset = { x: 0, y: 0 };
    this.targetPanOffset = { x: 0, y: 0 };
    this.rotationAngle = 0;
    this.hueShift = 0;
    this.time = 0;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this.resize();
    this.setupInteractionListeners();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    const sourceDim = Math.min(width, height) * 1.2;
    this.generativeSource.resize(sourceDim, sourceDim);
    this.mediaManager.drawingSource.resize(sourceDim, sourceDim);
  }

  getCanvasToSourceCoords(clientX, clientY) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const srcW = this.sourceCanvas.width;
    const srcH = this.sourceCanvas.height;

    const dx = clientX - w / 2 - this.panOffset.x;
    const dy = clientY - h / 2 - this.panOffset.y;

    return {
      x: srcW / 2 + dx / Math.max(0.1, this.zoomScale),
      y: srcH / 2 + dy / Math.max(0.1, this.zoomScale)
    };
  }

  setupInteractionListeners() {
    const onPointerDown = (e) => {
      this.isDragging = true;
      if (this.mediaManager.sourceType === 'draw') {
        const pt = this.getCanvasToSourceCoords(e.clientX, e.clientY);
        this.mediaManager.drawingSource.startStroke(pt.x, pt.y);
      } else {
        this.dragStart = { x: e.clientX - this.targetPanOffset.x, y: e.clientY - this.targetPanOffset.y };
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      if (this.mediaManager.sourceType === 'draw') {
        const pt = this.getCanvasToSourceCoords(e.clientX, e.clientY);
        this.mediaManager.drawingSource.moveStroke(pt.x, pt.y);
      } else {
        this.targetPanOffset.x = e.clientX - this.dragStart.x;
        this.targetPanOffset.y = e.clientY - this.dragStart.y;
      }
    };

    const onPointerUp = () => {
      this.isDragging = false;
      if (this.mediaManager.sourceType === 'draw') {
        this.mediaManager.drawingSource.endStroke();
      }
    };

    // Scroll wheel zoom
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY * -0.0015;
      this.zoomScale = Math.max(0.2, Math.min(4.0, this.zoomScale + delta));
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) onPointerDown(e.touches[0]);
    });
    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) onPointerMove(e.touches[0]);
    });
    window.addEventListener('touchend', onPointerUp);

    this.canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  update(dt) {
    this.time += dt;
    const audio = this.audioAnalyzer.update();

    // Update spin and hue shift
    const effectiveSpin = this.spinSpeed + (audio.volume * 2.0);
    this.rotationAngle += effectiveSpin * dt;
    this.hueShift += this.colorShiftRate * dt * 50;

    // Smooth lerp pan offsets
    this.panOffset.x += (this.targetPanOffset.x - this.panOffset.x) * 0.1;
    this.panOffset.y += (this.targetPanOffset.y - this.panOffset.y) * 0.1;

    // Update source canvas texture
    if (this.mediaManager.sourceType === 'generative') {
      this.generativeSource.update(dt, audio);
    } else {
      this.mediaManager.drawToCanvas(
        this.sourceCtx,
        this.sourceCanvas.width,
        this.sourceCanvas.height,
        this.generativeSource,
        this.time
      );
    }

    // Render Kaleidoscope radial symmetry onto main canvas
    this.renderKaleidoscope(audio);
  }

  renderKaleidoscope(audioData) {
    const width = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const height = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const cx = width / 2;
    const cy = height / 2;

    const radius = Math.sqrt(cx * cx + cy * cy) * 1.2;
    const stepAngle = (Math.PI * 2) / this.slices;

    // Trail / Motion Blur fade
    if (this.trailEffect > 0) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.trailEffect})`;
      this.ctx.fillRect(0, 0, width, height);
    } else {
      this.ctx.clearRect(0, 0, width, height);
    }

    // Dynamic Zoom calculation (incorporating pulse & audio bass)
    const pulseFactor = Math.sin(this.time * 2.5) * this.zoomPulse + (audioData.bass * 0.5);
    const curZoom = Math.max(0.1, this.zoomScale + pulseFactor);

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // Optional global color hue rotation filter
    if (this.colorShiftRate > 0) {
      this.ctx.filter = `hue-rotate(${Math.round(this.hueShift)}deg)`;
    }

    const srcW = this.sourceCanvas.width;
    const srcH = this.sourceCanvas.height;

    // Render N Slices
    for (let i = 0; i < this.slices; i++) {
      this.ctx.save();

      // Rotate each wedge slice
      this.ctx.rotate(i * stepAngle + this.rotationAngle);

      // Mirror reflection flip every alternate wedge
      if (this.mirror && i % 2 === 1) {
        this.ctx.scale(1, -1);
      }

      // Clip slice triangle wedge
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, -stepAngle / 2 - 0.01, stepAngle / 2 + 0.01);
      this.ctx.lineTo(0, 0);
      this.ctx.clip();

      // Draw source texture with zoom & pan offset
      this.ctx.save();
      this.ctx.scale(curZoom, curZoom);
      this.ctx.translate(this.panOffset.x, this.panOffset.y);

      this.ctx.drawImage(
        this.sourceCanvas,
        -srcW / 2,
        -srcH / 2,
        srcW,
        srcH
      );

      this.ctx.restore();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  takeSnapshot() {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `kaleidoscope_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
