/**
 * MediaManager.js
 * Manages custom image uploads, webcam streaming, procedural generative canvas, and interactive drawing canvas.
 */
import { DrawingCanvasSource } from './DrawingCanvasSource.js';

export class MediaManager {
  constructor(sourceCanvas) {
    this.sourceType = 'generative'; // 'generative', 'draw', 'image', 'webcam'
    this.uploadedImage = null;
    this.webcamVideo = null;
    this.webcamStream = null;
    this.drawingSource = new DrawingCanvasSource(sourceCanvas);
  }

  async setSourceType(type, file = null) {
    // Cleanup previous webcam if switching away
    if (this.sourceType === 'webcam' && type !== 'webcam') {
      this.stopWebcam();
    }

    this.sourceType = type;

    if (type === 'draw') {
      this.drawingSource.clear();
      return true;
    } else if (type === 'image' && file) {
      return await this.loadImageFromFile(file);
    } else if (type === 'webcam') {
      return await this.startWebcam();
    }
    return true;
  }

  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.uploadedImage = img;
          resolve(true);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async startWebcam(facingMode = 'environment') {
    this.stopWebcam();

    this.currentFacingMode = facingMode;
    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      this.webcamStream = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      await video.play();

      this.webcamVideo = video;
      return true;
    } catch (err) {
      console.warn("MediaManager: Webcam access failed", err);
      this.sourceType = 'generative';
      return false;
    }
  }

  async toggleCameraFacing() {
    const nextMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return await this.startWebcam(nextMode);
  }

  stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
    if (this.webcamVideo) {
      this.webcamVideo.pause();
      this.webcamVideo.srcObject = null;
      this.webcamVideo = null;
    }
  }

  drawToCanvas(ctx, width, height, generativeSource, time) {
    if (this.sourceType === 'draw') {
      // Drawing canvas content is already in sourceCanvas
      return;
    } else if (this.sourceType === 'image' && this.uploadedImage) {
      const img = this.uploadedImage;
      const scale = Math.max(width / img.width, height / img.height);
      const nw = img.width * scale;
      const nh = img.height * scale;
      const nx = (width - nw) / 2;
      const ny = (height - nh) / 2;

      ctx.save();
      ctx.drawImage(img, nx, ny, nw, nh);
      ctx.restore();
    } else if (this.sourceType === 'webcam' && this.webcamVideo) {
      const vid = this.webcamVideo;
      if (vid.readyState >= vid.HAVE_CURRENT_DATA) {
        const scale = Math.max(width / vid.videoWidth, height / vid.videoHeight);
        const nw = vid.videoWidth * scale;
        const nh = vid.videoHeight * scale;
        const nx = (width - nw) / 2;
        const ny = (height - nh) / 2;

        ctx.save();
        ctx.drawImage(vid, nx, ny, nw, nh);
        ctx.restore();
      }
    } else {
      // Generative Particle Source
      generativeSource.update(0.016);
    }
  }
}
