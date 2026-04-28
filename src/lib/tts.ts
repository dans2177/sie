const VPREF = ['Google US English', 'Google UK English Female', 'Microsoft Aria Online', 'Microsoft Jenny Online', 'Microsoft Aria', 'Samantha', 'Karen', 'Moira', 'Microsoft Zira', 'Alex'];

export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter(v => v.lang.startsWith('en'));
  for (const name of VPREF) {
    const match = en.find(v => v.name.includes(name));
    if (match) return match;
  }
  return en.find(v => v.default) ?? en[0] ?? voices[0] ?? null;
}

export function cleanSpeech(text: string): string {
  return text
    .replace(/\[DEF\]/g, '')
    .replace(/\[EXAM TIP\]/g, '')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/[📌⚡▶▣■✓←→]/g, '')
    .replace(/÷/g, ' divided by ')
    .replace(/≈/g, ' approximately ')
    .replace(/>/g, ' greater than ')
    .replace(/</g, ' less than ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#+\s/g, '')
    .replace(/`[^`]*`/g, m => m.replace(/`/g, ''))
    .replace(/—/g, ', ')
    .replace(/_/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
