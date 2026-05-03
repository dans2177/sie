import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { C } from '../data/colors';
import type { DailyQuestion, MemorySummary, MockExamResult, MockGenerationProgress } from '../types/index';
import {
  buildMockDomainBreakdown,
  clearMockExamAttempt,
  getMockExamQuestions,
  loadMockExamAttempt,
  loadMockExamHistory,
  saveMockExamAttempt,
  saveMockExamResult,
} from '../lib/mockExam';

type Props = {
  profileId: string;
  memory: MemorySummary;
  onLog: (eventType: string, payload?: Record<string, unknown>) => void;
  onOutcome: (topicId: string, correct: boolean) => void;
};

const MOCK_TIME_SEC = 105 * 60;

export default function MockExamView({ profileId, memory, onLog, onOutcome }: Props) {
  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(MOCK_TIME_SEC);
  const [history, setHistory] = useState<MockExamResult[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<MockGenerationProgress | null>(null);

  useEffect(() => {
    setHistory(loadMockExamHistory(profileId));
    const attempt = loadMockExamAttempt(profileId);
    if (attempt) {
      setQuestions(attempt.questions);
      setAnswers(attempt.answers);
      setFlags(new Set(attempt.flags));
      setIdx(attempt.idx);
      setTimeLeftSec(attempt.timeLeftSec);
      setStartedAt(attempt.startedAt);
      setSubmitted(false);
      onLog('mock_exam_resumed', { total: attempt.questions.length, timeLeftSec: attempt.timeLeftSec });
    } else {
      setQuestions([]);
      setAnswers([]);
      setFlags(new Set());
      setIdx(0);
      setTimeLeftSec(MOCK_TIME_SEC);
      setStartedAt(null);
      setSubmitted(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (submitted || !startedAt || questions.length === 0) return;
    saveMockExamAttempt({
      profileId,
      startedAt,
      questions,
      answers,
      flags: [...flags],
      idx,
      timeLeftSec,
    });
  }, [profileId, startedAt, questions, answers, flags, idx, timeLeftSec, submitted]);

  useEffect(() => {
    if (loading || submitted || questions.length === 0 || timeLeftSec <= 0) return;
    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading, submitted, questions.length, timeLeftSec]);

  const startExam = async () => {
    if (startedAt && questions.length > 0 && !submitted) {
      onLog('mock_exam_start_blocked_existing_attempt', {});
      return;
    }
    setLoading(true);
    setGenerationProgress({
      generated: 0,
      target: 75,
      completedDomains: 0,
      totalDomains: 4,
      message: 'Starting AI mock exam generation...',
    });
    const date = new Date().toISOString().slice(0, 10);
    const built = await getMockExamQuestions(profileId, date, memory.weakTopicIds, memory.adaptiveBrief, (progress) => {
      setGenerationProgress(progress);
    });
    setQuestions(built);
    setAnswers(Array.from({ length: built.length }, () => -1));
    setFlags(new Set());
    setIdx(0);
    setSubmitted(false);
    setTimeLeftSec(MOCK_TIME_SEC);
    setStartedAt(new Date().toISOString());
    setGenerationProgress(null);
    setLoading(false);
    onLog('mock_exam_started', { total: built.length });
  };

  const submitExam = (forced = false) => {
    if (submitted || questions.length === 0) return;
    if (!forced && answers.some((x) => x < 0)) return;

    const score = questions.reduce((sum, q, i) => (answers[i] === q.answerIndex ? sum + 1 : sum), 0);
    const total = questions.length;
    const pct = Math.round((score / Math.max(total, 1)) * 100);
    const breakdown = buildMockDomainBreakdown(questions, answers);

    const result: MockExamResult = {
      id: `${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      score,
      total,
      pct,
      completedAt: new Date().toISOString(),
      domainBreakdown: breakdown,
    };

    setSubmitted(true);
    setHistory((prev) => [result, ...prev].slice(0, 20));
    saveMockExamResult(profileId, result);
    clearMockExamAttempt(profileId);
    setStartedAt(null);

    for (let i = 0; i < questions.length; i += 1) {
      onOutcome(questions[i].topicId, answers[i] === questions[i].answerIndex);
    }

    onLog('mock_exam_submitted', {
      score,
      total,
      pct,
      unanswered: answers.filter((x) => x < 0).length,
      forced,
      timeLeftSec,
    });
  };

  useEffect(() => {
    if (submitted || loading || questions.length === 0) return;
    if (timeLeftSec === 0) submitExam(true);
  }, [submitted, loading, questions.length, timeLeftSec]);

  const answered = useMemo(() => answers.filter((x) => x >= 0).length, [answers]);
  const current = questions[idx];
  const latest = history[0];
  const hasActiveAttempt = Boolean(startedAt && questions.length > 0 && !submitted);
  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = String(timeLeftSec % 60).padStart(2, '0');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gap: '14px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>Full Mock Exam</div>
              <div style={{ marginTop: '4px', fontSize: '14px', color: C.dim }}>
                75 questions, SIE-weighted blueprint, 105-minute countdown, full review.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  void startExam();
                }}
                disabled={loading || hasActiveAttempt}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.borderHi}`,
                  background: loading || hasActiveAttempt ? C.panel : C.amber,
                  color: loading || hasActiveAttempt ? C.dim : '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: loading || hasActiveAttempt ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Building Exam...' : hasActiveAttempt ? 'Mock Exam In Progress' : 'Start New Mock Exam'}
              </button>
              <button
                onClick={() => submitExam(false)}
                disabled={loading || submitted || answers.some((x) => x < 0)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  background: answers.some((x) => x < 0) ? C.panel : '#0f766e',
                  color: answers.some((x) => x < 0) ? C.dim : '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: answers.some((x) => x < 0) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Submit Exam
              </button>
              <button
                onClick={() => {
                  if (!hasActiveAttempt) return;
                  clearMockExamAttempt(profileId);
                  setQuestions([]);
                  setAnswers([]);
                  setFlags(new Set());
                  setIdx(0);
                  setTimeLeftSec(MOCK_TIME_SEC);
                  setStartedAt(null);
                  setSubmitted(false);
                  onLog('mock_exam_abandoned', {});
                }}
                disabled={!hasActiveAttempt}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  background: hasActiveAttempt ? '#7f1d1d' : C.panel,
                  color: hasActiveAttempt ? '#fff' : C.dim,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: hasActiveAttempt ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                Abandon Current Attempt
              </button>
            </div>
          </div>

          {loading && generationProgress && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ marginTop: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.panel, padding: '10px 12px' }}
            >
              <div style={{ color: C.text, fontSize: '13px', fontWeight: 700 }}>Generating exam from AI</div>
              <div style={{ marginTop: '4px', color: C.dim, fontSize: '12px' }}>{generationProgress.message}</div>
              <div style={{ marginTop: '8px', height: '8px', borderRadius: '999px', background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.round((generationProgress.generated / Math.max(generationProgress.target, 1)) * 100)}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #0f766e 0%, #f59e0b 100%)' }}
                />
              </div>
              <div style={{ marginTop: '6px', color: C.muted, fontSize: '12px' }}>
                Domains {generationProgress.completedDomains}/{generationProgress.totalDomains} • {Math.min(generationProgress.generated, generationProgress.target)}/{generationProgress.target} ready
              </div>
            </motion.div>
          )}

          {questions.length > 0 && !submitted && (
            <>
              <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', color: C.dim, fontSize: '12px' }}>
                <div>Answered {answered}/{questions.length}</div>
                <div style={{ color: timeLeftSec < 300 ? '#b91c1c' : C.amber, fontWeight: 700 }}>Time Left {minutes}:{seconds}</div>
                <div>Flagged {flags.size}</div>
              </div>
              <div style={{ marginTop: '8px', height: '8px', borderRadius: '999px', background: C.panel, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, (timeLeftSec / MOCK_TIME_SEC) * 100))}%`,
                    height: '100%',
                    background: timeLeftSec < 300 ? '#b91c1c' : C.amber,
                    transition: 'width 1s linear',
                  }}
                />
              </div>
            </>
          )}
        </div>

        {questions.length > 0 && current && (
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 280px' }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}
            >
              <div style={{ color: C.dim, fontSize: '12px' }}>Question {idx + 1} / {questions.length}</div>
              <div style={{ marginTop: '4px', color: C.ghost, fontSize: '12px' }}>{current.topicTitle}</div>
              <div style={{ marginTop: '10px', color: C.text, fontSize: '16px', fontWeight: 700 }}>{current.prompt}</div>
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                {current.options.map((opt, optIdx) => {
                  const chosen = answers[idx] === optIdx;
                  const showCorrect = submitted && current.answerIndex === optIdx;
                  const showWrong = submitted && chosen && current.answerIndex !== optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => {
                        if (submitted) return;
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
                        border: `1px solid ${showCorrect ? '#16a34a' : showWrong ? '#b91c1c' : chosen ? C.amber : C.border}`,
                        background: showCorrect ? '#ecfdf3' : showWrong ? '#fef2f2' : chosen ? C.amberBg : C.panel,
                        color: C.text,
                        cursor: submitted ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                      }}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div style={{ marginTop: '10px', color: C.dim, fontSize: '13px' }}>
                  {current.explanation}
                </div>
              )}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIdx((v) => Math.max(0, v - 1))}
                  disabled={idx === 0}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.panel, color: C.text, cursor: idx === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setIdx((v) => Math.min(questions.length - 1, v + 1))}
                  disabled={idx >= questions.length - 1}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.panel, color: C.text, cursor: idx >= questions.length - 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    if (submitted) return;
                    setFlags((prev) => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    });
                  }}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: flags.has(idx) ? C.amberBg : C.panel, color: C.text, cursor: submitted ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  {flags.has(idx) ? 'Unflag' : 'Flag'}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px' }}
            >
              <div style={{ color: C.text, fontWeight: 700, fontSize: '14px' }}>Navigator</div>
              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {questions.map((_, i) => {
                  const isAnswered = answers[i] >= 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      style={{
                        padding: '6px 0',
                        borderRadius: '6px',
                        border: `1px solid ${idx === i ? C.amber : C.border}`,
                        background: idx === i ? C.amberBg : isAnswered ? '#ecfdf3' : C.panel,
                        color: C.text,
                        fontSize: '11px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {latest && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ color: C.text, fontSize: '16px', fontWeight: 700 }}>Latest Mock Result</div>
            <div style={{ marginTop: '6px', color: C.amber, fontSize: '26px', fontWeight: 700 }}>
              {latest.score}/{latest.total} ({latest.pct}%)
            </div>
            <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
              {latest.domainBreakdown.map((d) => (
                <div key={d.domainId} style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: '13px' }}>
                  <span>{d.label}</span>
                  <span>{d.score}/{d.total} ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
