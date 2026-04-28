import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from './data/colors';
import { CURRICULUM, TOTAL } from './data/curriculum';
import { MATH } from './data/math';
import { CHEATSHEET } from './data/cheatsheet';
import { callClaude } from './lib/api';
import { loadDone, saveDone } from './lib/storage';
import { pickVoice, cleanSpeech } from './lib/tts';
import type { ChatMessage, PdfState, SelectedTopic, View } from './types';

function Header({ pct, view, onViewChange }: { pct: number; view: View; onViewChange: (v: View) => void }) {
  const Btn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 13px',
        borderRadius: '4px',
        border: '1px solid',
        borderColor: active ? C.amber : C.border,
        background: active ? C.amberBg : 'transparent',
        color: active ? C.amber : C.dim,
        cursor: 'pointer',
        fontSize: '11px',
        letterSpacing: '0.06em',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
        gap: '12px',
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: C.amber, letterSpacing: '0.08em' }}>
          SIE STUDY SYSTEM
        </div>
        <div style={{ fontSize: '9px', color: C.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          FINRA Securities Industry Essentials · 2024 Outline
        </div>
      </div>
      <div style={{ flex: 1, height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden', margin: '0 12px' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: C.amber,
            transition: 'width 0.4s',
            borderRadius: '2px',
          }}
        />
      </div>
      <div style={{ fontSize: '11px', color: C.amber, minWidth: '40px', textAlign: 'right' }}>{pct}%</div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <Btn
          label="DASHBOARD"
          active={view === 'dashboard'}
          onClick={() => onViewChange('dashboard')}
        />
        <Btn label="TOPICS" active={view === 'topics' || view === 'chat'} onClick={() => onViewChange('topics')} />
        <Btn label="MATH" active={view === 'math'} onClick={() => onViewChange('math')} />
        <Btn label="CHEATSHEET" active={view === 'cheatsheet'} onClick={() => onViewChange('cheatsheet')} />
      </div>
    </div>
  );
}

function Sidebar({
  done,
  onToggleDone,
  sel,
  onSelectTopic,
  exp,
  onToggleExp,
}: {
  done: Set<string>;
  onToggleDone: (id: string) => void;
  sel: SelectedTopic | null;
  onSelectTopic: (topic: any, domain: any) => void;
  exp: Record<string, boolean>;
  onToggleExp: (id: string) => void;
}) {
  return (
    <div
      style={{
        width: '270px',
        borderRight: `1px solid ${C.border}`,
        overflowY: 'auto',
        flexShrink: 0,
        background: C.panel,
      }}
    >
      {CURRICULUM.map(domain => {
        const dd = domain.topics.filter(t => done.has(t.id)).length;
        const isExp = exp[domain.id];
        return (
          <div key={domain.id}>
            <div
              onClick={() => onToggleExp(domain.id)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderBottom: `1px solid ${C.border}`,
                background: isExp ? C.card : 'transparent',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: domain.color,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {domain.label} · {domain.weight}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: C.muted,
                    marginTop: '2px',
                    lineHeight: 1.3,
                  }}
                >
                  {domain.title}
                </div>
              </div>
              <span style={{ fontSize: '10px', color: domain.color, opacity: 0.8, flexShrink: 0 }}>
                {dd}/{domain.topics.length}
              </span>
              <span
                style={{
                  color: C.dim,
                  fontSize: '9px',
                  transform: isExp ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              >
                ▶
              </span>
            </div>
            {isExp &&
              domain.topics.map(topic => {
                const isDone = done.has(topic.id);
                const isActive = sel?.topic.id === topic.id;
                return (
                  <div
                    key={topic.id}
                    onClick={() => onSelectTopic(topic, domain)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px 7px 18px',
                      cursor: 'pointer',
                      background: isActive ? C.card : 'transparent',
                      borderBottom: `1px solid ${C.bg}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        onToggleDone(topic.id);
                      }}
                      style={{
                        width: '13px',
                        height: '13px',
                        borderRadius: '3px',
                        border: `1px solid ${isDone ? domain.color : C.ghost}`,
                        background: isDone ? domain.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {isDone && (
                        <span style={{ color: '#000', fontSize: '8px', fontWeight: 'bold', lineHeight: 1 }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        color: isActive ? C.text : C.muted,
                        lineHeight: 1.35,
                      }}
                    >
                      {topic.title}
                    </div>
                    <span style={{ fontSize: '9px', color: C.dim, flexShrink: 0 }}>{topic.code}</span>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function Dashboard({
  done,
  pdf,
  onPdfChange,
}: {
  done: Set<string>;
  pdf: PdfState;
  onPdfChange: (pdf: PdfState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = Math.round((done.size / TOTAL) * 100);

  const handlePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const data = (ev.target?.result as string)?.split(',')[1];
      onPdfChange({ b64: data || null, name: f.name });
    };
    r.readAsDataURL(f);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.d1}22`,
              borderRadius: '8px',
              padding: '16px',
              borderLeft: `3px solid ${C.d1}`,
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: C.dim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              Overall Progress
            </div>
            <div style={{ fontSize: '26px', color: C.d1, fontWeight: 'bold' }}>{pct}%</div>
            <div style={{ fontSize: '11px', color: C.dim, marginTop: '3px' }}>
              {done.size}/{TOTAL} topics done
            </div>
          </div>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.d3}22`,
              borderRadius: '8px',
              padding: '16px',
              borderLeft: `3px solid ${C.d3}`,
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: C.dim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              Exam Structure
            </div>
            <div style={{ fontSize: '26px', color: C.d3, fontWeight: 'bold' }}>75</div>
            <div style={{ fontSize: '11px', color: C.dim, marginTop: '3px' }}>scored · 85 total · 70% to pass</div>
          </div>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.d4}22`,
              borderRadius: '8px',
              padding: '16px',
              borderLeft: `3px solid ${C.d4}`,
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: C.dim,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              Study Book
            </div>
            {pdf.name ? (
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>✓ Loaded</div>
            ) : (
              <div style={{ fontSize: '12px', color: C.dim, marginTop: '4px' }}>Not uploaded</div>
            )}
            <div style={{ fontSize: '10px', color: C.dim, marginTop: '3px' }}>
              {pdf.name ? pdf.name.slice(0, 24) : 'Upload PDF for AI context'}
            </div>
          </div>
        </div>
        {CURRICULUM.map(domain => {
          const dd = domain.topics.filter(t => done.has(t.id)).length;
          const dp = Math.round((dd / domain.topics.length) * 100);
          return (
            <div
              key={domain.id}
              style={{
                marginBottom: '14px',
                background: C.card,
                border: `1px solid ${domain.color}22`,
                borderRadius: '10px',
                borderLeft: `3px solid ${domain.color}`,
              }}
            >
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: domain.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {domain.label} · {domain.weight} · {domain.items} exam questions
                  </div>
                  <div style={{ fontSize: '13px', color: C.text, marginTop: '2px' }}>{domain.title}</div>
                </div>
                <div style={{ fontSize: '22px', color: domain.color, fontWeight: 'bold' }}>{dp}%</div>
              </div>
              <div
                style={{
                  height: '3px',
                  background: C.border,
                  margin: '0 16px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${dp}%`,
                    background: domain.color,
                    transition: 'width 0.4s',
                    borderRadius: '2px',
                  }}
                />
              </div>
              <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {domain.topics.map(t => {
                  const isDone = done.has(t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        fontSize: '10px',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        background: isDone ? `${domain.color}18` : C.panel,
                        color: isDone ? domain.color : C.dim,
                        border: `1px solid ${isDone ? domain.color + '44' : C.border}`,
                      }}
                    >
                      {isDone ? '✓ ' : ''}
                      {t.code}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div
          style={{
            background: C.card,
            border: `1px dashed ${C.border}`,
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: C.dim,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            Study Book PDF
          </div>
          <div
            style={{
              fontSize: '11px',
              color: C.ghost,
              marginBottom: '12px',
            }}
          >
            Upload your SIE study book so the AI tutor can reference it during sessions.
          </div>
          {pdf.name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ {pdf.name}</span>
              <button
                onClick={() => onPdfChange({ b64: null, name: null })}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid #7f1d1d',
                  borderRadius: '4px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '7px 14px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: '4px',
                color: C.muted,
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'inherit',
              }}
            >
              + Upload PDF
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePDF} />
        </div>
      </div>
    </div>
  );
}

function ChatView({
  sel,
  msgs,
  loading,
  inp,
  onInpChange,
  onSend,
  onBack,
  speakIdx,
  onSpeak,
  spRate,
  onSpRateChange,
  voiceName,
  pdf,
}: {
  sel: SelectedTopic | null;
  msgs: ChatMessage[];
  loading: boolean;
  inp: string;
  onInpChange: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  speakIdx: number | string | null;
  onSpeak: (text: string, idx: number | string) => void;
  spRate: number;
  onSpRateChange: (r: number) => void;
  voiceName: string | null;
  pdf: PdfState;
}) {
  const chatRef = useRef<HTMLDivElement>(null);

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
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: C.dim,
              cursor: 'pointer',
              fontSize: '12px',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            ← back
          </button>
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
          <div style={{ fontSize: '13px', color: C.text, fontWeight: 'bold' }}>{sel?.topic.title ?? ''}</div>
          <div style={{ fontSize: '10px', color: C.dim, marginLeft: 'auto' }}>{sel?.topic.code}</div>
        </div>
        {sel && (
          <div style={{ fontSize: '11px', color: C.dim, marginTop: '3px' }}>
            {sel.domain.label} · {sel.domain.title} · {sel.domain.weight} of exam
          </div>
        )}
        {pdf.name && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: '#22c55e',
              background: '#0f2011',
              border: '1px solid #166534',
              borderRadius: '3px',
              padding: '2px 8px',
              marginTop: '6px',
            }}
          >
            ▣ {pdf.name}
          </div>
        )}
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
            <span style={{ fontSize: '10px', color: C.ghost }}>🔊 {voiceName}</span>
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {[0.8, 1.0, 1.2, 1.5].map(r => (
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
                    fontSize: '10px',
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
            <div
              key={i}
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
                    fontSize: '13px',
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
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? C.amberBg : C.card,
                  border: `1px solid ${msg.role === 'user' ? C.amberDim : C.border}`,
                  color: msg.role === 'user' ? '#fcd34d' : C.muted,
                  fontSize: '12px',
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content.split('\n').map((line, j, arr) => (
                  <span key={j}>
                    {line.replace(/\[DEF\]/g, '📌').replace(/\[EXAM TIP\]/g, '⚡')}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </div>
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
                fontSize: '12px',
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
          onChange={e => onInpChange(e.target.value)}
          onKeyDown={e => {
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
            fontSize: '12px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={onSend}
          disabled={!inp.trim() || loading || !sel}
          style={{
            padding: '8px 16px',
            background: !inp.trim() || loading || !sel ? C.ghost : '#92400e',
            color: !inp.trim() || loading || !sel ? C.dim : '#fcd34d',
            border: 'none',
            borderRadius: '6px',
            cursor: !inp.trim() || loading || !sel ? 'not-allowed' : 'pointer',
            fontSize: '12px',
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

function MathSheet({ speakIdx, onSpeak }: { speakIdx: number | string | null; onSpeak: (text: string, idx: number | string) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '10px',
              color: C.dim,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            SIE Exam Reference
          </div>
          <div
            style={{
              fontSize: '20px',
              color: C.text,
              fontWeight: 'bold',
              letterSpacing: '0.04em',
            }}
          >
            Math Equation Cheat Sheet
          </div>
          <div style={{ fontSize: '12px', color: C.dim, marginTop: '6px' }}>
            Every formula tested on the SIE. Click 🔊 on any card to hear it read aloud.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: '16px', marginBottom: '16px' }}>
          {MATH.map((f, i) => (
            <div
              key={f.id}
              style={{
                background: C.card,
                border: `1px solid ${f.color}30`,
                borderRadius: '10px',
                borderLeft: `3px solid ${f.color}`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '9px',
                      color: f.color,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginBottom: '3px',
                    }}
                  >
                    Formula {i + 1}
                  </div>
                  <div style={{ fontSize: '14px', color: C.text, fontWeight: 'bold' }}>{f.title}</div>
                </div>
                <button
                  title="Listen"
                  onClick={() => onSpeak(`${f.title}: ${f.formula}`, `m${i}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: speakIdx === `m${i}` ? C.amber : C.dim,
                    fontSize: '14px',
                    lineHeight: 1,
                    padding: '4px',
                  }}
                >
                  {speakIdx === `m${i}` ? '⏹' : '🔊'}
                </button>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: f.color,
                    background: `${f.color}0d`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    lineHeight: 2,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {f.formula}
                </div>
                {f.parts.map((p, j) => (
                  <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '11px' }}>
                    <span
                      style={{
                        color: f.color,
                        flexShrink: 0,
                        minWidth: '140px',
                        fontWeight: 'bold',
                      }}
                    >
                      {p.label}
                    </span>
                    <span style={{ color: C.muted }}>{p.desc}</span>
                  </div>
                ))}
                <div style={{ marginTop: '14px', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                  <div
                    style={{
                      fontSize: '9px',
                      color: C.dim,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      marginBottom: '6px',
                    }}
                  >
                    Example
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: C.muted,
                      marginBottom: '5px',
                    }}
                  >
                    {f.example.q}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#34d399',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                    }}
                  >
                    {f.example.a}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '11px',
                    color: C.dim,
                    background: C.panel,
                    borderRadius: '5px',
                    padding: '8px 10px',
                    lineHeight: 1.65,
                    borderLeft: `2px solid ${f.color}66`,
                  }}
                >
                  ⚡ {f.rule}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheatSheet() {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: C.bg,
        padding: '20px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: C.amber,
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            SIE QUICK REFERENCE CHEATSHEET
          </div>
          <div style={{ fontSize: '12px', color: C.dim }}>
            Essential formulas, rules, and definitions for SIE exam mastery
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {CHEATSHEET.map(item => (
            <div
              key={item.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                padding: '16px',
                borderLeft: `3px solid ${item.color}`,
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: item.color,
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                {item.category}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: C.text,
                  marginBottom: '8px',
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: item.color,
                  fontFamily: 'monospace',
                  background: `${item.color}0d`,
                  padding: '8px 10px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {item.content}
              </div>
              {item.rules && item.rules.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
                  {item.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '10px',
                        color: C.muted,
                        marginBottom: '4px',
                        paddingLeft: '10px',
                        borderLeft: `2px solid ${item.color}66`,
                      }}
                    >
                      • {rule}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [done, setDone] = useState<Set<string>>(() => loadDone());
  const [sel, setSel] = useState<SelectedTopic | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdf, setPdf] = useState<PdfState>({ b64: null, name: null });
  const [ready, setReady] = useState(false);
  const [exp, setExp] = useState<Record<string, boolean>>({ d1: true, d2: false, d3: false, d4: false });
  const [view, setView] = useState<View>('topics');
  const [speakIdx, setSpeakIdx] = useState<number | string | null>(null);
  const [spRate, setSpRate] = useState(1.0);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setReady(true);
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        const picked = pickVoice(voices);
        voiceRef.current = picked;
        setVoiceName(picked?.name ?? null);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const pct = Math.round((done.size / TOTAL) * 100);

  const toggleDone = useCallback(
    (id: string) => {
      setDone(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        saveDone(n);
        return n;
      });
    },
    []
  );

  const speak = useCallback(
    (text: string, idx: number | string) => {
      window.speechSynthesis.cancel();
      if (speakIdx === idx) {
        setSpeakIdx(null);
        return;
      }
      const utt = new SpeechSynthesisUtterance(cleanSpeech(text));
      utt.rate = spRate;
      utt.pitch = 1;
      utt.volume = 1;
      if (voiceRef.current) utt.voice = voiceRef.current;
      utt.onend = () => setSpeakIdx(null);
      utt.onerror = () => setSpeakIdx(null);
      setSpeakIdx(idx);
      window.speechSynthesis.speak(utt);
    },
    [speakIdx, spRate]
  );

  const openTopic = useCallback(
    async (topic: any, domain: any) => {
      window.speechSynthesis.cancel();
      setSpeakIdx(null);
      setSel({ topic, domain });
      setView('chat');
      const init: ChatMessage[] = [
        {
          role: 'user',
          content: `Teach me "${topic.title}" for the SIE exam. Cover the key concepts, then give me a practice multiple-choice question.`,
        },
      ];
      setMsgs(init);
      setLoading(true);
      try {
        const r = await callClaude(init, topic, domain, pdf);
        setMsgs([...init, { role: 'assistant', content: r }]);
      } catch (e) {
        setMsgs([...init, { role: 'assistant', content: `Error: ${(e as Error).message}` }]);
      }
      setLoading(false);
    },
    [pdf]
  );

  const send = useCallback(async () => {
    if (!inp.trim() || loading || !sel) return;
    const txt = inp.trim();
    setInp('');
    const next = [...msgs, { role: 'user' as const, content: txt }];
    setMsgs(next);
    setLoading(true);
    try {
      const r = await callClaude(next, sel.topic, sel.domain, pdf);
      setMsgs([...next, { role: 'assistant', content: r }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `Error: ${(e as Error).message}` }]);
    }
    setLoading(false);
  }, [inp, loading, sel, msgs, pdf]);

  if (!ready)
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          color: C.amber,
          fontFamily: "'Courier New',monospace",
        }}
      >
        Loading...
      </div>
    );

  const isTopicView = view === 'topics' || view === 'chat';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: "'Courier New',monospace",
        background: C.bg,
        color: C.text,
        fontSize: '13px',
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}`}</style>
      <Header pct={pct} view={view} onViewChange={setView} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {view === 'dashboard' && <Dashboard done={done} pdf={pdf} onPdfChange={setPdf} />}
        {view === 'math' && <MathSheet speakIdx={speakIdx} onSpeak={speak} />}
        {view === 'cheatsheet' && <CheatSheet />}
        {isTopicView && (
          <>
            <Sidebar
              done={done}
              onToggleDone={toggleDone}
              sel={sel}
              onSelectTopic={openTopic}
              exp={exp}
              onToggleExp={id => setExp(p => ({ ...p, [id]: !p[id] }))}
            />
            {view === 'topics' ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.dim,
                  padding: '40px',
                  gap: '12px',
                  background: C.bg,
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    color: C.ghost,
                    letterSpacing: '0.1em',
                  }}
                >
                  SELECT A TOPIC TO BEGIN
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: C.border,
                    textAlign: 'center',
                    lineHeight: 2,
                  }}
                >
                  {`Click any topic in the sidebar\nCheck ✓ to mark as mastered\nUpload your book PDF in Dashboard`}
                </div>
              </div>
            ) : (
              <ChatView
                sel={sel}
                msgs={msgs}
                loading={loading}
                inp={inp}
                onInpChange={setInp}
                onSend={send}
                onBack={() => setView('topics')}
                speakIdx={speakIdx}
                onSpeak={speak}
                spRate={spRate}
                onSpRateChange={setSpRate}
                voiceName={voiceName}
                pdf={pdf}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
