/**
 * GenerativeParticleSource.js
 * Produces dynamic, vibrant, evolving procedural shapes, glowing stars, 
 * geometry rings, and color gradients on an offscreen canvas.
 */
export class GenerativeParticleSource {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.time = 0;
    this.complexity = 15;
    this.hueOffset = 0;
    this.paletteTheme = 'cosmic';
    this.paletteHues = [270, 290, 310, 250];

    this.resize(800, 800);
    this.initParticles();
  }

  setPalette(theme) {
    this.paletteTheme = theme;
    switch(theme) {
      case 'cyber':
        this.paletteHues = [180, 195, 300, 320];
        break;
      case 'stainedGlass':
        this.paletteHues = [215, 350, 45, 140];
        break;
      case 'liquidGold':
        this.paletteHues = [40, 45, 35, 50];
        break;
      case 'psychedelic':
        this.paletteHues = null; // full rainbow spectrum
        break;
      case 'crystalCave':
        this.paletteHues = [175, 190, 205, 160];
        break;
      case 'cosmic':
      default:
        this.paletteHues = [270, 290, 310, 250];
        break;
    }
  }

  getHue(seed = 0) {
    if (!this.paletteHues) {
      return (this.hueOffset + seed) % 360;
    }
    const idx = Math.floor(Math.abs(seed + this.hueOffset * 0.05)) % this.paletteHues.length;
    return this.paletteHues[idx];
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  initParticles() {
    this.particles = [];
    const count = this.complexity * 5;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 25 + 5,
        shape: Math.floor(Math.random() * 4), // 0: circle, 1: star/polygon, 2: ring, 3: line
        hueSeed: i * 27,
        speed: (Math.random() - 0.5) * 0.03,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * (w / 3) + 20
      });
    }
  }

  setComplexity(complexity) {
    if (this.complexity !== complexity) {
      this.complexity = complexity;
      this.initParticles();
    }
  }

  update(dt, audioData = null) {
    this.time += dt;
    this.hueOffset += dt * 20;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const bass = audioData ? audioData.bass : 0;
    const treble = audioData ? audioData.treble : 0;

    // Clear background with soft gradient swirl
    const bgGrad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 1.5);
    const bgHue = this.getHue(0);
    bgGrad.addColorStop(0, `hsla(${bgHue}, 80%, 15%, 1)`);
    bgGrad.addColorStop(0.5, `hsla(${(bgHue + 40) % 360}, 70%, 8%, 1)`);
    bgGrad.addColorStop(1, `hsla(${(bgHue + 80) % 360}, 90%, 3%, 1)`);
    
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, w, h);

    // Draw central spinning geometric rings
    this.ctx.save();
    this.ctx.translate(cx, cy);

    const ringCount = 5;
    for (let r = 0; r < ringCount; r++) {
      const radius = (r + 1) * 45 + Math.sin(this.time * 2 + r) * 15 + bass * 40;
      const ringHue = this.getHue(r * 45);

      this.ctx.save();
      this.ctx.rotate(this.time * (r % 2 === 0 ? 0.3 : -0.3) + r);
      this.ctx.strokeStyle = `hsla(${ringHue}, 90%, 65%, 0.8)`;
      this.ctx.lineWidth = 3 + Math.sin(this.time * 3 + r) * 2;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = `hsl(${ringHue}, 90%, 60%)`;

      this.ctx.beginPath();
      const sides = 3 + (r % 5);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (s === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.restore();

    // Render floating procedural particles
    this.particles.forEach((p, idx) => {
      p.angle += p.speed + (audioData ? audioData.mid * 0.05 : 0);
      
      // Orbit around center with floating movement
      const curRadius = p.orbitRadius + Math.sin(this.time * 1.5 + idx) * 30 + bass * 20;
      p.x = cx + Math.cos(p.angle) * curRadius;
      p.y = cy + Math.sin(p.angle) * curRadius;

      const pRadius = p.radius * (1 + (treble * 0.8));
      const pHue = this.getHue(p.hueSeed);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle * 2);

      this.ctx.fillStyle = `hsla(${pHue}, 95%, 65%, 0.85)`;
      this.ctx.strokeStyle = `hsla(${(pHue + 180) % 360}, 90%, 80%, 0.9)`;
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = `hsl(${pHue}, 100%, 50%)`;

      if (p.shape === 0) {
        // Glowing Circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.shape === 1) {
        // Star / Diamond
        this.ctx.beginPath();
        this.ctx.moveTo(0, -pRadius);
        this.ctx.lineTo(pRadius * 0.6, 0);
        this.ctx.lineTo(0, pRadius);
        this.ctx.lineTo(-pRadius * 0.6, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      } else if (p.shape === 2) {
        // Concentric Ring
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        // Glowing Beam Line
        this.ctx.beginPath();
        this.ctx.moveTo(-pRadius * 1.5, 0);
        this.ctx.lineTo(pRadius * 1.5, 0);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });

    // Dynamic wave curves across source
    this.ctx.save();
    this.ctx.strokeStyle = `hsla(${(this.hueOffset + 180) % 360}, 100%, 75%, 0.4)`;
    this.ctx.lineWidth = 4;
    this.ctx.shadowBlur = 25;
    this.ctx.shadowColor = `hsl(${(this.hueOffset + 180) % 360}, 100%, 50%)`;

    this.ctx.beginPath();
    for (let x = 0; x < w; x += 15) {
      const y = cy + Math.sin(x * 0.01 + this.time * 2) * 80 + Math.cos(x * 0.02 - this.time) * 40;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }
}
