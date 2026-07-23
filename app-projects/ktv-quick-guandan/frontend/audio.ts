import type { Combo } from "../shared/game.ts";

export type VoiceBank = "male" | "female";

const audioRoot = "/assets/audio";
const rankCallouts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17].map(rank => `rank-${rank}`);
const calloutFiles = ["pass", "single", "pair", "triple", "full-house", "straight", "triple-pairs", "steel-plate", "bomb-4", "bomb-5", "bomb-6", "bomb-7", "bomb-8", "straight-flush", "joker-bomb", ...rankCallouts];
const callouts = new Map<string, HTMLAudioElement>();
let bgm: HTMLAudioElement | null = null;
let currentVoice: HTMLAudioElement | null = null;

function backgroundMusic() {
  if (!bgm) {
    bgm = new Audio(`${audioRoot}/bgm-table.wav`);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = 0;
  }
  return bgm;
}

function callout(key: string, bank: VoiceBank) {
  const cacheKey = `${bank}/${key}`;
  let audio = callouts.get(cacheKey);
  if (!audio) {
    audio = new Audio(`${audioRoot}/edge-${bank}/${key}.mp3`);
    audio.preload = "auto";
    audio.volume = .9;
    audio.addEventListener("error", () => {
      if (!audio || audio.dataset.fallback === "true") return;
      audio.dataset.fallback = "true";
      audio.src = `${audioRoot}/${key}.wav`;
      audio.load();
      void audio.play().catch(() => undefined);
    });
    callouts.set(cacheKey, audio);
  }
  return audio;
}

export function voiceBankForAvatar(avatar: number): VoiceBank {
  return avatar % 2 === 0 ? "male" : "female";
}

export function calloutKey(combo?: Combo) {
  if (!combo) return "single";
  if (combo.type === "single") return `rank-${combo.cards[0].rank}`;
  if (combo.type === "bomb") return `bomb-${Math.min(8, Math.max(4, combo.size))}`;
  return combo.type;
}

export function primeAudio(enabled: boolean, bank: VoiceBank = "male") {
  if (!enabled) return;
  const music = backgroundMusic();
  void music.play().catch(() => undefined);
  for (const key of calloutFiles) callout(key, bank).load();
}

export function syncBackgroundMusic(enabled: boolean, playing: boolean) {
  const music = backgroundMusic();
  if (!enabled) {
    music.pause();
    music.currentTime = 0;
    currentVoice?.pause();
    return;
  }
  music.volume = playing ? .13 : 0;
  if (playing) void music.play().catch(() => undefined);
}

export function playCallout(combo: Combo | undefined, passed: boolean, enabled: boolean, bank: VoiceBank = "male") {
  if (!enabled) return;
  const audio = callout(passed ? "pass" : calloutKey(combo), bank);
  if (currentVoice && currentVoice !== audio) {
    currentVoice.pause();
    currentVoice.currentTime = 0;
  }
  currentVoice = audio;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}
