/**
 * main.js
 * Application Entry Point.
 */
import { KaleidoscopeEngine } from './engine/KaleidoscopeEngine.js';
import { ControlPanel } from './ui/ControlPanel.js';

window.addEventListener('DOMContentLoaded', () => {
  const kaleidoscopeCanvas = document.getElementById('kaleidoscopeCanvas');
  const sourceCanvas = document.getElementById('sourceCanvas');

  // Initialize Engine
  const engine = new KaleidoscopeEngine(kaleidoscopeCanvas, sourceCanvas);
  
  // Initialize UI Controls
  const ui = new ControlPanel(engine);

  // Resize handler
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Animation Loop
  let lastTime = performance.now();

  function renderLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    engine.update(dt);

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
});
