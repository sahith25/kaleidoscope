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

  async toggleAudio() {
    if (this.isActive) {
      this.stop();
      return false;
    } else {
      if (this.sourceMode === 'file' && this.audioElement && this.audioElement.src) {
        return await this.playAudioFile();
      } else {
        return await this.startMic();
      }
    }
  }

  async startMic() {
    this.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.microphoneStream = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;
      this.sourceMode = 'mic';
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not access microphone", err);
      this.isActive = false;
      return false;
    }
  }

  async startSystemAudio() {
    this.stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("System audio capture is not supported on this browser. Try uploading an audio file instead.");
      return false;
    }
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

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;
      this.sourceMode = 'system';

      audioTracks[0].onended = () => {
        this.stop();
      };
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not access system audio", err);
      this.isActive = false;
      return false;
    }
  }

  async loadAudioFile(file) {
    this.stop();
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      if (!this.mediaElementSource) {
        this.mediaElementSource = this.audioCtx.createMediaElementSource(this.audioElement);
      }
      this.mediaElementSource.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const url = URL.createObjectURL(file);
      this.audioElement.src = url;
      this.audioElement.loop = true;
      this.fileName = file.name;

      await this.audioElement.play();
      this.isActive = true;
      this.sourceMode = 'file';
      return true;
    } catch (err) {
      console.warn("AudioAnalyzer: Could not load audio file", err);
      this.isActive = false;
      return false;
    }
  }

  async playAudioFile() {
    if (this.audioElement && this.audioElement.src) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      await this.audioElement.play();
      this.isActive = true;
      return true;
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
    if (this.systemStream) {
      this.systemStream.getTracks().forEach(track => track.stop());
      this.systemStream = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.mediaElementSource = null;
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
