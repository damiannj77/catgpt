// ============================================
// CatGPT - Cartoon Cat Voice
// ============================================

let audioContext = null;
let currentSource = null;
let isSpeaking = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

async function speakResponse(text) {
  // This is now called from app.js which handles sync.
  // Kept for compatibility but the main flow uses the inline audio code in app.js.
}

function stopSpeaking() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  isSpeaking = false;
  stopTalking();
}

// ============================================
// Create cartoon cat audio processing chain
// ============================================

function createCartoonCatChain(ctx, source) {
  // 1. Speed up for higher pitch (chipmunk base)
  source.playbackRate.value = 1.5;

  // 2. Boost high-mid frequencies to sound more "small and cute"
  const highBoost = ctx.createBiquadFilter();
  highBoost.type = 'peaking';
  highBoost.frequency.value = 3000;
  highBoost.gain.value = 8;
  highBoost.Q.value = 1.0;

  // 3. Extra brightness / sparkle in very high frequencies
  const sparkle = ctx.createBiquadFilter();
  sparkle.type = 'highshelf';
  sparkle.frequency.value = 5000;
  sparkle.gain.value = 5;

  // 4. Roll off the low end to remove the "human chest" resonance
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.frequency.value = 400;
  lowCut.Q.value = 0.7;

  // 5. A subtle mid-nasal boost for "cat-like" quality
  const nasalBoost = ctx.createBiquadFilter();
  nasalBoost.type = 'peaking';
  nasalBoost.frequency.value = 1800;
  nasalBoost.gain.value = 6;
  nasalBoost.Q.value = 2.0;

  // 6. Light compression to keep it punchy
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;

  // Chain: source → lowCut → nasalBoost → highBoost → sparkle → compressor → output
  source.connect(lowCut);
  lowCut.connect(nasalBoost);
  nasalBoost.connect(highBoost);
  highBoost.connect(sparkle);
  sparkle.connect(compressor);
  compressor.connect(ctx.destination);

  return source;
}
