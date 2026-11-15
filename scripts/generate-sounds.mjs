/**
 * Gerador offline dos arquivos sonoros do sistema ATLAS (WAV 16-bit PCM, 44.1 kHz).
 * Identidade sonora: biblioteca antiga, museu de história natural e tecnologia contemporânea.
 *
 * Uso: node scripts/generate-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/sounds");
const SAMPLE_RATE = 44100;

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Utilitários DSP
// ---------------------------------------------------------------------------

function createBuffer(durationSec) {
  return new Float64Array(Math.ceil(durationSec * SAMPLE_RATE));
}

function addTone(buf, {
  freq,
  freqEnd = freq,
  startSec = 0,
  durationSec = 0.2,
  gain = 0.3,
  attackSec = 0.008,
  decayTau = durationSec * 0.35,
  harmonics = [1, 0.25, 0.08],
}) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durationSec * SAMPLE_RATE);
  let phase = 0;

  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= buf.length) continue;

    const t = i / SAMPLE_RATE;
    const progress = i / len;
    const f = freq + (freqEnd - freq) * progress;

    // Envelope suave (sem cliques)
    const attack = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
    const decay = Math.exp(-t / Math.max(0.005, decayTau));
    const tailFade = progress > 0.85 ? (1 - progress) / 0.15 : 1;
    const env = attack * decay * tailFade;

    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    let sample = 0;
    for (let h = 0; h < harmonics.length; h++) {
      sample += harmonics[h] * Math.sin(phase * (h + 1));
    }

    buf[idx] += sample * env * gain;
  }
}

function addFilteredNoise(buf, {
  startSec = 0,
  durationSec = 0.08,
  gain = 0.15,
  lowpassHz = 1800,
  highpassHz = 250,
  attackSec = 0.004,
  decayTau = durationSec * 0.35,
  seed = 1337,
}) {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durationSec * SAMPLE_RATE);

  // PRNG determinístico para reprodutibilidade
  let s = seed >>> 0;
  const nextRand = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };

  const lpAlpha = Math.min(1, (2 * Math.PI * lowpassHz) / (SAMPLE_RATE + 2 * Math.PI * lowpassHz));
  const hpAlpha = SAMPLE_RATE / (SAMPLE_RATE + 2 * Math.PI * highpassHz);

  let lp = 0;
  let hp = 0;
  let prevIn = 0;

  for (let i = 0; i < len; i++) {
    const idx = startIdx + i;
    if (idx < 0 || idx >= buf.length) continue;

    const raw = nextRand();
    lp = lp + lpAlpha * (raw - lp);
    hp = hpAlpha * (hp + lp - prevIn);
    prevIn = lp;

    const t = i / SAMPLE_RATE;
    const progress = i / len;
    const attack = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
    const decay = Math.exp(-t / Math.max(0.004, decayTau));
    const tailFade = progress > 0.8 ? (1 - progress) / 0.2 : 1;

    buf[idx] += hp * attack * decay * tailFade * gain;
  }
}

function addWoodTap(buf, { startSec = 0, freq = 620, gain = 0.32, durationSec = 0.065 }) {
  // Corpo de madeira ressonante + micro-ataque mecânico
  addTone(buf, {
    freq,
    freqEnd: freq * 0.82,
    startSec,
    durationSec,
    gain,
    attackSec: 0.002,
    decayTau: 0.016,
    harmonics: [1, 0.35, 0.12],
  });
  addFilteredNoise(buf, {
    startSec,
    durationSec: 0.024,
    gain: gain * 0.45,
    lowpassHz: 2400,
    highpassHz: 450,
    attackSec: 0.001,
    decayTau: 0.007,
    seed: Math.round(freq * 13),
  });
}

function normalizeAndWriteWav(filename, buf, targetPeak = 0.65) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > max) max = a;
  }
  const scale = max > 0 ? targetPeak / max : 1;

  const numSamples = buf.length;
  const dataSize = numSamples * 2;
  const out = Buffer.alloc(44 + dataSize);

  // RIFF/WAVE header (mono, 16-bit PCM)
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SAMPLE_RATE, 24);
  out.writeUInt32LE(SAMPLE_RATE * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, buf[i] * scale));
    out.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), out);
}

// ---------------------------------------------------------------------------
// Definição dos 24 efeitos sonoros do ATLAS
// ---------------------------------------------------------------------------

// A. Navegação (ui)
{
  // ui-tab: toque suave de madeira + textura sutil de papel
  const b = createBuffer(0.09);
  addWoodTap(b, { startSec: 0, freq: 540, gain: 0.4, durationSec: 0.06 });
  addFilteredNoise(b, { startSec: 0.005, durationSec: 0.06, gain: 0.14, lowpassHz: 1800, highpassHz: 600, seed: 101 });
  normalizeAndWriteWav("ui-tab.wav", b, 0.36);
}

{
  // ui-select: clique mecânico delicado
  const b = createBuffer(0.07);
  addWoodTap(b, { startSec: 0, freq: 760, gain: 0.35, durationSec: 0.045 });
  normalizeAndWriteWav("ui-select.wav", b, 0.32);
}

{
  // ui-modal-open: folha abrindo + nota quente discreta
  const b = createBuffer(0.18);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.11, gain: 0.18, lowpassHz: 2100, highpassHz: 500, attackSec: 0.012, decayTau: 0.045, seed: 202 });
  addTone(b, { freq: 392, freqEnd: 440, startSec: 0.015, durationSec: 0.14, gain: 0.22, attackSec: 0.015, decayTau: 0.055, harmonics: [1, 0.15] });
  normalizeAndWriteWav("ui-modal-open.wav", b, 0.36);
}

{
  // ui-modal-close: fechamento suave abafado
  const b = createBuffer(0.13);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.08, gain: 0.14, lowpassHz: 1400, highpassHz: 300, attackSec: 0.006, decayTau: 0.03, seed: 203 });
  addTone(b, { freq: 349.23, freqEnd: 293.66, startSec: 0.005, durationSec: 0.11, gain: 0.2, attackSec: 0.008, decayTau: 0.04, harmonics: [1, 0.1] });
  normalizeAndWriteWav("ui-modal-close.wav", b, 0.32);
}

{
  // ui-confirm: trava mecânica precisa + ressonância quente
  const b = createBuffer(0.16);
  addWoodTap(b, { startSec: 0, freq: 640, gain: 0.3, durationSec: 0.05 });
  addTone(b, { freq: 523.25, startSec: 0.018, durationSec: 0.13, gain: 0.26, attackSec: 0.006, decayTau: 0.05, harmonics: [1, 0.2, 0.05] });
  normalizeAndWriteWav("ui-confirm.wav", b, 0.42);
}

// B. Sessões de estudo (session)
{
  // session-start: engate de relojoaria + intervalo ascendente suave (D4 -> A4)
  const b = createBuffer(0.34);
  addWoodTap(b, { startSec: 0, freq: 580, gain: 0.26, durationSec: 0.05 });
  addTone(b, { freq: 293.66, startSec: 0.015, durationSec: 0.16, gain: 0.28, attackSec: 0.008, decayTau: 0.065, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 440.0, startSec: 0.085, durationSec: 0.24, gain: 0.32, attackSec: 0.008, decayTau: 0.095, harmonics: [1, 0.2, 0.05] });
  normalizeAndWriteWav("session-start.wav", b, 0.52);
}

{
  // session-pause: intervalo descendente abafado (A4 -> E4)
  const b = createBuffer(0.28);
  addTone(b, { freq: 440.0, startSec: 0, durationSec: 0.14, gain: 0.26, attackSec: 0.008, decayTau: 0.055, harmonics: [1, 0.15] });
  addTone(b, { freq: 329.63, startSec: 0.07, durationSec: 0.19, gain: 0.24, attackSec: 0.01, decayTau: 0.075, harmonics: [1, 0.1] });
  normalizeAndWriteWav("session-pause.wav", b, 0.46);
}

{
  // session-resume: retomada gentil (E4 -> A4)
  const b = createBuffer(0.28);
  addWoodTap(b, { startSec: 0, freq: 620, gain: 0.2, durationSec: 0.04 });
  addTone(b, { freq: 329.63, startSec: 0.01, durationSec: 0.13, gain: 0.24, attackSec: 0.008, decayTau: 0.05, harmonics: [1, 0.18] });
  addTone(b, { freq: 440.0, startSec: 0.07, durationSec: 0.2, gain: 0.3, attackSec: 0.008, decayTau: 0.08, harmonics: [1, 0.2] });
  normalizeAndWriteWav("session-resume.wav", b, 0.48);
}

{
  // session-complete: acorde de resolução refinado (D4 - F#4 - A4)
  const b = createBuffer(0.68);
  addTone(b, { freq: 293.66, startSec: 0, durationSec: 0.48, gain: 0.28, attackSec: 0.01, decayTau: 0.18, harmonics: [1, 0.2, 0.05] });
  addTone(b, { freq: 369.99, startSec: 0.06, durationSec: 0.5, gain: 0.26, attackSec: 0.01, decayTau: 0.19, harmonics: [1, 0.18, 0.04] });
  addTone(b, { freq: 440.0, startSec: 0.12, durationSec: 0.54, gain: 0.32, attackSec: 0.012, decayTau: 0.22, harmonics: [1, 0.22, 0.06] });
  normalizeAndWriteWav("session-complete.wav", b, 0.56);
}

{
  // session-cancel: toque neutro e discreto de cancelamento
  const b = createBuffer(0.2);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.09, gain: 0.18, lowpassHz: 1100, highpassHz: 200, seed: 305 });
  addTone(b, { freq: 261.63, freqEnd: 220, startSec: 0.01, durationSec: 0.16, gain: 0.22, attackSec: 0.008, decayTau: 0.06, harmonics: [1, 0.08] });
  normalizeAndWriteWav("session-cancel.wav", b, 0.38);
}

// C. Timer (timer)
{
  // timer-start: pulso de cronômetro de precisão
  const b = createBuffer(0.22);
  addWoodTap(b, { startSec: 0, freq: 820, gain: 0.25, durationSec: 0.035 });
  addTone(b, { freq: 587.33, startSec: 0.015, durationSec: 0.18, gain: 0.25, attackSec: 0.006, decayTau: 0.07, harmonics: [1, 0.15] });
  normalizeAndWriteWav("timer-start.wav", b, 0.44);
}

{
  // timer-pause
  const b = createBuffer(0.2);
  addTone(b, { freq: 523.25, freqEnd: 440, startSec: 0, durationSec: 0.17, gain: 0.24, attackSec: 0.008, decayTau: 0.065, harmonics: [1, 0.12] });
  normalizeAndWriteWav("timer-pause.wav", b, 0.4);
}

{
  // timer-resume
  const b = createBuffer(0.22);
  addTone(b, { freq: 440, freqEnd: 523.25, startSec: 0, durationSec: 0.19, gain: 0.26, attackSec: 0.008, decayTau: 0.075, harmonics: [1, 0.15] });
  normalizeAndWriteWav("timer-resume.wav", b, 0.44);
}

{
  // timer-complete: aviso perceptível e sereno de fim de bloco (sino de museu A4 -> E5 -> A5 suave)
  const b = createBuffer(1.15);
  addTone(b, { freq: 440.0, startSec: 0, durationSec: 0.7, gain: 0.3, attackSec: 0.014, decayTau: 0.26, harmonics: [1, 0.24, 0.06] });
  addTone(b, { freq: 659.25, startSec: 0.16, durationSec: 0.78, gain: 0.32, attackSec: 0.014, decayTau: 0.3, harmonics: [1, 0.22, 0.05] });
  addTone(b, { freq: 880.0, startSec: 0.34, durationSec: 0.78, gain: 0.22, attackSec: 0.018, decayTau: 0.32, harmonics: [1, 0.14] });
  normalizeAndWriteWav("timer-complete.wav", b, 0.62);
}

{
  // timer-transition: transição suave estudo <-> descanso (G4 -> D5)
  const b = createBuffer(0.55);
  addTone(b, { freq: 392.0, startSec: 0, durationSec: 0.35, gain: 0.26, attackSec: 0.012, decayTau: 0.14, harmonics: [1, 0.18] });
  addTone(b, { freq: 587.33, startSec: 0.12, durationSec: 0.42, gain: 0.28, attackSec: 0.012, decayTau: 0.18, harmonics: [1, 0.16] });
  normalizeAndWriteWav("timer-transition.wav", b, 0.5);
}

// D. Coleção de recompensas (achievement)
{
  // atlas-collection-open: abertura de livro/arquivo encadernado
  const b = createBuffer(0.32);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.18, gain: 0.22, lowpassHz: 1900, highpassHz: 350, attackSec: 0.018, decayTau: 0.075, seed: 401 });
  addTone(b, { freq: 220.0, startSec: 0.03, durationSec: 0.26, gain: 0.2, attackSec: 0.025, decayTau: 0.11, harmonics: [1, 0.25] });
  addTone(b, { freq: 329.63, startSec: 0.06, durationSec: 0.24, gain: 0.18, attackSec: 0.025, decayTau: 0.1, harmonics: [1, 0.15] });
  normalizeAndWriteWav("atlas-collection-open.wav", b, 0.44);
}

{
  // atlas-card-select: toque nítido em papel-cartão espesso
  const b = createBuffer(0.085);
  addWoodTap(b, { startSec: 0, freq: 720, gain: 0.28, durationSec: 0.04 });
  addFilteredNoise(b, { startSec: 0.004, durationSec: 0.055, gain: 0.16, lowpassHz: 2400, highpassHz: 800, seed: 402 });
  normalizeAndWriteWav("atlas-card-select.wav", b, 0.35);
}

{
  // atlas-card-detail: inspeção de prancha em vitrine
  const b = createBuffer(0.24);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.08, gain: 0.14, lowpassHz: 2200, highpassHz: 650, seed: 403 });
  addTone(b, { freq: 523.25, startSec: 0.015, durationSec: 0.2, gain: 0.25, attackSec: 0.01, decayTau: 0.085, harmonics: [1, 0.2, 0.05] });
  normalizeAndWriteWav("atlas-card-detail.wav", b, 0.44);
}

{
  // atlas-unlock: notificação elegante de nova conquista desbloqueada
  const b = createBuffer(0.52);
  addTone(b, { freq: 587.33, startSec: 0, durationSec: 0.3, gain: 0.26, attackSec: 0.01, decayTau: 0.12, harmonics: [1, 0.22, 0.05] });
  addTone(b, { freq: 880.0, startSec: 0.11, durationSec: 0.38, gain: 0.28, attackSec: 0.012, decayTau: 0.16, harmonics: [1, 0.18, 0.04] });
  normalizeAndWriteWav("atlas-unlock.wav", b, 0.54);
}

// 5 Níveis de Intensidade Sonora de Revelação ATLAS
{
  // Comum: toque curto e delicado
  const b = createBuffer(0.28);
  addWoodTap(b, { startSec: 0, freq: 660, gain: 0.26, durationSec: 0.05 });
  addTone(b, { freq: 523.25, startSec: 0.015, durationSec: 0.24, gain: 0.28, attackSec: 0.008, decayTau: 0.095, harmonics: [1, 0.2] });
  normalizeAndWriteWav("atlas-reveal-common.wav", b, 0.48);
}

{
  // Incomum: dois tons ascendentes
  const b = createBuffer(0.48);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.07, gain: 0.12, lowpassHz: 2000, highpassHz: 500, seed: 502 });
  addTone(b, { freq: 392.0, startSec: 0.01, durationSec: 0.24, gain: 0.26, attackSec: 0.01, decayTau: 0.1, harmonics: [1, 0.22, 0.05] });
  addTone(b, { freq: 523.25, startSec: 0.11, durationSec: 0.34, gain: 0.3, attackSec: 0.01, decayTau: 0.14, harmonics: [1, 0.22, 0.06] });
  normalizeAndWriteWav("atlas-reveal-uncommon.wav", b, 0.52);
}

{
  // Raro: pequeno acorde de descoberta
  const b = createBuffer(0.78);
  addFilteredNoise(b, { startSec: 0, durationSec: 0.12, gain: 0.14, lowpassHz: 2200, highpassHz: 450, seed: 503 });
  addTone(b, { freq: 293.66, startSec: 0.01, durationSec: 0.65, gain: 0.26, attackSec: 0.012, decayTau: 0.25, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 440.0, startSec: 0.07, durationSec: 0.65, gain: 0.25, attackSec: 0.012, decayTau: 0.26, harmonics: [1, 0.2, 0.05] });
  addTone(b, { freq: 587.33, startSec: 0.13, durationSec: 0.62, gain: 0.28, attackSec: 0.012, decayTau: 0.26, harmonics: [1, 0.18, 0.04] });
  normalizeAndWriteWav("atlas-reveal-rare.wav", b, 0.58);
}

{
  // Épico: sequência curta com textura atmosférica
  const b = createBuffer(1.25);
  // Textura atmosférica quente de museu
  addFilteredNoise(b, { startSec: 0, durationSec: 0.45, gain: 0.14, lowpassHz: 1500, highpassHz: 220, attackSec: 0.06, decayTau: 0.18, seed: 504 });
  addTone(b, { freq: 220.0, startSec: 0.02, durationSec: 1.15, gain: 0.2, attackSec: 0.05, decayTau: 0.48, harmonics: [1, 0.15] });
  // Motivo ascendente
  addTone(b, { freq: 329.63, startSec: 0.04, durationSec: 0.7, gain: 0.24, attackSec: 0.012, decayTau: 0.26, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 440.0, startSec: 0.12, durationSec: 0.75, gain: 0.25, attackSec: 0.012, decayTau: 0.28, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 523.25, startSec: 0.2, durationSec: 0.85, gain: 0.26, attackSec: 0.014, decayTau: 0.34, harmonics: [1, 0.2, 0.05] });
  addTone(b, { freq: 659.25, startSec: 0.29, durationSec: 0.9, gain: 0.28, attackSec: 0.016, decayTau: 0.38, harmonics: [1, 0.18, 0.05] });
  normalizeAndWriteWav("atlas-reveal-epic.wav", b, 0.62);
}

{
  // Lendário: assinatura sonora exclusiva, mais elaborada
  const b = createBuffer(1.85);
  // Abertura mecânica e pergaminho
  addWoodTap(b, { startSec: 0, freq: 580, gain: 0.2, durationSec: 0.05 });
  addFilteredNoise(b, { startSec: 0.01, durationSec: 0.55, gain: 0.14, lowpassHz: 1700, highpassHz: 240, attackSec: 0.07, decayTau: 0.22, seed: 505 });
  // Base harmônica profunda
  addTone(b, { freq: 196.0, startSec: 0.03, durationSec: 1.75, gain: 0.22, attackSec: 0.06, decayTau: 0.68, harmonics: [1, 0.2, 0.04] });
  addTone(b, { freq: 293.66, startSec: 0.06, durationSec: 1.7, gain: 0.2, attackSec: 0.05, decayTau: 0.65, harmonics: [1, 0.15] });
  // Assinatura melódica ATLAS (G4 -> A4 -> B4 -> D5 -> G5)
  addTone(b, { freq: 392.0, startSec: 0.08, durationSec: 0.9, gain: 0.24, attackSec: 0.012, decayTau: 0.32, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 440.0, startSec: 0.19, durationSec: 0.95, gain: 0.24, attackSec: 0.012, decayTau: 0.34, harmonics: [1, 0.22, 0.06] });
  addTone(b, { freq: 493.88, startSec: 0.3, durationSec: 1.05, gain: 0.25, attackSec: 0.014, decayTau: 0.38, harmonics: [1, 0.2, 0.05] });
  addTone(b, { freq: 587.33, startSec: 0.42, durationSec: 1.25, gain: 0.27, attackSec: 0.016, decayTau: 0.46, harmonics: [1, 0.2, 0.05] });
  addTone(b, { freq: 783.99, startSec: 0.56, durationSec: 1.25, gain: 0.25, attackSec: 0.02, decayTau: 0.52, harmonics: [1, 0.16, 0.04] });
  normalizeAndWriteWav("atlas-reveal-legendary.wav", b, 0.66);
}

console.log(`Generated ${fs.readdirSync(OUT_DIR).length} sound files in ${OUT_DIR}`);

