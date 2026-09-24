/**
 * ControlPanel.js
 * Handles UI interactions, slider updates, preset switches, audio toggles, snapshot exports, and icons rendering.
 */
import { 
  createIcons, 
  Sparkles, 
  Mic, 
  MicOff, 
  Camera, 
  Sliders, 
  SlidersHorizontal, 
  Maximize, 
  UploadCloud, 
  Palette, 
  Image, 
  Video, 
  PieChart, 
  RotateCw, 
  ZoomIn, 
  Activity, 
  Ghost, 
  Sun, 
  Layers, 
  MousePointer, 
  Paintbrush,
  Trash2,
  X,
  Music,
  Disc,
  Volume2
} from 'lucide';

export class ControlPanel {
  constructor(engine) {
    this.engine = engine;
    this.presets = {
      cosmic: {
        slices: 12,
        mirror: true,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.15,
        colorShift: 0.5,
        complexity: 15
      },
      cyber: {
        slices: 8,
        mirror: true,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.35,
        colorShift: 1.2,
        complexity: 25
      },
      stainedGlass: {
        slices: 16,
        mirror: false,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.0,
        colorShift: 0.1,
        complexity: 30
      },
      liquidGold: {
        slices: 6,
        mirror: true,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.25,
        colorShift: 0.2,
        complexity: 10
      },
      psychedelic: {
        slices: 24,
        mirror: true,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.4,
        colorShift: 1.8,
        complexity: 35
      },
      crystalCave: {
        slices: 14,
        mirror: true,
        spin: 0.0,
        zoom: 1.0,
        pulse: 0.0,
        trail: 0.1,
        colorShift: 0.4,
        complexity: 20
      }
    };

    this.initLucideIcons();
    this.bindControls();
    this.setupDragAndDrop();
  }

  initLucideIcons() {
    createIcons({
      icons: {
        Sparkles, 
        Mic, 
        MicOff, 
        Camera, 
        Sliders, 
        SlidersHorizontal, 
        Maximize, 
        UploadCloud, 
        Palette, 
        Image, 
        Video, 
        PieChart, 
        RotateCw, 
        ZoomIn, 
        Activity, 
        Ghost, 
        Sun, 
        Layers, 
        MousePointer, 
        Paintbrush,
        Trash2,
        X,
        Music,
        Disc,
        Volume2
      }
    });
  }

  bindControls() {
    // Elements
    const panel = document.getElementById('controlPanel');
    const btnToggleUI = document.getElementById('btnToggleUI');
    const btnClosePanel = document.getElementById('btnClosePanel');

    // Toggle Sidebar Panel
    const togglePanel = () => {
      panel.classList.toggle('translate-x-0');
      panel.classList.toggle('translate-x-[110%]');
    };

    btnToggleUI.addEventListener('click', togglePanel);
    btnClosePanel.addEventListener('click', togglePanel);

    // Fullscreen Toggle
    const btnFullscreen = document.getElementById('btnFullscreen');
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    });

    // Snapshot Button
    const btnSnapshot = document.getElementById('btnSnapshot');
    btnSnapshot.addEventListener('click', () => this.engine.takeSnapshot());

    // Audio Elements
    const btnToggleAudio = document.getElementById('btnToggleAudio');
    const iconMic = document.getElementById('iconMic');
    const labelAudio = document.getElementById('labelAudio');

    const updateAudioHeaderUI = (active, labelText = null) => {
      btnToggleAudio.classList.toggle('active', active);
      if (active) {
        iconMic.setAttribute('data-lucide', 'mic');
        labelAudio.textContent = labelText || 'Audio Active';
      } else {
        iconMic.setAttribute('data-lucide', 'mic-off');
        labelAudio.textContent = 'Audio Reactive';
      }
      this.initLucideIcons();
    };

    btnToggleAudio.addEventListener('click', async () => {
      const active = await this.engine.audioAnalyzer.toggleAudio();
      updateAudioHeaderUI(active);
    });

    // Audio Input Selector Buttons
    const audioSrcMic = document.getElementById('audioSrcMic');
    const audioSrcFile = document.getElementById('audioSrcFile');
    const audioSrcSystem = document.getElementById('audioSrcSystem');
    const audioFileInput = document.getElementById('audioFileInput');
    const songFileStatus = document.getElementById('songFileStatus');
    const songFileName = document.getElementById('songFileName');
    const btnPlayPauseSong = document.getElementById('btnPlayPauseSong');

    const updateAudioSrcButtons = (activeBtn) => {
      [audioSrcMic, audioSrcFile, audioSrcSystem].forEach(btn => btn?.classList.remove('active'));
      activeBtn?.classList.add('active');
    };

    if (audioSrcMic) {
      audioSrcMic.addEventListener('click', async () => {
        updateAudioSrcButtons(audioSrcMic);
        if (songFileStatus) songFileStatus.classList.add('hidden');
        const ok = await this.engine.audioAnalyzer.startMic();
        updateAudioHeaderUI(ok, 'Mic Active');
      });
    }

    if (audioSrcFile) {
      audioSrcFile.addEventListener('click', () => {
        audioFileInput.click();
      });
    }

    if (audioFileInput) {
      audioFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const ok = await this.engine.audioAnalyzer.loadAudioFile(file);
          if (ok) {
            updateAudioSrcButtons(audioSrcFile);
            if (songFileStatus) songFileStatus.classList.remove('hidden');
            if (songFileName) songFileName.textContent = file.name;
            updateAudioHeaderUI(true, 'Song Playing');
          }
        }
      });
    }

    if (btnPlayPauseSong) {
      btnPlayPauseSong.addEventListener('click', async () => {
        if (this.engine.audioAnalyzer.isActive) {
          this.engine.audioAnalyzer.pauseAudioFile();
          updateAudioHeaderUI(false);
          btnPlayPauseSong.textContent = 'Play';
        } else {
          const ok = await this.engine.audioAnalyzer.playAudioFile();
          updateAudioHeaderUI(ok, 'Song Playing');
          btnPlayPauseSong.textContent = 'Pause';
        }
      });
    }

    if (audioSrcSystem) {
      audioSrcSystem.addEventListener('click', async () => {
        if (songFileStatus) songFileStatus.classList.add('hidden');
        const ok = await this.engine.audioAnalyzer.startSystemAudio();
        if (ok) {
          updateAudioSrcButtons(audioSrcSystem);
          updateAudioHeaderUI(true, 'System Audio');
        }
      });
    }

    // Source Selector Buttons
    const srcGenerative = document.getElementById('srcGenerative');
    const srcDraw = document.getElementById('srcDraw');
    const srcImage = document.getElementById('srcImage');
    const srcWebcam = document.getElementById('srcWebcam');
    const fileInput = document.getElementById('fileInput');
    const drawControls = document.getElementById('drawControls');
    const cameraControls = document.getElementById('cameraControls');
    const btnFlipCamera = document.getElementById('btnFlipCamera');
    const presetBar = document.getElementById('presetBar');

    const updateSrcButtons = (activeBtn, mode = 'generative') => {
      [srcGenerative, srcDraw, srcImage, srcWebcam].forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
      if (drawControls) drawControls.classList.toggle('hidden', mode !== 'draw');
      if (cameraControls) cameraControls.classList.toggle('hidden', mode !== 'webcam');
      
      // Presets should not be visible in paint mode
      if (presetBar) {
        presetBar.classList.toggle('hidden', mode === 'draw');
      }
    };

    srcGenerative.addEventListener('click', () => {
      this.engine.mediaManager.setSourceType('generative');
      updateSrcButtons(srcGenerative, 'generative');
    });

    srcDraw.addEventListener('click', () => {
      this.engine.mediaManager.setSourceType('draw');
      updateSrcButtons(srcDraw, 'draw');
    });

    srcImage.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const ok = await this.engine.mediaManager.setSourceType('image', e.target.files[0]);
        if (ok) updateSrcButtons(srcImage, 'image');
      }
    });

    srcWebcam.addEventListener('click', async () => {
      const ok = await this.engine.mediaManager.setSourceType('webcam');
      if (ok) updateSrcButtons(srcWebcam, 'webcam');
      else alert("Webcam access requested but could not be initialized.");
    });

    if (btnFlipCamera) {
      btnFlipCamera.addEventListener('click', async () => {
        await this.engine.mediaManager.toggleCameraFacing();
      });
    }

    // Paint / Draw Controls
    this.bindSlider('sliderBrushSize', 'valBrushSize', (val) => {
      this.engine.mediaManager.drawingSource.brushSize = parseInt(val, 10);
      const valDisplay = document.getElementById('valBrushSize');
      if (valDisplay) valDisplay.textContent = `${val}px`;
    });

    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.getAttribute('data-color');
        this.engine.mediaManager.drawingSource.brushColor = color;
      });
    });

    const btnClearDraw = document.getElementById('btnClearDraw');
    if (btnClearDraw) {
      btnClearDraw.addEventListener('click', () => {
        this.engine.mediaManager.drawingSource.clear();
      });
    }

    const btnAutoPaintAudio = document.getElementById('btnAutoPaintAudio');
    const labelAutoPaint = document.getElementById('labelAutoPaint');
    if (btnAutoPaintAudio) {
      btnAutoPaintAudio.addEventListener('click', () => {
        this.engine.autoPaintAudio = !this.engine.autoPaintAudio;
        btnAutoPaintAudio.classList.toggle('active', this.engine.autoPaintAudio);
        if (labelAutoPaint) {
          labelAutoPaint.textContent = this.engine.autoPaintAudio 
            ? '3-Finger Audio Paint: ON' 
            : '3-Finger Audio Auto-Paint';
        }
      });
    }

    // Sliders binding
    this.bindSlider('sliderSymmetry', 'valSymmetry', (val) => {
      this.engine.slices = parseInt(val, 10);
    });

    this.bindSlider('sliderSpin', 'valSpin', (val) => {
      this.engine.spinSpeed = parseFloat(val);
    });

    this.bindSlider('sliderZoom', 'valZoom', (val) => {
      this.engine.zoomScale = parseFloat(val);
    });

    this.bindSlider('sliderPulse', 'valPulse', (val) => {
      this.engine.zoomPulse = parseFloat(val);
    });

    this.bindSlider('sliderTrail', 'valTrail', (val) => {
      this.engine.trailEffect = parseFloat(val);
    });

    this.bindSlider('sliderColorShift', 'valColorShift', (val) => {
      this.engine.colorShiftRate = parseFloat(val);
    });

    this.bindSlider('sliderComplexity', 'valComplexity', (val) => {
      const comp = parseInt(val, 10);
      this.engine.generativeSource.setComplexity(comp);
    });

    // Checkbox Mirroring
    const checkMirror = document.getElementById('checkMirror');
    checkMirror.addEventListener('change', (e) => {
      this.engine.mirror = e.target.checked;
    });

    // Presets Bar
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const presetKey = btn.getAttribute('data-preset');
        if (this.presets[presetKey]) {
          this.applyPreset(presetKey, this.presets[presetKey]);
        }
      });
    });
  }

  bindSlider(sliderId, valueId, onChange) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (valueDisplay) valueDisplay.textContent = val;
      onChange(val);
    });
  }

  applyPreset(presetKey, preset) {
    if (this.engine.mediaManager.sourceType === 'draw') {
      this.engine.mediaManager.setSourceType('generative');
      const srcGenerative = document.getElementById('srcGenerative');
      const srcDraw = document.getElementById('srcDraw');
      const srcImage = document.getElementById('srcImage');
      const srcWebcam = document.getElementById('srcWebcam');
      const drawControls = document.getElementById('drawControls');
      const presetBar = document.getElementById('presetBar');

      if (srcGenerative && srcDraw) {
        [srcGenerative, srcDraw, srcImage, srcWebcam].forEach(btn => btn?.classList.remove('active'));
        srcGenerative.classList.add('active');
      }
      if (drawControls) drawControls.classList.add('hidden');
      if (presetBar) presetBar.classList.remove('hidden');
    }

    this.engine.slices = preset.slices;
    this.engine.mirror = preset.mirror;
    this.engine.spinSpeed = preset.spin;
    this.engine.zoomScale = preset.zoom;
    this.engine.zoomPulse = preset.pulse;
    this.engine.trailEffect = preset.trail;
    this.engine.colorShiftRate = preset.colorShift;
    this.engine.generativeSource.setComplexity(preset.complexity);
    this.engine.generativeSource.setPalette(presetKey);

    // Sync UI elements
    this.updateUIVal('sliderSymmetry', 'valSymmetry', preset.slices);
    this.updateUIVal('sliderSpin', 'valSpin', preset.spin);
    this.updateUIVal('sliderZoom', 'valZoom', preset.zoom);
    this.updateUIVal('sliderPulse', 'valPulse', preset.pulse);
    this.updateUIVal('sliderTrail', 'valTrail', preset.trail);
    this.updateUIVal('sliderColorShift', 'valColorShift', preset.colorShift);
    this.updateUIVal('sliderComplexity', 'valComplexity', preset.complexity);

    document.getElementById('checkMirror').checked = preset.mirror;
  }

  updateUIVal(sliderId, valId, val) {
    const slider = document.getElementById(sliderId);
    const valSpan = document.getElementById(valId);
    if (slider) slider.value = val;
    if (valSpan) valSpan.textContent = val;
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const dropBadge = document.getElementById('dropBadge');

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropBadge.classList.remove('opacity-0', 'scale-95');
      dropBadge.classList.add('opacity-100', 'scale-100');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        dropBadge.classList.remove('opacity-100', 'scale-100');
        dropBadge.classList.add('opacity-0', 'scale-95');
      }
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropBadge.classList.remove('opacity-100', 'scale-100');
      dropBadge.classList.add('opacity-0', 'scale-95');

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const ok = await this.engine.mediaManager.setSourceType('image', file);
          if (ok) {
            const srcImage = document.getElementById('srcImage');
            const srcGenerative = document.getElementById('srcGenerative');
            const srcWebcam = document.getElementById('srcWebcam');
            [srcGenerative, srcImage, srcWebcam].forEach(btn => btn.classList.remove('active'));
            srcImage.classList.add('active');
          }
        }
      }
    });
  }
}
