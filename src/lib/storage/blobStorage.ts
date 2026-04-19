import { put } from '@vercel/blob';

interface UserData {
  sessionId: string;
  progress: Record<string, { attempts: number; correct: number; lastReview: number }>;
  notes: Array<{ id: string; topic: string; content: string; created: number }>;
  quizHistory: Array<{
    id: string;
    date: number;
    score: number;
    total: number;
    topicsFailed: string[];
  }>;
  savedEquations: string[];
  lastUpdated: number;
}

const BLOB_KEY = 'sie-tutor-data.json';

export async function loadUserData(): Promise<UserData> {
  try {
    // For now, load from localStorage since Blob doesn't have a simple get API
    const stored = localStorage.getItem('sie-tutor-data');
    if (stored) {
      return JSON.parse(stored);
    }
    return createEmptyUserData();
  } catch {
    return createEmptyUserData();
  }
}

export async function saveUserData(data: UserData): Promise<void> {
  try {
    // Save to localStorage for immediate access
    localStorage.setItem('sie-tutor-data', JSON.stringify(data));

    // Also try to sync with Vercel Blob
    try {
      await put(BLOB_KEY, JSON.stringify(data), {
        access: 'private',
        addRandomSuffix: false,
      });
    } catch (blobError) {
      console.warn('Vercel Blob sync failed, using localStorage:', blobError);
    }
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

export async function addQuizResult(
  score: number,
  total: number,
  topicsFailed: string[],
): Promise<void> {
  const data = await loadUserData();
  data.quizHistory.push({
    id: Math.random().toString(36),
    date: Date.now(),
    score,
    total,
    topicsFailed,
  });
  data.lastUpdated = Date.now();
  await saveUserData(data);
}

export async function updateProgress(
  topic: string,
  correct: boolean,
): Promise<void> {
  const data = await loadUserData();
  if (!data.progress[topic]) {
    data.progress[topic] = { attempts: 0, correct: 0, lastReview: 0 };
  }
  data.progress[topic].attempts += 1;
  if (correct) data.progress[topic].correct += 1;
  data.progress[topic].lastReview = Date.now();
  data.lastUpdated = Date.now();
  await saveUserData(data);
}

export async function addNote(topic: string, content: string): Promise<void> {
  const data = await loadUserData();
  data.notes.push({
    id: Math.random().toString(36),
    topic,
    content,
    created: Date.now(),
  });
  data.lastUpdated = Date.now();
  await saveUserData(data);
}

export async function deleteNote(noteId: string): Promise<void> {
  const data = await loadUserData();
  data.notes = data.notes.filter((n) => n.id !== noteId);
  data.lastUpdated = Date.now();
  await saveUserData(data);
}

function createEmptyUserData(): UserData {
  return {
    sessionId: Math.random().toString(36).substring(7),
    progress: {},
    notes: [],
    quizHistory: [],
    savedEquations: [],
    lastUpdated: Date.now(),
  };
}

export async function getProgressStats(): Promise<{
  masteredTopics: string[];
  weakTopics: string[];
  totalAttempts: number;
  overallAccuracy: number;
  recentQuizzes: number;
}> {
  const data = await loadUserData();

  const stats = Object.entries(data.progress).map(([topic, prog]) => ({
    topic,
    accuracy: prog.attempts > 0 ? (prog.correct / prog.attempts) * 100 : 0,
    attempts: prog.attempts,
  }));

  const masteredTopics = stats.filter((s) => s.accuracy >= 80).map((s) => s.topic);
  const weakTopics = stats.filter((s) => s.accuracy < 60).map((s) => s.topic);
  const totalAttempts = stats.reduce((sum, s) => sum + s.attempts, 0);
  const overallAccuracy =
    totalAttempts > 0
      ? (stats.reduce((sum, s) => sum + s.accuracy * s.attempts, 0) / totalAttempts) * 100
      : 0;
  const recentQuizzes = data.quizHistory.slice(-5).length;

  return {
    masteredTopics,
    weakTopics,
    totalAttempts,
    overallAccuracy: Math.round(overallAccuracy),
    recentQuizzes,
  };
}
