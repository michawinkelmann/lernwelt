// tts.js — Text-to-Speech mit Web Speech API. Browser-nativ, kein
// externer Service — funktioniert auch unter file://. Wird automatisch
// auf Deutsch gesetzt, falls verfügbar.

import { Store } from './state.js';

let voice = null;
let voicesLoaded = false;

function loadVoices() {
  if (voicesLoaded) return;
  if (!('speechSynthesis' in window)) return;
  const all = window.speechSynthesis.getVoices() || [];
  if (!all.length) return;
  voice = all.find(v => v.lang?.startsWith('de'))
       || all.find(v => v.lang === 'de-DE')
       || all[0];
  voicesLoaded = true;
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

export function isSupported() {
  return 'speechSynthesis' in window;
}

export function speak(text) {
  if (!isSupported()) return false;
  if (!Store.data?.ttsEnabled) return false;
  loadVoices();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text || '').replace(/\s+/g, ' ').trim());
    if (voice) u.voice = voice;
    u.lang = 'de-DE';
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

export function stopSpeak() {
  if (!isSupported()) return;
  try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

export function setTtsEnabled(on) {
  if (!Store.data) return;
  Store.data.ttsEnabled = !!on;
  Store.save();
  if (!on) stopSpeak();
}
