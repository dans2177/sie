import { useEffect, useMemo, useRef, useState } from 'react';
import { C } from '../data/colors';
import { extractMcqOptions, parseAssistantOutcome } from '../lib/chatHelpers';
import { MarkdownView } from './MarkdownView';
import type { ChatMessage, McqOption, SelectedTopic } from '../types/index';

export default function ChatView({
  sel,
  msgs,
  loading,
  inp,
  onInpChange,
  onSend,
  onQuickAnswer,
  speakIdx,
  onSpeak,
  spRate,
  onSpRateChange,
  voiceName,
  error,
  onDismissError,
}: {
  sel: SelectedTopic | null;
  msgs: ChatMessage[];
  loading: boolean;
  inp: string;
  onInpChange: (v: string) => void;
  onSend: () => void;
  onQuickAnswer: (pick: McqOption, all: McqOption[], questionPrompt: string | undefined) => void;
  speakIdx: number | string | null;
  onSpeak: (text: string, idx: number | string) => void;
  spRate: number;
  onSpRateChange: (r: number) => void;
  voiceName: string | null;
  error?: string | null;
  onDismissError?: () => void;
}) {
  const chatRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const tokenEstimate = useMemo(() => {
    let total = 0;
    for (const m of msgs) total += Math.ceil((m.content?.length || 0) / 4);
    return total;
  }, [msgs]);
  const tokenLimit = 200_000;
  const tokenPct = Math.min(100, Math.round((tokenEstimate / tokenLimit) * 100));

  // Auto-grow textarea up to ~6 rows.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [inp]);
  const answerSummary = useMemo(() => {
    const assistant = msgs.filter((m, i) => m.role === 'assistant' && i > 0);
    let correct = 0;
    let needsWork = 0;

    for (const m of assistant) {
      const outcome = parseAssistantOutcome(m.content);
      if (outcome === 'correct') correct += 1;
      if (outcome === 'needsWork') needsWork += 1;
    }

    const passingTarget = 3;
    const isPassing = correct >= passingTarget;
    return {
      correct,
      needsWork,
      passingTarget,
      isPassing,
      remaining: Math.max(passingTarget - correct, 0),
    };
  }, [msgs]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.panel,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sel && (
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: sel.domain.color,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ fontSize: '18px', color: C.text, fontWeight: 'bold' }}>{sel?.topic.title ?? ''}</div>
          <div style={{ fontSize: '13px', color: C.dim, marginLeft: 'auto' }}>{sel?.topic.code}</div>
        </div>
        {sel && (
          <div style={{ fontSize: '14px', color: C.dim, marginTop: '3px' }}>
            {sel.domain.label} · {sel.domain.title} · {sel.domain.weight} of exam
          </div>
        )}
        <div
          style={{
            marginTop: '8px',
            background: C.card,
            border: `1px solid ${answerSummary.isPassing ? '#15803d55' : C.border}`,
            borderRadius: '8px',
            padding: '10px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100px, 100%), 1fr))', gap: '8px' }}>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.dim }}>Correct</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.d3 }}>{answerSummary.correct}</div>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.dim }}>To Goal</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.amber }}>{answerSummary.remaining}</div>
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.dim }}>Status</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: answerSummary.isPassing ? C.d3 : C.muted }}>
                {answerSummary.isPassing ? 'Passed' : 'In Progress'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: C.dim, textAlign: 'center' }}>
            {answerSummary.isPassing ? 'Great work. Keep the streak going.' : `Need ${answerSummary.remaining} more correct answer${answerSummary.remaining === 1 ? '' : 's'} to pass.`}
          </div>
        </div>
        {voiceName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: '12px', color: C.ghost }}>🔊 {voiceName}</span>
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {[0.8, 1.0, 1.2, 1.5].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onSpRateChange(r);
                    window.speechSynthesis.cancel();
                  }}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: '1px solid',
                    borderColor: spRate === r ? C.amber : C.border,
                    background: spRate === r ? C.amberBg : 'transparent',
                    color: spRate === r ? C.amber : C.dim,
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {msgs
          .filter((m, i) => !(i === 0 && m.role === 'user'))
          .map((msg, i) => {
            const meta = msg.meta;
            const showUserBadge = msg.role === 'user' && meta?.userAnswerLabel;
            const correctness = meta?.isCorrect;
            return (
            <div key={i}>
              {showUserBadge && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px',
                    color: correctness === true ? C.d3 : correctness === false ? '#ef4444' : C.dim,
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}>
                    {correctness === true ? '✓ ' : correctness === false ? '✗ ' : ''}
                    Picked {meta?.userAnswerLabel}
                    {meta?.correctAnswerLabel && correctness === false ? ` · correct: ${meta.correctAnswerLabel}` : ''}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                {msg.role === 'assistant' && (
                  <button
                    title={speakIdx === i ? 'Stop' : 'Listen'}
                    onClick={() => onSpeak(msg.content, i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 5px',
                      borderRadius: '4px',
                      color: speakIdx === i ? C.amber : C.ghost,
                      fontSize: '16px',
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {speakIdx === i ? '⏹' : '🔊'}
                  </button>
                )}
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '92%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? C.amberBg : C.card,
                    border: `1px solid ${msg.role === 'user' ? C.amberDim : C.border}`,
                    color: msg.role === 'user' ? C.text : C.muted,
                    fontSize: '16px',
                    lineHeight: 1.8,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'user' ? (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  ) : (
                    <>
                      <MarkdownView
                        text={msg.content}
                        streaming={loading && i === msgs.length - 2 /* assistant placeholder while streaming */}
                      />
                      {msg.content && (
                        <button
                          onClick={() => {
                            const raw = msg.content.replace(/^\[OUTCOME:[A-Z_]+\]\s*/i, '');
                            void navigator.clipboard.writeText(raw);
                            setCopiedIdx(i);
                            window.setTimeout(() => setCopiedIdx((cur) => (cur === i ? null : cur)), 1200);
                          }}
                          title="Copy raw text"
                          style={{
                            position: 'absolute', top: 4, right: 4,
                            padding: '2px 8px', fontSize: '11px',
                            background: C.panel, border: `1px solid ${C.border}`,
                            color: copiedIdx === i ? C.amber : C.dim,
                            borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                            opacity: 0.85,
                          }}
                        >
                          {copiedIdx === i ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {msg.role === 'assistant' && (() => {
                const options = extractMcqOptions(msg.content);
                if (options.length < 2) return null;
                // Hide options after the user has already answered the next turn.
                const next = msgs[msgs.indexOf(msg) + 1];
                if (next && next.role === 'user') return null;
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      marginTop: '8px',
                      marginLeft: '32px',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {options.map((opt) => (
                      <button
                        key={`${i}-${opt.label}`}
                        onClick={() => {
                          // Find the question prompt (nearest line above options).
                          const stem = msg.content.split('\n').filter((l) => l.trim()).find((l) => /\?\s*$/.test(l.trim())) || undefined;
                          onQuickAnswer(opt, options, stem);
                        }}
                        disabled={loading}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${C.borderHi}`,
                          background: loading ? C.panel : C.card,
                          color: C.text,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                        }}
                      >
                        Pick {opt.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            );
          })}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ width: '26px', flexShrink: 0 }} />
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.dim,
                fontSize: '15px',
              }}
            >
              <span
                style={{
                  animation: 'pulse 1.2s infinite',
                  display: 'inline-block',
                  color: C.amber,
                }}
              >
                ■
              </span>{' '}
              thinking...
            </div>
          </div>
        )}
        {error && (
          <div
            onClick={onDismissError}
            title="Click to dismiss"
            style={{
              alignSelf: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '12px',
              cursor: onDismissError ? 'pointer' : 'default',
              maxWidth: '92%',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          borderTop: `1px solid ${C.border}`,
          background: C.panel,
          flexShrink: 0,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={taRef}
          value={inp}
          onChange={(e) => onInpChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={2}
          placeholder="Answer the question, say 'go deeper', 'give me another', 'explain differently', 'mnemonic'…"
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            color: C.text,
            padding: '8px 12px',
            fontSize: '16px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.7,
            maxHeight: '168px',
            overflowY: 'auto',
          }}
        />
        <button
          onClick={onSend}
          disabled={!inp.trim() || loading || !sel}
          style={{
            padding: '10px 18px',
            background: !inp.trim() || loading || !sel ? C.ghost : C.amber,
            color: !inp.trim() || loading || !sel ? C.dim : '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: !inp.trim() || loading || !sel ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
        >
          {loading && (
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
          )}
          SEND
        </button>
      </div>
      <div style={{
        padding: '4px 16px 8px', background: C.panel, borderTop: `1px solid ${C.border}`,
        fontSize: '11px', color: C.dim, display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span>Context: {tokenEstimate.toLocaleString()} / {tokenLimit.toLocaleString()} tokens</span>
        <div style={{ flex: 1, height: '4px', background: C.card, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${tokenPct}%`, height: '100%', background: tokenPct > 80 ? '#dc2626' : tokenPct > 50 ? C.amber : C.d3 }} />
        </div>
        <span>{tokenPct}%</span>
      </div>
    </div>
  );
}
