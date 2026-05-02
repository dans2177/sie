import { useEffect, useMemo, useRef } from 'react';
import { C } from '../data/colors';
import { extractMcqOptions, parseAssistantOutcome, renderChatContent } from '../lib/chatHelpers';
import type { ChatMessage, SelectedTopic } from '../types/index';

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
}: {
  sel: SelectedTopic | null;
  msgs: ChatMessage[];
  loading: boolean;
  inp: string;
  onInpChange: (v: string) => void;
  onSend: () => void;
  onQuickAnswer: (choice: string) => void;
  speakIdx: number | string | null;
  onSpeak: (text: string, idx: number | string) => void;
  spRate: number;
  onSpRateChange: (r: number) => void;
  voiceName: string | null;
}) {
  const chatRef = useRef<HTMLDivElement>(null);
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
          .map((msg, i) => (
            <div key={i}>
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
                    maxWidth: '92%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? C.amberBg : C.card,
                    border: `1px solid ${msg.role === 'user' ? C.amberDim : C.border}`,
                    color: msg.role === 'user' ? C.text : C.muted,
                    fontSize: '16px',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderChatContent(msg.content)}
                </div>
              </div>
              {msg.role === 'assistant' && (() => {
                const options = extractMcqOptions(msg.content);
                if (options.length < 2) return null;
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
                        onClick={() => onQuickAnswer(`My answer is ${opt.label}. ${opt.text}`)}
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
          ))}
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
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
