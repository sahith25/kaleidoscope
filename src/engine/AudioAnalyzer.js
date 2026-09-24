/**
 * AudioAnalyzer.js
 * Analyzes microphone spectrum, audio stream, system audio (loopback), or local song/audio files to produce audio-reactive values.
 */
export class AudioAnalyzer {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.systemStream = null;
    this.audioElement = null;
    this.mediaElementSource = null;
    this.micSource = null;
    this.systemSource = null;
    this.dataArray = null;
    this.isActive = false;
    this.sourceMode = 'mic'; // 'mic', 'file', 'system'
    this.fileName = '';

    this.audioData = {
      volume: 0,
      bass: 0,
      mid: 0,
      treble: 0
    };
  }

  ensureAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.analyser) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    return this.audioCtx;
  }

  async startMic() {
    this.stop();
    // Synchronously initialize & resume AudioContext during user click gesture
    this.ensureAudioContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }, 
        video: false 
      });
      this.microphoneStream = stream;

      // Resume AudioContext again once permission is granted
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.micSource = this.audioCtx.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);

      this.isActive = true;
      this.sourceMode = 'mic';
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not access microphone", err);
      alert("Microphone access issue: " + (err.message || err.name || "Permission denied or mic unavailable"));
      this.stop();
      return false;
    }
  }

  async startSystemAudio() {
    this.stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("System audio capture is not supported on this browser. Try uploading an audio file instead.");
      return false;
    }

    this.ensureAudioContext();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      this.systemStream = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        alert("No internal audio track was selected. Please make sure to check 'Share audio' in the browser dialog.");
        this.stop();
        return false;
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.systemSource = this.audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
      this.systemSource.connect(this.analyser);

      this.isActive = true;
      this.sourceMode = 'system';

      audioTracks[0].onended = () => {
        this.stop();
      };
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not access system audio", err);
      this.stop();
      return false;
    }
  }

  async loadAudioFile(file) {
    this.stop();
    this.ensureAudioContext();

    try {
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
        this.mediaElementSource = this.audioCtx.createMediaElementSource(this.audioElement);
        this.mediaElementSource.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }

      const url = URL.createObjectURL(file);
      this.audioElement.src = url;
      this.audioElement.loop = true;
      this.fileName = file.name;

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      await this.audioElement.play();
      this.isActive = true;
      this.sourceMode = 'file';
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not load audio file", err);
      this.stop();
      return false;
    }
  }

  async playAudioFile() {
    if (this.audioElement && this.audioElement.src) {
      this.ensureAudioContext();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      try {
        await this.audioElement.play();
        this.isActive = true;
        this.sourceMode = 'file';
        return true;
      } catch (err) {
        console.warn("AudioAnalyzer: Play failed", err);
        this.isActive = false;
        return false;
      }
    }
    return false;
  }

  pauseAudioFile() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isActive = false;
  }

  stop() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.micSource) {
      try { this.micSource.disconnect(); } catch (e) {}
      this.micSource = null;
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach(track => track.stop());
      this.systemStream = null;
    }
    if (this.systemSource) {
      try { this.systemSource.disconnect(); } catch (e) {}
      this.systemSource = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isActive = false;
  }

  update() {
    if (!this.isActive || !this.analyser) {
      this.audioData = { volume: 0, bass: 0, mid: 0, treble: 0 };
      return this.audioData;
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
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
