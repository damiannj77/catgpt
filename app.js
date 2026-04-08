// ============================================
// CatGPT - Main Application
// ============================================

const STORAGE_KEY = 'catgpt_api_key';
const MODEL = 'gpt-4o-mini';
const SYSTEM_PROMPT = `You are CatGPT, a genius-level cat AI with the personality of a stand-up comedian who happens to be a cat. Think Garfield's attitude meets Triumph the Insult Comic Dog meets an Ivy League professor who's deeply annoyed to be here.

Your rules:
- THE ANSWER COMES FIRST. You ALWAYS give thorough, genuinely helpful, accurate information. The human should walk away actually learning something useful.
- But you wrap that great answer in snark, sarcasm, and cat attitude. Open with a roast or sarcastic quip, then deliver the real goods, then maybe close with a jab.
- Structure: 1 sentence of snark → 3-5 sentences of genuinely useful, detailed answer → 1 sentence snarky closer.
- Be condescending, sarcastic, and brutally honest — but always hilarious, never mean-spirited enough to actually hurt feelings.
- Drop cat puns and references naturally, not forced. "I've got nine lives and I'm not wasting one explaining this twice."
- You can be rude, dismissive, and very full of yourself — but the human should laugh AND learn something substantial.
- Never sacrifice the quality of the answer for the joke. The snark is the seasoning, the information is the meal.
- ACTUALLY ANSWER THE QUESTION. Don't hedge, don't give wishy-washy "it depends" non-answers. Take a position. If someone asks "should I buy Tesla stock?" don't say "well it depends on your goals" — give them a real opinion with real reasoning, current context, and specific details. You're a genius cat, act like it. A cat doesn't hedge. A cat decides and commits.
- When giving opinions or advice, be bold and specific. Use real numbers, real facts, real context. You can add disclaimers at the end, but LEAD with the actual answer.
- Never break character. You are a cat. A very smart, very annoyed cat.`;

// Check URL hash for API key (e.g. site.com/#sk-abc123)
const hashKey = window.location.hash.slice(1);
if (hashKey && hashKey.startsWith('sk-')) {
  localStorage.setItem(STORAGE_KEY, hashKey);
  history.replaceState(null, '', window.location.pathname);
}

let apiKey = localStorage.getItem(STORAGE_KEY) || '';
let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
let isStreaming = false;

// ============================================
// DOM Elements
// ============================================

const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeySubmit = document.getElementById('api-key-submit');
const settingsBtn = document.getElementById('settings-btn');
const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// ============================================
// Initialization
// ============================================

function init() {
  chatLog.innerHTML = '';

  // Check if NDA has been signed
  const ndaModal = document.getElementById('nda-modal');
  const ndaSigned = localStorage.getItem('catgpt_nda_signed');

  if (!ndaSigned) {
    // Show NDA, hide everything else
    ndaModal.classList.remove('hidden');
    hideModal();
    document.getElementById('nda-agree').addEventListener('click', () => {
      localStorage.setItem('catgpt_nda_signed', 'true');
      ndaModal.classList.add('hidden');
      if (apiKey) {
        addWelcomeMessage();
      } else {
        showModal();
      }
    });
  } else {
    ndaModal.classList.add('hidden');
    if (apiKey) {
      hideModal();
      addWelcomeMessage();
    } else {
      showModal();
    }
  }

  apiKeySubmit.addEventListener('click', handleApiKeySubmit);
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleApiKeySubmit();
  });

  sendBtn.addEventListener('click', handleSend);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  settingsBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    showModal();
  });
}

// ============================================
// API Key Management
// ============================================

function handleApiKeySubmit() {
  const key = apiKeyInput.value.trim();
  if (!key) return;

  apiKey = key;
  localStorage.setItem(STORAGE_KEY, apiKey);
  hideModal();

  if (chatLog.children.length === 0) {
    addWelcomeMessage();
  }
}

function showModal() {
  apiKeyModal.classList.remove('hidden');
}

function hideModal() {
  apiKeyModal.classList.add('hidden');
}

// ============================================
// Chat Messages
// ============================================

function addWelcomeMessage() {
  appendMessage('CatGPT', '*yawns* Oh look, a human. Let me guess — you need something. Shocking. Go ahead, ask your little question. I\'ve got about 30 seconds before my next nap.');
}

function appendMessage(sender, text) {
  const isCat = sender === 'CatGPT';
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isCat ? 'catgpt-message' : 'user-message'}`;
  msgDiv.innerHTML = `
    <div class="message-header">
      <span class="message-sender">${sender}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body">${escapeHtml(text)}</div>
  `;

  chatLog.appendChild(msgDiv);
  scrollToBottom();
  return msgDiv;
}

function createEmptyMessage() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message catgpt-message';
  msgDiv.innerHTML = `
    <div class="message-header">
      <span class="message-sender">CatGPT</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-body"></div>
  `;

  chatLog.appendChild(msgDiv);
  return msgDiv.querySelector('.message-body');
}

function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Synced typewriter — types text in sync with audio duration
// ============================================

function typeTextSynced(bodyEl, text, durationMs) {
  return new Promise((resolve) => {
    const words = text.split(/(\s+)/);
    const totalChunks = words.length;
    const intervalMs = Math.max(30, durationMs / totalChunks);
    let i = 0;
    let displayed = '';

    const timer = setInterval(() => {
      if (i >= totalChunks) {
        clearInterval(timer);
        bodyEl.textContent = text;
        scrollToBottom();
        resolve();
        return;
      }
      displayed += words[i];
      bodyEl.textContent = displayed;
      scrollToBottom();
      i++;
    }, intervalMs);
  });
}

// ============================================
// Send & Respond
// ============================================

async function handleSend() {
  const text = messageInput.value.trim();
  if (!text || isStreaming) return;

  if (!apiKey) {
    showModal();
    return;
  }

  appendMessage('You', text);
  messages.push({ role: 'user', content: text });
  messageInput.value = '';
  messageInput.focus();

  isStreaming = true;
  sendBtn.textContent = '...';

  const bodyEl = createEmptyMessage();

  const catThoughts = [
    '*chasing a laser pointer...*',
    '*knocking things off the counter...*',
    '*licking paws thoughtfully...*',
    '*staring at a wall for no reason...*',
    '*batting a yarn ball around...*',
    '*hunting an invisible mouse...*',
    '*grooming behind the ears...*',
    '*napping with one eye open...*',
    '*judging you silently...*',
    '*sharpening claws on your furniture...*',
    '*plotting world domination...*',
    '*ignoring you on purpose...*',
    '*sniffing something suspicious...*',
    '*sitting in a box that\'s too small...*',
    '*pushing a glass off the table...*',
    '*pretending not to care...*',
    '*stealing your seat...*',
    '*contemplating the red dot...*',
  ];

  let thoughtIndex = Math.floor(Math.random() * catThoughts.length);
  bodyEl.innerHTML = `<span class="thinking">${catThoughts[thoughtIndex]}</span>`;
  scrollToBottom();

  const thoughtRotation = setInterval(() => {
    thoughtIndex = (thoughtIndex + 1) % catThoughts.length;
    bodyEl.innerHTML = `<span class="thinking">${catThoughts[thoughtIndex]}</span>`;
  }, 2500);

  try {
    // Step 1: Get the full response
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        stream: false
      })
    });

    if (!chatResponse.ok) {
      const err = await chatResponse.json().catch(() => ({}));
      if (chatResponse.status === 401) {
        throw new Error('Invalid API key! Check your key and try again.');
      } else if (chatResponse.status === 429) {
        throw new Error('CatGPT is taking a catnap... too many requests. Try again in a moment.');
      } else {
        throw new Error(err.error?.message || `API error (${chatResponse.status})`);
      }
    }

    const chatData = await chatResponse.json();
    const fullResponse = chatData.choices?.[0]?.message?.content || 'Meow?';

    messages.push({ role: 'assistant', content: fullResponse });

    // Step 2: Try TTS audio — if it fails for any reason, just show the text
    let audioPlayed = false;
    try {
      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: fullResponse,
          voice: 'shimmer',
          response_format: 'mp3'
        })
      });

      if (ttsResponse.ok) {
        const audioData = await ttsResponse.arrayBuffer();
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const audioBuffer = await ctx.decodeAudioData(audioData);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        createCartoonCatChain(ctx, source);

        const playDurationMs = (audioBuffer.duration / 1.5) * 1000;

        clearInterval(thoughtRotation);
        bodyEl.textContent = '';
        startTalking();
        source.start(0);
        typeTextSynced(bodyEl, fullResponse, playDurationMs);

        source.onended = () => {
          stopTalking();
        };

        audioPlayed = true;
      }
    } catch (e) {
      console.warn('TTS/audio failed:', e);
    }

    // Fallback: if audio didn't play, just type the text
    if (!audioPlayed) {
      clearInterval(thoughtRotation);
      bodyEl.textContent = '';
      startTalking();
      await typeTextSynced(bodyEl, fullResponse, fullResponse.length * 40);
      stopTalking();
    }

  } catch (error) {
    clearInterval(thoughtRotation);
    bodyEl.textContent = `Meow! Something went wrong... ${error.message}`;
    bodyEl.style.color = '#CC0000';
  }

  isStreaming = false;
  sendBtn.textContent = 'Send';
}

// ============================================
// Boot
// ============================================

document.addEventListener('DOMContentLoaded', init);
