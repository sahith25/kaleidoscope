/**
 * AudioAnalyzer.js
 * Analyzes microphone spectrum or audio stream to produce audio-reactive values.
 */
export class AudioAnalyzer {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.dataArray = null;
    this.isActive = false;

    this.audioData = {
      volume: 0,
      bass: 0,
      mid: 0,
      treble: 0
    };
  }

  async toggleAudio() {
    if (this.isActive) {
      this.stop();
      return false;
    } else {
      const success = await this.start();
      return success;
    }
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.microphoneStream = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not access microphone", err);
      this.isActive = false;
      return false;
    }
  }

  stop() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isActive = false;
  }

  update() {
    if (!this.isActive || !this.analyser) {
      this.audioData = { volume: 0, bass: 0, mid: 0, treble: 0 };
      return this.audioData;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const length = this.dataArray.length;
    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const bassBins = Math.floor(length * 0.15);
    const midBins = Math.floor(length * 0.5);

    for (let i = 0; i < length; i++) {
      const val = this.dataArray[i] / 255;
      sum += val;

      if (i < bassBins) {
        bassSum += val;
      } else if (i < midBins) {
        midSum += val;
      } else {
        trebleSum += val;
      }
    }

    this.audioData = {
      volume: sum / length,
      bass: bassSum / bassBins,
      mid: midSum / (midBins - bassBins),
      treble: trebleSum / (length - midBins)
    };

    return this.audioData;
  }
}
