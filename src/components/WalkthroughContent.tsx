import { useState } from 'react';
import { C } from '../data/colors';

type Step = {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  bullets: string[];
  cue: string;
};

const STEPS: Step[] = [
  {
    title: 'How Progression Works',
    subtitle: 'Most topics are locked until you clear the previous one',
    emoji: '🔒',
    color: '#3b82f6',
    bullets: [
      'Start at the first unlocked topic in the sidebar.',
      'Complete topics in order; each pass unlocks the next topic.',
    ],
    cue: 'This app is intentionally linear: one topic at a time.',
  },
  {
    title: 'Learn, Then Prove It',
    subtitle: 'Use chat to learn and answer exam-style questions',
    emoji: '🧠',
    color: '#16a34a',
    bullets: [
      'Ask for explanations, examples, and traps for the current topic.',
      'Use quick A/B/C/D picks and aim for correct answers to pass.',
    ],
    cue: 'The core loop is: learn -> answer -> pass -> unlock next.',
  },
  {
    title: 'Use Tests With Intent',
    subtitle: 'Daily Test for rhythm, Mock Exam for readiness',
    emoji: '📝',
    color: '#f59e0b',
    bullets: [
      'Take Daily Test to keep momentum and check weak spots.',
      'Run Mock Exam to simulate timing, pressure, and pacing.',
    ],
    cue: 'Progress first, then test depth under time pressure.',
  },
  {
    title: 'Navigate The App',
    subtitle: 'Know what each area is for',
    emoji: '🧭',
    color: '#7c3aed',
    bullets: [
      'TOPICS: locked progression and topic mastery path.',
      'DAILY TEST / MOCK EXAM: checkpoint your progress and readiness.',
    ],
    cue: 'When in doubt: go back to the next unlocked topic and continue.',
  },
];

function StepGraphic({ step }: { step: Step }) {
  return (
    <div
      style={{
        background: `linear-gradient(150deg, ${step.color}22 0%, ${C.card} 55%)`,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        padding: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Now</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: '18px', marginTop: '2px' }}>{step.title}</div>
        </div>
        <div style={{ fontSize: '30px' }}>{step.emoji}</div>
      </div>

      <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
        <div style={{ height: '10px', width: '100%', background: C.panel, borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: '70%', height: '100%', background: step.color, borderRadius: '999px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: C.dim }}>Topic</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>1</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: C.dim }}>Quick Qs</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>3</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: C.dim }}>Win</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>+1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalkthroughContent({
  onClose,
  dontShowAgain,
  onDontShowAgainChange,
}: {
  onClose: () => void;
  dontShowAgain: boolean;
  onDontShowAgainChange: (value: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 22px)', background: C.bg, minHeight: '440px' }}>
      <div
        style={{
          background: `linear-gradient(145deg, ${C.amberBg} 0%, ${C.card} 60%)`,
          border: `1px solid ${C.border}`,
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: C.dim, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Onboarding</div>
            <div style={{ fontSize: '22px', color: C.text, fontWeight: 800, marginTop: '2px' }}>How This App Works</div>
            <div style={{ fontSize: '13px', color: C.dim, marginTop: '2px' }}>Process, progression, and what to do at each stage.</div>
          </div>
          <div style={{ minWidth: '190px', flex: 1, maxWidth: '260px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: '11px', marginBottom: '5px' }}>
              <span>Progress</span>
              <span>{percent}%</span>
            </div>
            <div style={{ height: '10px', background: C.panel, borderRadius: '999px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <div style={{ width: `${percent}%`, height: '100%', background: C.amber, transition: 'width 0.25s ease' }} />
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px' }}>
          <StepGraphic step={current} />

          <div style={{ marginTop: '12px', fontSize: '24px', color: C.text, fontWeight: 700 }}>{current.title}</div>
          <div style={{ marginTop: '4px', color: C.dim, fontSize: '15px' }}>{current.subtitle}</div>

          <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
            {current.bullets.map((bullet, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', color: C.muted, fontSize: '14px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ color: current.color, marginTop: '1px', fontWeight: 700 }}>✓</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '10px', color: C.text, fontSize: '13px', background: `${current.color}1a`, border: `1px solid ${current.color}66`, borderRadius: '8px', padding: '8px 10px' }}>
            Tip: {current.cue}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {STEPS.map((s, idx) => (
            <button
              key={s.title}
              onClick={() => setStep(idx)}
              style={{
                textAlign: 'left',
                border: `1px solid ${idx === step ? s.color : C.border}`,
                background: idx === step ? `${s.color}1a` : C.card,
                borderRadius: '10px',
                padding: '10px 12px',
                cursor: 'pointer',
                color: C.text,
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: C.dim }}>Step {idx + 1}</div>
                <div style={{ fontSize: '18px' }}>{s.emoji}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '2px' }}>{s.title}</div>
              <div style={{ fontSize: '12px', color: C.dim, marginTop: '2px' }}>{s.subtitle}</div>
            </button>
          ))}

          <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: C.muted, fontSize: '13px', marginTop: '4px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px' }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgainChange(e.target.checked)}
            />
            Do not show again
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === step ? '22px' : '8px',
                height: '8px',
                borderRadius: '999px',
                background: idx === step ? current.color : C.border,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.muted,
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              style={{
                border: `1px solid ${current.color}`,
                background: current.color,
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                border: `1px solid ${current.color}`,
                background: current.color,
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              Start Learning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
