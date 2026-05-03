import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { C } from '../data/colors';
import { MATH } from '../data/math';
import { generateMathDrills, callClaude } from '../lib/api';
import {
  clearMathDrills,
  getMathDrillSummary,
  getWeakMathFormulaIds,
  loadMathDrillCards,
  mergeRemoteMathDrillCards,
  reviewMathDrill,
  upsertMathDrillQuestions,
} from '../lib/mathDrills';
import { loadMathDrillsRemote, saveMathDrillsRemote } from '../lib/server';
import { renderChatContent } from '../lib/chatHelpers';
import { friendlyChatError } from '../lib/chatHelpers';
import type { MathDrillCard, MathDrillSummary } from '../types/index';

type Props = {
  profileId: string;
  onLog: (eventType: string, payload?: Record<string, unknown>) => void;
  onBack: () => void;
  onOpenFormulaSheet: () => void;
  onOpenCheatSheet: () => void;
};

type QuestionMode = 'guided' | 'final' | 'word';

type QuestionTurn = {
  kind: 'question';
  card: MathDrillCard;
  mode: QuestionMode;
  level: 1 | 2 | 3;
  blankAnswers: string[];
  singleAnswer: string;
  submitted: boolean;
  correct?: boolean;
};
type FeedbackTurn = {
  kind: 'feedback';
  cardId: string;
  correct: boolean;
  expected: string;
  userAnswerDisplay: string;
  aiText: string;
  streaming: boolean;
};
type UserMsgTurn = { kind: 'user'; text: string };
type AssistantMsgTurn = { kind: 'assistant'; text: string };
type LoadingTurn = { kind: 'loading'; label: string };
type Turn = QuestionTurn | FeedbackTurn | UserMsgTurn | AssistantMsgTurn | LoadingTurn;

const CHAT_STORE_KEY = 'sie-v5-math-drill-chats';

// Per-formula mastery levels:
//   1 (guided)  — show full template with blanks
//   2 (final)   — show formula reference, ask for final answer only
//   3 (word)    — pure word problem, no formula shown
function getFormulaLevel(cards: MathDrillCard[], formulaId: string): 1 | 2 | 3 {
  const totalCorrect = cards
    .filter((c) => c.formulaId === formulaId)
    .reduce((s, c) => s + (c.correctCount || 0), 0);
  if (totalCorrect >= 6) return 3;
  if (totalCorrect >= 3) return 2;
  return 1;
}

function levelToMode(level: 1 | 2 | 3): QuestionMode {
  if (level === 3) return 'word';
  if (level === 2) return 'final';
  return 'guided';
}

function loadChat(profileId: string): Turn[] {
  try {
    const raw = localStorage.getItem(CHAT_STORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = data?.[profileId];
    if (!Array.isArray(list)) return [];
    // Drop transient loading turns from any prior session.
    return list.filter((t) => t && t.kind !== 'loading');
  } catch {
    return [];
  }
}

function saveChat(profileId: string, turns: Turn[]) {
  try {
    const raw = localStorage.getItem(CHAT_STORE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    // Trim to last 60 turns to keep storage bounded.
    data[profileId] = turns.filter((t) => t.kind !== 'loading').slice(-60);
    localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export default function MathDrillView({ profileId, onLog, onBack, onOpenFormulaSheet, onOpenCheatSheet }: Props) {
  const [cards, setCards] = useState<MathDrillCard[]>([]);
  const [summary, setSummary] = useState<MathDrillSummary>({ tracked: 0, dueNow: 0, mastered: 0, attempts: 0, accuracyPct: 0 });
  const [turns, setTurns] = useState<Turn[]>(() => loadChat(profileId));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusFormulaId, setFocusFormulaId] = useState<string>('all');
  const [calcOpen, setCalcOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initRan = useRef(false);

  const refresh = (): MathDrillCard[] => {
    const next = loadMathDrillCards(profileId);
    setCards(next);
    setSummary(getMathDrillSummary(profileId));
    return next;
  };

  useEffect(() => {
    refresh();
    setTurns(loadChat(profileId));
    void (async () => {
      const remote = await loadMathDrillsRemote(profileId);
      if (remote !== null) {
        // Server is source of truth — merge in (preserves recent local-only edits) then publish back.
        const merged = mergeRemoteMathDrillCards(profileId, remote);
        refresh();
        if (merged.length !== remote.length) {
          // Local had cards remote didn't — push them up so other devices see them too.
          void saveMathDrillsRemote(profileId, merged);
        }
      }
    })();
  }, [profileId]);

  // Snapshot a "shape" of turns so we only auto-scroll when content grows
  // (new turn or streaming text), not on every blank keystroke.
  const turnsShape = useMemo(() => turns.map((t) => {
    if (t.kind === 'assistant' || t.kind === 'user') return `${t.kind}:${t.text.length}`;
    if (t.kind === 'feedback') return `f:${t.aiText.length}:${t.streaming ? 1 : 0}`;
    if (t.kind === 'loading') return `l:${t.label.length}`;
    return `q:${t.card.id}:${t.submitted ? 1 : 0}`;
  }).join('|'), [turns]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turnsShape]);

  useEffect(() => {
    saveChat(profileId, turns);
  }, [turns, profileId]);

  const persistRemote = (next: MathDrillCard[]) => { void saveMathDrillsRemote(profileId, next); };

  const askNextQuestion = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setTurns((prev) => [...prev, { kind: 'loading', label: 'Writing your next problem…' }]);
    try {
      const askedQuestionTurns = turns.filter((t): t is QuestionTurn => t.kind === 'question');
      const askedIds = askedQuestionTurns.map((t) => t.card.id);
      const recentFormulaIds = askedQuestionTurns.slice(-3).map((t) => t.card.formulaId);

      // Pick a target formula client-side so the model gets variety it can't ignore.
      let targetFormulaId: string | null = null;
      if (focusFormulaId !== 'all') {
        targetFormulaId = focusFormulaId;
      } else {
        const candidates = MATH.filter((f) => !recentFormulaIds.includes(f.id));
        const pool = candidates.length ? candidates : MATH;
        // Prefer the formula with the fewest attempts.
        const ranked = pool
          .map((f) => {
            const attempts = cards.filter((c) => c.formulaId === f.id).reduce((s, c) => s + c.attempts, 0);
            return { id: f.id, attempts };
          })
          .sort((a, b) => a.attempts - b.attempts);
        const minAttempts = ranked[0]?.attempts ?? 0;
        const tier = ranked.filter((r) => r.attempts === minAttempts);
        targetFormulaId = tier[Math.floor(Math.random() * tier.length)].id;
      }

      const res = await generateMathDrills({
        formulas: MATH.map((formula) => ({
          id: formula.id, title: formula.title, formula: formula.formula, rule: formula.rule, example: formula.example.q,
        })),
        focusFormulaIds: targetFormulaId ? [targetFormulaId] : [],
        weakFormulaIds: getWeakMathFormulaIds(profileId, 3),
        existingQuestionIds: [...cards.map((card) => card.id), ...askedIds],
        recentPrompts: (targetFormulaId
          ? cards.filter((c) => c.formulaId === targetFormulaId)
          : cards
        )
          .slice(-8)
          .map((c) => c.prompt)
          .filter(Boolean),
        batchSize: 1,
        onDelta: (snapshot) => {
          // Extract the prompt-in-progress so the loading bubble shows live activity.
          const promptMatch = snapshot.match(/"prompt"\s*:\s*"([^"]*)/);
          const templateMatch = snapshot.match(/"template"\s*:\s*"([^"]*)/);
          const preview = templateMatch?.[1] || promptMatch?.[1] || `${Math.round(snapshot.length / 4)} chars streaming…`;
          setTurns((prev) => {
            const copy = prev.slice();
            for (let i = copy.length - 1; i >= 0; i -= 1) {
              if (copy[i].kind === 'loading') {
                copy[i] = { kind: 'loading', label: preview };
                break;
              }
            }
            return copy;
          });
        },
      });
      if (!res || res.length === 0) throw new Error('No question came back.');
      upsertMathDrillQuestions(profileId, [res[0]]);
      const next = refresh();
      persistRemote(next);
      const card = next.find((c) => c.id === res[0].id);
      if (!card) throw new Error('Saved card not found.');
      const level = getFormulaLevel(next, card.formulaId);
      const mode = levelToMode(level);
      setTurns((prev) => {
        const trimmed = prev.filter((t) => t.kind !== 'loading');
        return [...trimmed, {
          kind: 'question',
          card,
          mode,
          level,
          blankAnswers: card.blanks?.length ? Array(card.blanks.length).fill('') : [],
          singleAnswer: '',
          submitted: false,
        }];
      });
      onLog('math_drill_chat_question', { id: card.id, formulaId: card.formulaId, level });
    } catch (err) {
      setTurns((prev) => prev.filter((t) => t.kind !== 'loading'));
      setError(err instanceof Error ? err.message : 'Could not load a question.');
    } finally {
      setBusy(false);
    }
  };

  // Initial: greeting + first question (only when chat is empty)
  useEffect(() => {
    if (initRan.current) return;
    if (turns.length > 0) {
      // Restored from storage — don't auto-ask.
      initRan.current = true;
      return;
    }
    initRan.current = true;
    const greeting: Turn = cards.length === 0
      ? { kind: 'assistant', text: 'Hey — I\'ll walk you through SIE math one problem at a time. Fill in the blanks, hit Enter, and I\'ll explain. Ask me anything along the way.' }
      : { kind: 'assistant', text: `Welcome back. ${cards.length} drill${cards.length === 1 ? '' : 's'} tracked at ${summary.accuracyPct}% accuracy. Let\'s keep going.` };
    setTurns([greeting]);
    void askNextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns.length]);

  const updateQuestionTurn = (cardId: string, patch: Partial<QuestionTurn>) => {
    setTurns((prev) => prev.map((t) => (t.kind === 'question' && t.card.id === cardId ? { ...t, ...patch } : t)));
  };

  const submitQuestion = async (turn: QuestionTurn) => {
    if (turn.submitted || busy) return;
    let payload = '';
    let userDisplay = '';
    if (turn.mode === 'guided' && turn.card.blanks?.length) {
      if (turn.blankAnswers.some((value) => !String(value || '').trim())) return;
      const cleaned = turn.blankAnswers.map((value) => String(value).trim());
      payload = JSON.stringify(cleaned);
      userDisplay = cleaned.map((v, i) => `${turn.card.blanks?.[i]?.label ?? `#${i + 1}`}: ${v}`).join(' • ');
    } else {
      if (!turn.singleAnswer.trim()) return;
      payload = turn.singleAnswer;
      userDisplay = turn.singleAnswer.trim();
    }
    const result = reviewMathDrill(profileId, turn.card.id, payload);
    if (!result) { setError('That drill could not be scored.'); return; }
    const next = refresh();
    persistRemote(next);
    updateQuestionTurn(turn.card.id, { submitted: true, correct: result.correct });

    // Push a user bubble + a streaming AI feedback bubble.
    setTurns((prev) => [
      ...prev,
      { kind: 'user', text: userDisplay },
      {
        kind: 'feedback',
        cardId: turn.card.id,
        correct: result.correct,
        expected: turn.card.canonicalAnswer,
        userAnswerDisplay: userDisplay,
        aiText: '',
        streaming: true,
      } as FeedbackTurn,
    ]);
    onLog('math_drill_chat_answer', { id: turn.card.id, correct: result.correct });

    setBusy(true);
    try {
      const seed = result.correct
        ? `Student got this SIE math drill CORRECT.

Formula: ${turn.card.formulaTitle}
Problem: ${turn.card.prompt}
${turn.card.template ? `Template: ${turn.card.template}\n` : ''}Their answer: ${userDisplay}
Final answer key: ${turn.card.canonicalAnswer}

Reply in 1-2 short sentences: confirm it's right and add a quick reinforcing insight (a tip or memory hook). Do NOT pose a new problem.`
        : `Student got this SIE math drill WRONG.

Formula: ${turn.card.formulaTitle}
Problem: ${turn.card.prompt}
${turn.card.template ? `Template: ${turn.card.template}\n` : ''}Their answer: ${userDisplay}
Correct final answer: ${turn.card.canonicalAnswer}
Known explanation: ${turn.card.explanation}
Steps: ${turn.card.steps.join(' | ')}

Reply briefly (2-4 sentences): identify their likely mistake, teach the correct approach step-by-step, then end by saying "Try it again ↑". Do NOT reveal the final number directly — guide them so they can fix it themselves. Do NOT pose a new problem.`;
      const conversation = [{ role: 'user' as const, content: seed, ts: new Date().toISOString() }];
      const reply = await callClaude(conversation, null, null, undefined, (snapshot) => {
        const clean = snapshot.replace(/^\[OUTCOME:[A-Z_]+\]\s*/i, '');
        setTurns((prev) => prev.map((t) => (
          t.kind === 'feedback' && t.cardId === turn.card.id && t.streaming
            ? { ...t, aiText: clean }
            : t
        )));
      });
      const cleanFinal = (reply || '').replace(/^\[OUTCOME:[A-Z_]+\]\s*/i, '');
      setTurns((prev) => prev.map((t) => (
        t.kind === 'feedback' && t.cardId === turn.card.id && t.streaming
          ? { ...t, aiText: cleanFinal, streaming: false }
          : t
      )));
      // On wrong: re-enable the question turn so they can retry in place.
      if (!result.correct) {
        updateQuestionTurn(turn.card.id, { submitted: false, correct: undefined });
      }
    } catch (err) {
      setTurns((prev) => prev.map((t) => (
        t.kind === 'feedback' && t.cardId === turn.card.id && t.streaming
          ? { ...t, aiText: turn.card.explanation, streaming: false }
          : t
      )));
      setError(err instanceof Error ? err.message : 'AI tutor unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const sendChatMessage = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (/^next( problem)?$/i.test(text)) {
      setInput('');
      void askNextQuestion();
      return;
    }
    setInput('');
    setError(null);
    const lastQuestion = [...turns].reverse().find((t): t is QuestionTurn => t.kind === 'question');
    setTurns((prev) => [...prev, { kind: 'user', text }, { kind: 'assistant', text: '' }]);
    setBusy(true);
    try {
      const seed = lastQuestion ? `Help me with this SIE math drill on "${lastQuestion.card.formulaTitle}".

Prompt: ${lastQuestion.card.prompt}
${lastQuestion.card.template ? `Template: ${lastQuestion.card.template}\n` : ''}Final answer: ${lastQuestion.card.canonicalAnswer}

My question: ${text}

Reply briefly with the exact step or insight I need. Do NOT pose another practice problem.` : `${text}\n\nReply briefly. Do NOT pose another practice problem.`;
      const conversation = [{ role: 'user' as const, content: seed, ts: new Date().toISOString() }];
      const reply = await callClaude(conversation, null, null, undefined, (snapshot) => {
        const clean = snapshot.replace(/^\[OUTCOME:[A-Z_]+\]\s*/i, '');
        setTurns((prev) => {
          const copy = prev.slice();
          for (let i = copy.length - 1; i >= 0; i -= 1) {
            if (copy[i].kind === 'assistant') { copy[i] = { kind: 'assistant', text: clean }; break; }
          }
          return copy;
        });
      });
      const cleanFinal = (reply || '').replace(/^\[OUTCOME:[A-Z_]+\]\s*/i, '');
      setTurns((prev) => {
        const copy = prev.slice();
        for (let i = copy.length - 1; i >= 0; i -= 1) {
          if (copy[i].kind === 'assistant') { copy[i] = { kind: 'assistant', text: cleanFinal }; break; }
        }
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reply.');
      setTurns((prev) => prev.filter((t) => !(t.kind === 'assistant' && t.text === '')));
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset all math drill progress?')) return;
    clearMathDrills(profileId);
    setTurns([]);
    saveChat(profileId, []);
    refresh();
    persistRemote([]);
    initRan.current = false;
    onLog('math_drills_reset_all', {});
  };

  const formulaStats = useMemo(() => MATH.map((formula) => {
    const formulaCards = cards.filter((card) => card.formulaId === formula.id);
    const attempts = formulaCards.reduce((sum, card) => sum + card.attempts, 0);
    const hits = formulaCards.reduce((sum, card) => sum + card.correctCount, 0);
    return { id: formula.id, title: formula.title, attempts, accuracyPct: attempts ? Math.round((hits / attempts) * 100) : 0 };
  }), [cards]);

  const lastTurn = turns[turns.length - 1];
  const canRequestNext = !busy && (
    (lastTurn?.kind === 'feedback' && lastTurn.correct && !lastTurn.streaming)
    || lastTurn?.kind === 'assistant'
  );

  const tinyBtn: CSSProperties = {
    padding: '4px 10px', borderRadius: '6px',
    border: `1px solid ${C.border}`, background: C.card, color: C.text,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: 500,
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left rail: formula list (mirrors the topics sidebar in the topic view) */}
      <div style={{
        width: '240px', flexShrink: 0, borderRight: `1px solid ${C.border}`,
        background: C.panel, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, fontSize: '13px', fontFamily: 'inherit', padding: 0 }}>← Back</button>
          <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formulas</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {[{ id: 'all', title: 'All formulas', attempts: 0, accuracyPct: 0 } as typeof formulaStats[number], ...formulaStats].map((formula) => {
            const active = focusFormulaId === formula.id;
            return (
              <button
                key={formula.id}
                onClick={() => setFocusFormulaId(formula.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', marginBottom: '4px',
                  borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${active ? C.amber : 'transparent'}`,
                  background: active ? C.amberBg : 'transparent',
                  color: active ? C.amber : C.text,
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{formula.title}</span>
                {formula.id !== 'all' && (
                  <span style={{ fontSize: '11px', fontWeight: 500, color: active ? C.amber : C.dim }}>
                    {formula.attempts > 0 ? `${formula.attempts} att · ${formula.accuracyPct}%` : 'no attempts'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right pane: header + chat + input (matches ChatView shape) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
            <div style={{ fontSize: '18px', color: C.text, fontWeight: 'bold' }}>Math XL Drills</div>
            <div style={{ fontSize: '13px', color: C.dim, marginLeft: 'auto' }}>{summary.tracked} tracked</div>
          </div>
          <div style={{ fontSize: '14px', color: C.dim, marginTop: '3px' }}>
            {focusFormulaId === 'all'
              ? 'Conversational fill-in-the-blank practice across every SIE formula.'
              : `Focused on ${MATH.find((f) => f.id === focusFormulaId)?.title ?? 'formula'} — pick All on the left to mix.`}
          </div>

          <div style={{ marginTop: '8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100px, 100%), 1fr))', gap: '8px' }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: C.dim }}>Attempts</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>{summary.attempts}</div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: C.dim }}>Mastered</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.d3 }}>{summary.mastered}</div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: C.dim }}>Accuracy</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.amber }}>{summary.accuracyPct}%</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setCalcOpen((v) => !v)} style={{ ...tinyBtn, background: calcOpen ? C.amberBg : C.card, color: calcOpen ? C.amber : C.text, borderColor: calcOpen ? C.amber : C.border }}>🧮 Calc</button>
            <button onClick={onOpenFormulaSheet} style={tinyBtn}>Formulas</button>
            <button onClick={onOpenCheatSheet} style={tinyBtn}>Cheatsheet</button>
            <button onClick={resetAll} style={{ ...tinyBtn, color: '#dc2626', borderColor: '#fecaca' }}>Reset</button>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {turns.map((turn, idx) => renderTurn(turn, idx, {
            onChangeBlank: (cardId, blankIdx, value) => {
              setTurns((prev) => prev.map((t) => {
                if (t.kind !== 'question' || t.card.id !== cardId) return t;
                const next = t.blankAnswers.slice();
                next[blankIdx] = value;
                return { ...t, blankAnswers: next };
              }));
            },
            onChangeSingle: (cardId, value) => updateQuestionTurn(cardId, { singleAnswer: value }),
            onSubmit: (q) => { void submitQuestion(q); },
            onNext: () => askNextQuestion(),
            canRequestNext,
          }))}

          {error && (
            <div
              onClick={() => setError(null)}
              title="Click to dismiss"
              style={{ alignSelf: 'center', padding: '8px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px', cursor: 'pointer', maxWidth: '92%', textAlign: 'center' }}
            >
              {friendlyChatError(error)}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.panel, display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void sendChatMessage(); } }}
            placeholder={busy ? 'Thinking…' : 'Ask a follow-up, or type "next" for another problem…'}
            disabled={busy}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              border: `1px solid ${C.border}`, background: C.card, color: C.text,
              fontFamily: 'inherit', fontSize: '14px', outline: 'none',
            }}
          />
          <button onClick={() => void sendChatMessage()} disabled={busy || !input.trim()} style={{
            padding: '10px 16px', borderRadius: '8px', border: 'none',
            background: C.amber, color: '#ffffff', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontSize: '14px', fontWeight: 600,
            opacity: busy || !input.trim() ? 0.5 : 1,
          }}>Send</button>
          <button onClick={() => void askNextQuestion()} disabled={!canRequestNext} style={{
            padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
            background: C.card, color: canRequestNext ? C.text : C.ghost,
            cursor: canRequestNext ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500,
          }}>Next →</button>
        </div>
      </div>

      {calcOpen && <CalculatorPanel onClose={() => setCalcOpen(false)} />}
    </div>
  );
}

type RenderHandlers = {
  onChangeBlank: (cardId: string, blankIdx: number, value: string) => void;
  onChangeSingle: (cardId: string, value: string) => void;
  onSubmit: (turn: QuestionTurn) => void;
  onNext: () => void;
  canRequestNext: boolean;
};

function renderTurn(turn: Turn, idx: number, handlers: RenderHandlers) {
  if (turn.kind === 'user') {
    return (
      <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={bubble(true)}>{turn.text}</div>
      </div>
    );
  }
  if (turn.kind === 'assistant') {
    return (
      <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ ...bubble(false), whiteSpace: 'normal' }}>
          {turn.text ? renderChatContent(turn.text) : '…'}
        </div>
      </div>
    );
  }
  if (turn.kind === 'loading') {
    return (
      <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ ...bubble(false), color: C.ghost, fontStyle: 'italic' }}>{turn.label}</div>
      </div>
    );
  }
  if (turn.kind === 'feedback') {
    const ok = turn.correct;
    return (
      <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{
          ...bubble(false),
          border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
          background: ok ? '#f0fdf4' : '#fef2f2',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: ok ? '#166534' : '#991b1b', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>{ok ? '✓' : '✗'}</span>
            {ok ? 'Correct!' : 'Not quite — let\'s look at it.'}
            {ok && (
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: C.dim, fontWeight: 500 }}>
                Answer: <span style={{ color: C.text, fontWeight: 700 }}>{turn.expected}</span>
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.7, color: C.text, whiteSpace: 'normal' }}>
            {turn.aiText ? renderChatContent(turn.aiText) : (turn.streaming ? '…' : '')}
          </div>
          {ok && !turn.streaming && (
            <button onClick={handlers.onNext} disabled={!handlers.canRequestNext} style={{
              marginTop: '12px', padding: '8px 14px', borderRadius: '8px', border: 'none',
              background: C.amber, color: '#ffffff', cursor: handlers.canRequestNext ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
              opacity: handlers.canRequestNext ? 1 : 0.5,
            }}>Next problem →</button>
          )}
          {!ok && !turn.streaming && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: C.dim, fontStyle: 'italic' }}>
              The blanks above are unlocked — give it another shot.
            </div>
          )}
        </div>
      </div>
    );
  }
  // question turn
  const formula = MATH.find((f) => f.id === turn.card.formulaId);
  const accent = formula?.color ?? C.amber;
  const levelLabel = turn.level === 3 ? 'L3 · Word problem' : turn.level === 2 ? 'L2 · Final answer' : 'L1 · Guided';
  const showBlanks = turn.mode === 'guided' && (turn.card.blanks?.length ?? 0) > 0;
  const showFormulaRef = turn.mode === 'final' && Boolean(turn.card.template);
  return (
    <div key={idx} style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ ...bubble(false), maxWidth: '95%', width: '100%', borderLeft: `3px solid ${accent}`, paddingLeft: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>
            {turn.card.formulaTitle} · {turn.card.difficulty}
          </div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.dim, fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: C.panel, border: `1px solid ${C.border}` }}>
            {levelLabel}
          </div>
        </div>
        <div style={{ fontSize: '15px', color: C.text, lineHeight: 1.6, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
          {turn.card.prompt}
        </div>

        {showFormulaRef && (
          <div style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', background: C.panel, border: `1px dashed ${C.border}`, color: C.dim, fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre-wrap' }}>
            {turn.card.template}
          </div>
        )}

        {showBlanks ? (
          <div style={{
            padding: '12px 14px', borderRadius: '8px',
            background: C.panel, border: `1px solid ${C.border}`,
            fontSize: '17px', lineHeight: '2.2', color: C.text,
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontWeight: 600,
          }}>
            {renderTemplate(turn.card.template || turn.card.prompt, (turn.card.blanks?.length ?? 0)).map((segment, segIdx) => (
              segment.type === 'text' ? (
                <span key={`t-${segIdx}`} style={{ whiteSpace: 'pre-wrap' }}>{segment.value}</span>
              ) : (
                <input
                  key={`b-${segment.index}`}
                  value={turn.blankAnswers[segment.index] || ''}
                  onChange={(event) => handlers.onChangeBlank(turn.card.id, segment.index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (turn.submitted) handlers.onNext();
                      else handlers.onSubmit(turn);
                    }
                  }}
                  disabled={turn.submitted}
                  placeholder={turn.card.blanks?.[segment.index]?.label ?? '?'}
                  style={{
                    minWidth: `${Math.max(120, ((turn.card.blanks?.[segment.index]?.label?.length ?? 6)) * 10 + 24)}px`,
                    width: `${Math.max(
                      Math.max(120, ((turn.card.blanks?.[segment.index]?.label?.length ?? 6)) * 10 + 24),
                      (turn.blankAnswers[segment.index]?.length || 6) * 12 + 24
                    )}px`,
                    padding: '6px 10px', border: 'none',
                    borderBottom: `2px solid ${turn.submitted ? (turn.correct ? '#16a34a' : '#dc2626') : accent}`,
                    background: turn.submitted ? (turn.correct ? '#f0fdf4' : '#fef2f2') : C.card,
                    color: C.text, fontSize: '16px', fontFamily: 'inherit', fontWeight: 700,
                    textAlign: 'center', outline: 'none', borderRadius: '4px',
                  }}
                />
              )
            ))}
          </div>
        ) : (
          <input
            value={turn.singleAnswer}
            onChange={(event) => handlers.onChangeSingle(turn.card.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (turn.submitted) handlers.onNext();
                else handlers.onSubmit(turn);
              }
            }}
            disabled={turn.submitted}
            placeholder={turn.card.answerFormat || 'Your answer'}
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: `2px solid ${turn.submitted ? (turn.correct ? '#16a34a' : '#dc2626') : C.border}`,
              background: turn.submitted ? (turn.correct ? '#f0fdf4' : '#fef2f2') : C.card,
              color: C.text, fontSize: '15px', fontFamily: 'inherit', fontWeight: 600,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}

        {!turn.submitted && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => handlers.onSubmit(turn)} style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none',
              background: C.text, color: '#ffffff', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
            }}>Check</button>
            {turn.card.hint && (
              <span style={{ fontSize: '12px', color: C.dim }}>Hint: {turn.card.hint}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function bubble(isUser: boolean): CSSProperties {
  return {
    maxWidth: '78%',
    padding: '10px 14px',
    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
    background: isUser ? C.amberBg : C.card,
    border: `1px solid ${isUser ? C.amberDim : C.border}`,
    color: isUser ? C.text : C.muted,
    fontSize: '15px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

type Segment = { type: 'text'; value: string } | { type: 'blank'; index: number };

function renderTemplate(template: string, blankCount: number): Segment[] {
  const segments: Segment[] = [];
  if (!template) {
    for (let i = 0; i < blankCount; i += 1) {
      if (i > 0) segments.push({ type: 'text', value: ', ' });
      segments.push({ type: 'blank', index: i });
    }
    return segments;
  }
  const parts = template.split(/_{2,}/);
  let blankIndex = 0;
  parts.forEach((part, idx) => {
    if (part) segments.push({ type: 'text', value: part });
    if (idx < parts.length - 1 && blankIndex < blankCount) {
      segments.push({ type: 'blank', index: blankIndex });
      blankIndex += 1;
    }
  });
  while (blankIndex < blankCount) {
    segments.push({ type: 'text', value: ' ' });
    segments.push({ type: 'blank', index: blankIndex });
    blankIndex += 1;
  }
  return segments;
}

// --- Floating calculator -------------------------------------------------

function safeEval(expr: string): string {
  const cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/[^0-9+\-*/().%\s]/g, '')
    .replace(/%/g, '/100');
  if (!cleaned.trim()) return '';
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${cleaned});`)();
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Err';
    const rounded = Math.round(value * 1e10) / 1e10;
    return String(rounded);
  } catch {
    return 'Err';
  }
}

function CalculatorPanel({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState('');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const live = useMemo(() => safeEval(expr), [expr]);

  const append = (token: string) => setExpr((prev) => prev + token);
  const backspace = () => setExpr((prev) => prev.slice(0, -1));
  const clear = () => setExpr('');
  const equals = () => {
    const result = safeEval(expr);
    if (result && result !== 'Err' && expr.trim()) {
      setHistory((prev) => [{ expr, result }, ...prev].slice(0, 8));
      setExpr(result);
    }
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); equals(); }
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
  };

  const startDrag = (event: React.MouseEvent) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startY: event.clientY, origX: pos.x, origY: pos.y };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(8, dragRef.current.origX - dx),
        y: Math.max(8, dragRef.current.origY - dy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const KEYS: Array<Array<{ label: string; value?: string; action?: 'eq' | 'clear' | 'back' }>> = [
    [{ label: 'C', action: 'clear' }, { label: '⌫', action: 'back' }, { label: '%', value: '%' }, { label: '÷', value: '/' }],
    [{ label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' }, { label: '×', value: '*' }],
    [{ label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' }, { label: '−', value: '-' }],
    [{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '+', value: '+' }],
    [{ label: '0', value: '0' }, { label: '.', value: '.' }, { label: '(', value: '(' }, { label: ')', value: ')' }],
  ];

  return (
    <div style={{
      position: 'fixed', bottom: pos.y, right: pos.x, zIndex: 1000,
      width: 'min(280px, 92vw)', background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      fontFamily: 'inherit', overflow: 'hidden',
    }}>
      <div onMouseDown={startDrag} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: C.panel, borderBottom: `1px solid ${C.border}`,
        cursor: 'move', userSelect: 'none',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, letterSpacing: '0.04em' }}>🧮 Calculator</div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: C.dim,
          fontSize: '16px', lineHeight: 1, padding: '2px 6px',
        }}>×</button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <input
          value={expr}
          onChange={(event) => setExpr(event.target.value)}
          onKeyDown={onKey}
          autoFocus
          placeholder="0"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', borderRadius: '6px',
            border: `1px solid ${C.border}`, background: C.panel,
            color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '16px', outline: 'none', textAlign: 'right',
          }}
        />
        <div style={{
          textAlign: 'right', fontSize: '13px', color: C.dim, padding: '4px 4px 0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          minHeight: '18px',
        }}>{live ? `= ${live}` : ''}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '0 8px 8px' }}>
        {KEYS.flat().map((key, idx) => {
          const isOp = ['÷', '×', '−', '+', '%'].includes(key.label);
          const isUtil = key.action === 'clear' || key.action === 'back';
          return (
            <button
              key={idx}
              onClick={() => {
                if (key.action === 'clear') clear();
                else if (key.action === 'back') backspace();
                else if (key.value) append(key.value);
              }}
              style={{
                padding: '10px 0', borderRadius: '6px',
                border: `1px solid ${C.border}`,
                background: isUtil ? '#fff7ed' : isOp ? C.amberBg : C.panel,
                color: isUtil ? '#b45309' : isOp ? C.amber : C.text,
                fontSize: '15px', fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >{key.label}</button>
          );
        })}
        <button onClick={equals} style={{
          gridColumn: '1 / -1', padding: '10px 0', borderRadius: '6px', border: 'none',
          background: C.amber, color: '#ffffff',
          fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}>=</button>
      </div>

      {history.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 12px', background: C.panel, maxHeight: '120px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.ghost, fontWeight: 600, marginBottom: '4px' }}>History</div>
          {history.map((entry, idx) => (
            <button key={idx} onClick={() => setExpr(entry.result)} style={{
              display: 'flex', justifyContent: 'space-between', width: '100%',
              padding: '4px 0', background: 'none', border: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px',
              color: C.dim, cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{entry.expr}</span>
              <span style={{ color: C.text, fontWeight: 700 }}>= {entry.result}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
