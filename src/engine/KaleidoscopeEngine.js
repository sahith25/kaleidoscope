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
    this.autoPaintFingerCount = 3;
    this.apertureSize = 1.0; // 0.2 to 1.0 (tube aperture rim mask)
    this.mirrorRadiusScale = 1.0; // 0.2 to 2.0 (mirror reflection reach)

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
        this.mediaManager.drawingSource.startStroke(pt.x, pt.y, e.pointerId);
      } else {
        this.dragStart = { x: e.clientX - this.targetPanOffset.x, y: e.clientY - this.targetPanOffset.y };
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;

      if (this.mediaManager.sourceType === 'draw') {
        const pt = this.getCanvasToSourceCoords(e.clientX, e.clientY);
        this.mediaManager.drawingSource.moveStroke(pt.x, pt.y, e.pointerId);
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
          this.mediaManager.drawingSource.endStroke(e.pointerId);
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
      if (this.mediaManager.sourceType === 'draw' && this.autoPaintAudio) {
        const srcW = this.sourceCanvas.width;
        const srcH = this.sourceCanvas.height;
        const cx = srcW / 2;
        const cy = srcH / 2;
        const t = this.time;

        // Initialize virtual hand state with accumulated continuous phase integration & organic noise seeds
        if (!this.virtualHand) {
          this.virtualHand = {
            x: cx,
            y: cy,
            angle: 0,
            targetX: cx,
            targetY: cy,
            phase1: 0,
            phase2: 0,
            phase3: 0,
            noiseP1: Math.random() * 100,
            noiseP2: Math.random() * 100,
            noiseP3: Math.random() * 100,
            currentSpread: 1.0,
            randomAngleOffset: 0
          };
        }

        // Accumulate phase angles continuously (never jumps even when speedMult changes)
        const speedMult = 0.6 + (audio.mid * 1.2);
        this.virtualHand.phase1 += dt * 0.7 * speedMult;
        this.virtualHand.phase2 += dt * 1.3 * speedMult;
        this.virtualHand.phase3 += dt * 0.4 * speedMult;

        // Organic low-frequency smooth noise drift
        this.virtualHand.noiseP1 += dt * (0.2 + audio.bass * 0.5);
        this.virtualHand.noiseP2 += dt * (0.15 + audio.treble * 0.6);
        this.virtualHand.noiseP3 += dt * 0.3;

        const noiseX = Math.sin(this.virtualHand.noiseP1) * Math.cos(this.virtualHand.noiseP2 * 0.7) * (srcW * 0.12);
        const noiseY = Math.cos(this.virtualHand.noiseP2) * Math.sin(this.virtualHand.noiseP1 * 0.8) * (srcH * 0.12);

        // Transient audio peak burst (subtle random angle shift on loud beat hits)
        if (audio.bass > 0.65) {
          this.virtualHand.randomAngleOffset += (Math.sin(this.time * 20) * 0.15 - this.virtualHand.randomAngleOffset) * 0.2;
        } else {
          this.virtualHand.randomAngleOffset *= 0.92;
        }

        // Modulate radial distance dynamically (sweeps from 0% at center to 30% canvas width)
        const baseWander = srcW * 0.28;
        const radialFactor = Math.abs(Math.sin(this.virtualHand.phase3)); // 0.0 to 1.0
        const wanderRadius = baseWander * radialFactor;

        this.virtualHand.targetX = cx + Math.cos(this.virtualHand.phase1) * wanderRadius + Math.sin(this.virtualHand.phase2) * (wanderRadius * 0.35) + noiseX;
        this.virtualHand.targetY = cy + Math.sin(this.virtualHand.phase1 * 1.2) * wanderRadius + Math.cos(this.virtualHand.phase2 * 0.85) * (wanderRadius * 0.35) + noiseY;
        
        // Smooth lerp hand position
        this.virtualHand.x += (this.virtualHand.targetX - this.virtualHand.x) * 0.08;
        this.virtualHand.y += (this.virtualHand.targetY - this.virtualHand.y) * 0.08;
        
        // Hand orientation angle rotates gently with subtle organic randomness
        const organicAngleNoise = Math.sin(this.virtualHand.noiseP3) * 0.3;
        this.virtualHand.angle = Math.sin(t * 0.5) * 0.7 + Math.cos(t * 0.3) * 0.3 + organicAngleNoise + this.virtualHand.randomAngleOffset;

        // Smoothly lerp spreadFactor to eliminate sudden radial finger jumps
        const targetSpread = 1.0 + (audio.bass * 0.8);
        this.virtualHand.currentSpread += (targetSpread - this.virtualHand.currentSpread) * 0.1;
        const spreadFactor = this.virtualHand.currentSpread;

        // Generate N finger positions dynamically based on autoPaintFingerCount
        const count = Math.max(1, this.autoPaintFingerCount || 3);
        const baseOffsets = [];

        if (count === 1) {
          const radialWeave = Math.sin(t * 1.8) * (40 * spreadFactor);
          baseOffsets.push({ x: 0, y: -20 * spreadFactor + radialWeave });
        } else {
          const spacing = 84 / (count - 1);
          for (let i = 0; i < count; i++) {
            const relX = (-42 + i * spacing) * spreadFactor;
            // Arch fingers slightly in a natural curve with continuous radial weaving
            const arch = Math.sin((i / (count - 1)) * Math.PI) * 22 * spreadFactor;
            const radialWeave = Math.sin(t * 1.8 + i * 0.8) * (35 * spreadFactor);
            const relY = -10 * spreadFactor - arch + radialWeave;
            baseOffsets.push({ x: relX, y: relY });
          }
        }

        baseOffsets.forEach((off, id) => {
          // Treble adds subtle organic fingertip micro-jitter
          const jitterX = Math.sin(t * 12 + id * 3) * (2 + audio.treble * 8);
          const jitterY = Math.cos(t * 14 + id * 3) * (2 + audio.treble * 8);

          // Rotate finger offset by hand orientation angle
          const cosA = Math.cos(this.virtualHand.angle);
          const sinA = Math.sin(this.virtualHand.angle);

          const rx = off.x * cosA - off.y * sinA + jitterX;
          const ry = off.x * sinA + off.y * cosA + jitterY;

          // World position of fingertip
          const fx = this.virtualHand.x + rx;
          const fy = this.virtualHand.y + ry;

          this.mediaManager.drawingSource.moveStroke(fx, fy, 1001 + id);
        });

        // Cleanly prune stale finger IDs if finger count was lowered
        for (let staleId = 1001 + count; staleId <= 1010; staleId++) {
          if (this.mediaManager.drawingSource.strokePositions[staleId]) {
            this.mediaManager.drawingSource.endStroke(staleId);
          }
        }
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

    const maxRadius = Math.sqrt(cx * cx + cy * cy) * 1.2;
    const radius = maxRadius * this.mirrorRadiusScale;
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

    // Render Optical Kaleidoscope Brass Tube Aperture Mask
    if (this.apertureSize < 0.99) {
      const apertureR = (Math.min(width, height) / 2) * this.apertureSize;
      const outerR = Math.hypot(width, height);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      this.ctx.arc(0, 0, apertureR, 0, Math.PI * 2, true); // even-odd clipping ring
      this.ctx.fillStyle = '#05070c';
      this.ctx.fill();

      // Draw optical brass tube rim highlight & inner shadow
      this.ctx.beginPath();
      this.ctx.arc(0, 0, apertureR, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)'; // Warm brass tube rim
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

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

  startRecording() {
    if (this.isRecording) return false;

    try {
      const canvasStream = this.canvas.captureStream ? this.canvas.captureStream(120) : null;
      if (!canvasStream) {
        alert("Canvas stream capture is not supported in this browser.");
        return false;
      }

      const audioTracks = this.audioAnalyzer.getAudioTracks();
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioTracks
      ];

      const stream = new MediaStream(combinedTracks);
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4');

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `kaleidoscope_video_${Date.now()}.${ext}`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.warn("KaleidoscopeEngine: Video recording failed", err);
      alert("Could not start video recording: " + (err.message || err));
      this.isRecording = false;
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.isRecording = false;
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
      return false;
    } else {
      return this.startRecording();
    }
  }
}
