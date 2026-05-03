import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../data/colors';
import { CURRICULUM } from '../data/curriculum';
import { scoreDailyTest } from '../lib/dailyTest';
import type { DailyQuestion, GenerationProgress, MemorySummary } from '../types/index';
import {
  getOrBuildTodayQuestions,
  loadDailyTest,
  saveDailyTest,
} from '../lib/server';

type Props = {
  profileId: string;
  memory: MemorySummary;
  onSaved: () => void;
  onLog: (eventType: string, payload?: Record<string, unknown>) => void;
  onOutcome: (topicId: string, correct: boolean) => void;
};

export default function DailyTestView({ profileId, memory, onSaved, onLog, onOutcome }: Props) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [weakTopicIds, setWeakTopicIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ date: string; score: number; total: number; completedAt: string }>>([]);
  const [studyMode, setStudyMode] = useState<'balanced' | 'math-boost' | 'math-sprint'>('balanced');
  const [testPace, setTestPace] = useState<'practice' | 'timed'>('practice');
  const [timeLeftSec, setTimeLeftSec] = useState(25 * 60);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const draftKey = useMemo(() => `sie-v5-daily-draft:${profileId}:${today}`, [profileId, today]);
  const topicNameById = useMemo(() => {
    const map: Record<string, string> = {};
    CURRICULUM.forEach((d) => d.topics.forEach((t) => {
      map[t.id] = `${t.code} - ${t.title}`;
    }));
    return map;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sie-v5-study-mode:${profileId}`);
      if (raw === 'balanced' || raw === 'math-boost' || raw === 'math-sprint') {
        setStudyMode(raw);
      }
    } catch {
      // fall through
    }
  }, [profileId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sie-v5-test-pace:${profileId}`);
      if (raw === 'practice' || raw === 'timed') {
        setTestPace(raw);
      }
    } catch {
      // fall through
    }
  }, [profileId]);

  const minMathQuestions = useMemo(() => {
    if (studyMode === 'math-sprint') return 10;
    if (studyMode === 'math-boost') return 6;
    return 3;
  }, [studyMode]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // fall through
    }
  };

  const loadDraft = (): { questions: DailyQuestion[]; answers: number[] } | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { questions?: DailyQuestion[]; answers?: number[] };
      if (!Array.isArray(parsed.questions) || !Array.isArray(parsed.answers)) return null;
      return {
        questions: parsed.questions,
        answers: parsed.answers,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await loadDailyTest(profileId, today);
      const draft = loadDraft();
      if (cancelled) return;

      onLog('daily_test_loaded', {
        date: today,
        hasExistingAttempt: Boolean(data.today),
      });

      setHistory(data.history || []);

      const q = await getOrBuildTodayQuestions(
        profileId,
        today,
        data.today || (draft ? {
          date: today,
          score: 0,
          total: draft.questions.length,
          completedAt: new Date().toISOString(),
          payload: {
            questions: draft.questions,
            selectedAnswers: draft.answers,
          },
          weakTopicIds: [],
        } : null),
        {
        total: 20,
        weakTopicIds: memory.weakTopicIds,
        adaptiveBrief: memory.adaptiveBrief,
        minMathQuestions,
        onProgress: data.today
          ? undefined
          : (progress) => {
              if (cancelled) return;
              setGenerationProgress(progress);
            },
      });
      if (cancelled) return;
      setQuestions(q);
      setGenerationProgress(null);

      if (data.today) {
        setAnswers(data.today.payload?.selectedAnswers || new Array(q.length).fill(-1));
        setSubmitted(true);
        setScore(Number(data.today.score || 0));
        setWeakTopicIds(Array.isArray(data.today.weakTopicIds) ? data.today.weakTopicIds : []);
        clearDraft();
      } else if (draft && draft.questions.length > 0) {
        const restored = new Array(q.length).fill(-1);
        for (let i = 0; i < Math.min(restored.length, draft.answers.length); i += 1) {
          const value = Number(draft.answers[i]);
          restored[i] = Number.isInteger(value) ? value : -1;
        }
        setAnswers(restored);
        setSubmitted(false);
        setScore(0);
        setWeakTopicIds([]);
      } else {
        setAnswers(new Array(q.length).fill(-1));
        setSubmitted(false);
        setScore(0);
        setWeakTopicIds([]);
      }

      setTimeLeftSec(25 * 60);

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId, today, memory.weakTopicIds, memory.adaptiveBrief, minMathQuestions, onLog]);

  useEffect(() => {
    if (loading || submitted || testPace !== 'timed') return;
    if (timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [loading, submitted, testPace, timeLeftSec]);

  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          questions,
          answers,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // fall through
    }
  }, [loading, submitted, questions, answers, draftKey]);

  const submit = async (forced = false) => {
    if (submitted) return;
    if (!forced && answers.some((a) => a < 0)) return;

    const result = scoreDailyTest(questions, answers);
    setScore(result.score);
    setWeakTopicIds(result.weakTopicIds);
    setSubmitted(true);

    onLog('daily_test_submitted', {
      date: today,
      score: result.score,
      total: result.total,
      weakTopicIds: result.weakTopicIds,
      unanswered: answers.filter((a) => a < 0).length,
      forced,
      pace: testPace,
      timeLeftSec,
    });

    await saveDailyTest(profileId, {
      date: today,
      score: result.score,
      total: result.total,
      completedAt: new Date().toISOString(),
      payload: {
        questions,
        selectedAnswers: answers,
      },
      weakTopicIds: result.weakTopicIds,
    });

    clearDraft();

    questions.forEach((q, idx) => {
      onOutcome(q.topicId, answers[idx] === q.answerIndex);
    });

    onSaved();
    const refreshed = await loadDailyTest(profileId, today);
    setHistory(refreshed.history || []);
  };

  useEffect(() => {
    if (loading || submitted || testPace !== 'timed') return;
    if (timeLeftSec !== 0) return;
    void submit(true);
  }, [loading, submitted, testPace, timeLeftSec]);

  const answeredCount = answers.filter((a) => a >= 0).length;
  const timeLabel = `${Math.floor(timeLeftSec / 60)}:${String(timeLeftSec % 60).padStart(2, '0')}`;

  if (loading) {
    const pct = generationProgress ? Math.round((generationProgress.completed / Math.max(generationProgress.total, 1)) * 100) : 0;
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '20px', background: C.bg }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: '640px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}
        >
          <div style={{ color: C.text, fontSize: '18px', fontWeight: 700 }}>Preparing Daily Test</div>
          <div style={{ marginTop: '6px', color: C.dim, fontSize: '13px' }}>
            {generationProgress?.message || 'Loading your saved test state...'}
          </div>
          <div style={{ marginTop: '12px', height: '10px', borderRadius: '999px', border: `1px solid ${C.border}`, background: C.panel, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #0f766e 0%, #f59e0b 100%)' }}
            />
          </div>
          <div style={{ marginTop: '8px', color: C.muted, fontSize: '12px' }}>
            {generationProgress ? `${generationProgress.completed}/${generationProgress.total} ready` : 'Opening session...'}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '20px', color: C.text, fontWeight: 'bold' }}>Daily Test - 20 Questions</div>
          <div style={{ marginTop: '4px', color: C.dim, fontSize: '14px' }}>Date: {today}</div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ color: C.dim, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Mode</div>
            <select
              value={studyMode}
              onChange={(e) => {
                const next = e.target.value as 'balanced' | 'math-boost' | 'math-sprint';
                setStudyMode(next);
                try {
                  localStorage.setItem(`sie-v5-study-mode:${profileId}`, next);
                } catch {
                  // fall through
                }
                onLog('daily_test_mode_changed', { mode: next });
              }}
              style={{
                background: C.panel,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            >
              <option value="balanced">Balanced</option>
              <option value="math-boost">Math Boost</option>
              <option value="math-sprint">Math Sprint</option>
            </select>
            <div style={{ color: C.dim, fontSize: '12px' }}>
              Target math/equation questions: {minMathQuestions}/20
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ color: C.dim, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pace</div>
            <select
              value={testPace}
              onChange={(e) => {
                const next = e.target.value as 'practice' | 'timed';
                setTestPace(next);
                setTimeLeftSec(25 * 60);
                try {
                  localStorage.setItem(`sie-v5-test-pace:${profileId}`, next);
                } catch {
                  // fall through
                }
                onLog('daily_test_pace_changed', { pace: next });
              }}
              style={{
                background: C.panel,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
              disabled={submitted}
            >
              <option value="practice">Practice (no timer)</option>
              <option value="timed">Timed (25:00)</option>
            </select>
            <div style={{ color: C.dim, fontSize: '12px' }}>Answered: {answeredCount}/{questions.length}</div>
            {testPace === 'timed' && !submitted && (
              <div style={{ color: timeLeftSec < 120 ? '#b91c1c' : C.amber, fontSize: '12px', fontWeight: 700 }}>
                Time left: {timeLabel}
              </div>
            )}
          </div>
          {testPace === 'timed' && !submitted && (
            <div style={{ marginTop: '8px', height: '8px', borderRadius: '999px', background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, (timeLeftSec / (25 * 60)) * 100))}%`,
                  height: '100%',
                  background: timeLeftSec < 120 ? '#b91c1c' : C.amber,
                  transition: 'width 1s linear',
                }}
              />
            </div>
          )}
          <div style={{ marginTop: '10px', color: C.muted, fontSize: '14px' }}>
            AI-generated SIE-style questions with adaptive focus: {memory.weakTopicIds.length ? memory.weakTopicIds.map((id) => topicNameById[id] || id).join(', ') : 'Balanced review across all topics'}
          </div>
        </div>

        {submitted && (
          <div style={{ marginBottom: '16px', background: C.card, border: `1px solid ${C.amberDim}`, borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '18px', color: C.amber, fontWeight: 'bold' }}>
              Score: {score}/{questions.length} ({Math.round((score / Math.max(questions.length, 1)) * 100)}%)
            </div>
            {weakTopicIds.length > 0 && (
              <div style={{ marginTop: '8px', color: C.muted, fontSize: '14px', lineHeight: 1.5 }}>
                Weak areas: {weakTopicIds.map((id) => topicNameById[id] || id).join(' | ')}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px' }}>
          {questions.map((q, idx) => {
            const selected = answers[idx];
            const correct = q.answerIndex;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut', delay: Math.min(idx * 0.02, 0.2) }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}
              >
                <div style={{ color: C.dim, fontSize: '12px' }}>Q{idx + 1}</div>
                <div style={{ marginTop: '6px', color: C.text, fontSize: '17px', lineHeight: 1.55 }}>{q.prompt}</div>
                <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selected === optIdx;
                    const isCorrect = correct === optIdx;
                    const showState = submitted;
                    const borderColor = showState
                      ? isCorrect
                        ? '#15803d'
                        : isSelected
                          ? '#b91c1c'
                          : C.border
                      : isSelected
                        ? C.amber
                        : C.border;

                    return (
                      <button
                        key={optIdx}
                        disabled={submitted}
                        onClick={() => {
                          if (submitted) return;
                          onLog('daily_test_answer_selected', {
                            date: today,
                            questionId: q.id,
                            questionIndex: idx,
                            selectedOption: optIdx,
                          });
                          setAnswers((prev) => {
                            const next = [...prev];
                            next[idx] = optIdx;
                            return next;
                          });
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${borderColor}`,
                          background: isSelected ? `${C.amber}15` : C.panel,
                          color: C.text,
                          fontSize: '15px',
                          cursor: submitted ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div style={{ marginTop: '10px', color: C.muted, fontSize: '14px', lineHeight: 1.5 }}>
                    {q.explanation}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!submitted && (
          <button
            onClick={() => {
              void submit(false);
            }}
            disabled={answers.some((a) => a < 0)}
            style={{
              marginTop: '16px',
              padding: '11px 18px',
              borderRadius: '8px',
              border: 'none',
              background: answers.some((a) => a < 0) ? C.ghost : C.amber,
              color: answers.some((a) => a < 0) ? C.dim : '#ffffff',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: answers.some((a) => a < 0) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Submit Daily Test ({answeredCount}/{questions.length})
          </button>
        )}

        <div style={{ marginTop: '20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Recent Scores</div>
          {history.length === 0 ? (
            <div style={{ color: C.dim, fontSize: '14px' }}>No attempts yet.</div>
          ) : (
            history.map((h) => (
              <div key={`${h.date}-${h.completedAt}`} style={{ color: C.muted, fontSize: '14px', marginBottom: '4px' }}>
                {h.date}: {h.score}/{h.total} ({Math.round((h.score / Math.max(h.total, 1)) * 100)}%)
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
