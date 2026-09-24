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
    this.autoPaintAudio = false;

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
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;

    const r = Math.hypot(dx, dy);
    const theta = Math.atan2(dy, dx);
    const deltaAngle = theta - this.rotationAngle;

    const stepAngle = (Math.PI * 2) / this.slices;
    const twoPi = Math.PI * 2;

    // Normalize deltaAngle into [0, 2PI)
    const normAngle = (deltaAngle % twoPi + twoPi) % twoPi;

    // Find closest slice index (centered at i * stepAngle)
    const i = Math.floor((normAngle + stepAngle / 2) / stepAngle) % this.slices;
    const centerAngle = i * stepAngle;
    const alpha = normAngle - centerAngle;

    // Invert angle for mirrored odd slices
    const phi = (this.mirror && (i % 2 === 1)) ? -alpha : alpha;

    const curZoom = Math.max(0.1, this.zoomScale);
    const r_p = r / curZoom;

    const srcW = this.sourceCanvas.width;
    const srcH = this.sourceCanvas.height;

    return {
      x: srcW / 2 + r_p * Math.cos(phi) - this.panOffset.x,
      y: srcH / 2 + r_p * Math.sin(phi) - this.panOffset.y
    };
  }

  setupInteractionListeners() {
    const onPointerDown = (e) => {
      // Ignore if clicking on UI overlay controls
      if (e.target !== this.canvas) return;

      this.isDragging = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch(err) {}

      if (this.mediaManager.sourceType === 'draw') {
        // Reset pan offset in Paint mode to keep drawing centered
        this.targetPanOffset = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };

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

    const onPointerUp = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try { this.canvas.releasePointerCapture(e.pointerId); } catch(err) {}

        if (this.mediaManager.sourceType === 'draw') {
          this.mediaManager.drawingSource.endStroke();
        }
      }
    };

    let initialPinchDist = null;
    let initialZoomScale = this.zoomScale;

    const onTouchStart = (e) => {
      if (e.target !== this.canvas) return;
      if (e.touches.length === 2) {
        this.isDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialZoomScale = this.zoomScale;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && initialPinchDist) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = curDist / initialPinchDist;
        this.zoomScale = Math.max(0.2, Math.min(4.0, initialZoomScale * factor));
      }
    };

    const onWheel = (e) => {
      if (e.target !== this.canvas) return;
      e.preventDefault();
      const delta = e.deltaY * -0.0015;
      this.zoomScale = Math.max(0.2, Math.min(4.0, this.zoomScale + delta));
    };

    const onTouchEnd = () => {
      initialPinchDist = null;
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointercancel', onPointerUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });

    this.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd);
    this.canvas.addEventListener('touchcancel', onTouchEnd);
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
      if (this.mediaManager.sourceType === 'draw' && this.autoPaintAudio && audio.volume > 0.01) {
        const srcW = this.sourceCanvas.width;
        const srcH = this.sourceCanvas.height;
        const cx = srcW / 2;
        const cy = srcH / 2;
        const t = this.time;

        // Finger 1 (Bass Sweep): Large flowing Lissajous orbit
        const r1 = (srcW * 0.20) + (audio.bass * 140);
        const x1 = cx + Math.cos(t * 1.4) * r1 + Math.sin(t * 0.8) * 35;
        const y1 = cy + Math.sin(t * 1.1) * r1 + Math.cos(t * 0.6) * 35;
        this.mediaManager.drawingSource.moveStroke(x1, y1, 1);

        // Finger 2 (Mid Range): Counter-rotating harmonic flower
        const r2 = (srcW * 0.14) + (audio.mid * 100);
        const x2 = cx + Math.cos(-t * 2.2 + 2.09) * r2;
        const y2 = cy + Math.sin(t * 1.8 + 2.09) * r2;
        this.mediaManager.drawingSource.moveStroke(x2, y2, 2);

        // Finger 3 (Treble Sparkler): Fast dancing orbital spiral
        const r3 = (srcW * 0.26) + (audio.treble * 80);
        const x3 = cx + Math.cos(t * 3.5 + 4.18) * r3 + Math.cos(t * 6.0) * (25 + audio.treble * 35);
        const y3 = cy + Math.sin(-t * 2.9 + 4.18) * r3 + Math.sin(t * 6.0) * (25 + audio.treble * 35);
        this.mediaManager.drawingSource.moveStroke(x3, y3, 3);
      }

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
