// ============================================
// CatGPT - Cat Mouth Animation (Sprite Frames)
// ============================================

const FRAMES = ['cat-closed.png', 'cat-half.png', 'cat-open.png', 'cat-half.png'];
const FRAME_MS = 160;

let talkInterval = null;
let frameIndex = 0;

const catImage = document.getElementById('cat-mascot');

// Preload all frames
const preloaded = FRAMES.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

function startTalking() {
  if (talkInterval) return;
  frameIndex = 0;
  talkInterval = setInterval(() => {
    frameIndex = (frameIndex + 1) % FRAMES.length;
    catImage.src = FRAMES[frameIndex];
  }, FRAME_MS);
}

function stopTalking() {
  if (talkInterval) {
    clearInterval(talkInterval);
    talkInterval = null;
  }
  catImage.src = 'cat-closed.png';
}
