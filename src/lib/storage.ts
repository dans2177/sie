const DONE_PREFIX = 'sie-v5-done';
const ACTIVE_PROFILE_KEY = 'sie-v5-active-profile';
const CHAT_PREFIX = 'sie-v5-chat';
const TOUR_PREFIX = 'sie-v5-tour-hidden';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function doneKey(profileId: string): string {
  return `${DONE_PREFIX}:${profileId}`;
}

function chatKey(profileId: string, topicId: string): string {
  return `${CHAT_PREFIX}:${profileId}:${topicId}`;
}

function tourKey(profileId: string): string {
  return `${TOUR_PREFIX}:${profileId}`;
}

export function loadDone(profileId: string): Set<string> {
  try {
    const raw = localStorage.getItem(doneKey(profileId));
    if (raw) {
      const data = JSON.parse(raw);
      return new Set(data.done ?? []);
    }
  } catch {
    // Fall through
  }
  return new Set();
}

export function saveDone(done: Set<string>, profileId: string): void {
  try {
    localStorage.setItem(doneKey(profileId), JSON.stringify({ done: [...done], ts: Date.now() }));
  } catch {
    // Fall through
  }
}

export function loadActiveProfile(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveProfile(profileId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {
    // Fall through
  }
}

export function clearActiveProfile(): void {
  try {
    sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch {
    // Fall through
  }
}

export function loadTopicChat(profileId: string, topicId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(chatKey(profileId, topicId));
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

export function saveTopicChat(profileId: string, topicId: string, messages: ChatMessage[]): void {
  try {
    const trimmed = messages.slice(-60);
    localStorage.setItem(chatKey(profileId, topicId), JSON.stringify({ messages: trimmed, ts: Date.now() }));
  } catch {
    // Fall through
  }
}

export function loadTourHidden(profileId: string): boolean {
  try {
    return localStorage.getItem(tourKey(profileId)) === '1';
  } catch {
    return false;
  }
}

export function saveTourHidden(profileId: string, hidden: boolean): void {
  try {
    localStorage.setItem(tourKey(profileId), hidden ? '1' : '0');
  } catch {
    // Fall through
  }
}
