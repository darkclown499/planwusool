class DemoAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  ensure() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.05, delay = 0, freqEnd?: number) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
      }
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* ignore audio errors */
    }
  }

  click() {
    this.tone(520, 0.07, 'square', 0.035);
  }

  type() {
    this.tone(680 + Math.random() * 160, 0.035, 'triangle', 0.02);
  }

  boot() {
    this.tone(180, 1.1, 'sine', 0.05, 0, 520);
    this.tone(1040, 0.5, 'sine', 0.018, 0.5, 1560);
  }

  open() {
    this.tone(300, 0.18, 'triangle', 0.04, 0, 480);
  }

  pop() {
    this.tone(440, 0.12, 'sine', 0.045, 0, 660);
    this.tone(660, 0.12, 'sine', 0.03, 0.08, 880);
  }

  load() {
    this.tone(220, 0.6, 'sawtooth', 0.012, 0, 90);
    this.tone(440, 0.4, 'sine', 0.03, 0.25);
  }

  addCart() {
    this.tone(520, 0.08, 'sine', 0.045, 0, 780);
    this.tone(900, 0.1, 'sine', 0.03, 0.08, 1200);
  }

  cartOpen() {
    this.tone(320, 0.14, 'triangle', 0.035, 0, 620);
  }

  chatOpen() {
    this.tone(500, 0.12, 'sine', 0.035, 0, 760);
    this.tone(380, 0.1, 'sine', 0.025, 0.1, 560);
  }

  chatSend() {
    this.tone(420, 0.22, 'sine', 0.04, 0, 980);
  }

  chatReply() {
    this.tone(620, 0.14, 'sine', 0.04, 0, 880);
    this.tone(880, 0.18, 'sine', 0.03, 0.13, 1180);
  }
}

export const demoAudio = new DemoAudio();