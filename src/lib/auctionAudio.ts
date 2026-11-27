// Subtle Web Audio API feedback chimes for the live MARIKETI auction ring.
// Zero external audio assets; fails silently if browser autoplay policy blocks sound.

type AuctionTone = 'bid-placed' | 'outbid' | 'callout' | 'hammer';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

  gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + startOffset + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.02);
}

export function playAuctionCue(tone: AuctionTone, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (tone) {
      case 'bid-placed':
        // Warm ascending two-note confirmation
        playNote(ctx, 587.33, 0, 0.14, 0.07, 'sine');
        playNote(ctx, 880, 0.09, 0.18, 0.07, 'sine');
        break;
      case 'outbid':
        // Gentle two-note alert
        playNote(ctx, 523.25, 0, 0.14, 0.06, 'triangle');
        playNote(ctx, 440, 0.12, 0.2, 0.06, 'triangle');
        break;
      case 'callout':
        // Single crisp attention ping
        playNote(ctx, 659.25, 0, 0.16, 0.06, 'sine');
        break;
      case 'hammer':
        // Firm low gavel knock + bright finish
        playNote(ctx, 196, 0, 0.14, 0.09, 'triangle');
        playNote(ctx, 523.25, 0.1, 0.22, 0.06, 'sine');
        break;
    }
  } catch {
    // Ignore audio errors gracefully
  }
}
