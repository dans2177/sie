import { C } from '../data/colors';
import { MATH } from '../data/math';
import FormulaDisplay from './FormulaDisplay';

export default function MathSheet({
  speakIdx,
  onSpeak,
  embedded = false,
}: {
  speakIdx: number | string | null;
  onSpeak: (text: string, idx: number | string) => void;
  embedded?: boolean;
}) {
  const sheetMaxWidth = embedded ? '1500px' : '820px';
  const cardGrid = embedded
    ? 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))'
    : 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 4vw, 20px)', background: embedded ? C.card : C.bg }}>
      <div style={{ maxWidth: sheetMaxWidth, margin: '0 auto' }}>
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
          <div style={{ fontSize: '15px', color: C.dim, marginTop: '6px' }}>
            Every formula tested on the SIE. Click 🔊 on any card to hear it read aloud.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cardGrid, gap: '16px', marginBottom: '16px' }}>
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
                  <div style={{ fontSize: '18px', color: C.text, fontWeight: 'bold' }}>{f.title}</div>
                </div>
                <button
                  title="Listen"
                  onClick={() => onSpeak(`${f.title}: ${f.formula}`, `m${i}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: speakIdx === `m${i}` ? C.amber : C.dim,
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: '4px',
                  }}
                >
                  {speakIdx === `m${i}` ? '⏹' : '🔊'}
                </button>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <FormulaDisplay title={f.title} fallback={f.formula} color={f.color} />
                {f.parts.map((p, j) => (
                  <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '14px' }}>
                    <span
                      style={{
                        color: f.color,
                        flexShrink: 0,
                        minWidth: '170px',
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
                      fontSize: '11px',
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
                      fontSize: '14px',
                      color: C.muted,
                      marginBottom: '5px',
                    }}
                  >
                    {f.example.q}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: C.d3,
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
                    fontSize: '14px',
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
