import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { C } from '../data/colors';
import { CURRICULUM, TOTAL } from '../data/curriculum';
import { getMathDrillSummary } from '../lib/mathDrills';
import { loadDailyTest } from '../lib/server';

type Props = {
  profileId: string;
  profileLabel: string;
  familyProfiles: Array<{ id: string; label: string }>;
  done: Set<string>;
  onOpenSection: (sectionId: string) => void;
  onResetSection: (sectionId: string) => Promise<void>;
  onResetAll: () => Promise<void>;
  onRestartSectionQuestions: (sectionId: string) => Promise<void>;
  onRestartAllQuestions: () => Promise<void>;
  onOpenMathDrills: () => void;
  onLog: (eventType: string, payload?: Record<string, unknown>) => void;
};

export default function OverviewView({
  profileId,
  profileLabel,
  familyProfiles,
  done,
  onOpenSection,
  onResetSection,
  onResetAll,
  onRestartSectionQuestions,
  onRestartAllQuestions,
  onOpenMathDrills,
  onLog,
}: Props) {
  const [history, setHistory] = useState<Array<{ date: string; score: number; total: number; completedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [familyStats, setFamilyStats] = useState<Array<{ id: string; label: string; avgPct: number; bestPct: number; attempts: number }>>([]);
  const [mathSummary, setMathSummary] = useState(() => getMathDrillSummary(profileId));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const data = await loadDailyTest(profileId, today);
      if (cancelled) return;
      setHistory(data.history || []);
      setMathSummary(getMathDrillSummary(profileId));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    const loadFamily = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const stats = await Promise.all(
        familyProfiles.map(async (p) => {
          const data = await loadDailyTest(p.id, today);
          const h = data.history || [];
          const avgPct = h.length
            ? Math.round(h.reduce((sum, x) => sum + (x.score / Math.max(x.total, 1)) * 100, 0) / h.length)
            : 0;
          const bestPct = h.length
            ? Math.max(...h.map((x) => Math.round((x.score / Math.max(x.total, 1)) * 100)))
            : 0;
          return { id: p.id, label: p.label, avgPct, bestPct, attempts: h.length };
        })
      );
      if (cancelled) return;
      setFamilyStats(stats.sort((a, b) => b.avgPct - a.avgPct || b.bestPct - a.bestPct));
    };
    loadFamily();
    return () => {
      cancelled = true;
    };
  }, [familyProfiles]);

  const sectionProgress = useMemo(() => {
    return CURRICULUM.map((section) => {
      const mastered = section.topics.filter((t) => done.has(t.id)).length;
      const total = section.topics.length;
      const pct = total ? Math.round((mastered / total) * 100) : 0;
      return {
        id: section.id,
        label: section.label,
        title: section.title,
        color: section.color,
        mastered,
        total,
        pct,
      };
    });
  }, [done]);

  const scoreTrend = useMemo(() => {
    return [...history]
      .reverse()
      .map((h) => ({
        date: h.date.slice(5),
        pct: Math.round((h.score / Math.max(h.total, 1)) * 100),
        score: h.score,
        total: h.total,
      }));
  }, [history]);

  const totalMastered = done.size;
  const overallPct = Math.round((totalMastered / Math.max(TOTAL, 1)) * 100);
  const avgScore = history.length
    ? Math.round(
        history.reduce((sum, h) => sum + (h.score / Math.max(h.total, 1)) * 100, 0) / history.length
      )
    : 0;
  const bestScore = history.length
    ? Math.max(...history.map((h) => Math.round((h.score / Math.max(h.total, 1)) * 100)))
    : 0;

  const streakDays = useMemo(() => {
    const uniqueDates = [...new Set(history.map((h) => h.date))].sort((a, b) => b.localeCompare(a));
    if (!uniqueDates.length) return 0;
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const d of uniqueDates) {
      const hit = d === cursor.toISOString().slice(0, 10);
      if (!hit) {
        if (streak === 0) {
          cursor.setDate(cursor.getDate() - 1);
          if (d !== cursor.toISOString().slice(0, 10)) break;
        } else {
          break;
        }
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [history]);

  const nextBestStep = useMemo(() => {
    const weakestSection = [...sectionProgress].sort((a, b) => a.pct - b.pct)[0] || null;
    const recent = history.slice(0, 3);
    const recentAvg = recent.length
      ? Math.round(recent.reduce((sum, h) => sum + (h.score / Math.max(h.total, 1)) * 100, 0) / recent.length)
      : 0;

    if (!weakestSection) {
      return {
        title: 'Take Daily Test',
        detail: 'No section data yet. Start with a daily test to create your baseline.',
        cta: 'Open Daily Test',
        sectionId: null as string | null,
      };
    }

    if (recent.length === 0) {
      return {
        title: `Start ${weakestSection.label}`,
        detail: `Begin with ${weakestSection.title} to build an early win and set your baseline score.`,
        cta: 'Open Section',
        sectionId: weakestSection.id,
      };
    }

    if (recentAvg < 70) {
      return {
        title: `Progress Through ${weakestSection.label}`,
        detail: `Recent average is ${recentAvg}%. Continue the locked path in ${weakestSection.title} before your next test.`,
        cta: 'Open Section',
        sectionId: weakestSection.id,
      };
    }

    return {
      title: 'Push Difficulty',
      detail: `Recent average is ${recentAvg}%. Run a timed daily test, then target ${weakestSection.label}.`,
      cta: 'Open Section',
      sectionId: weakestSection.id,
    };
  }, [sectionProgress, history]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(id);
    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  };

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    padding: '14px 16px',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gap: '14px' }}>
        <div style={{ ...cardStyle, display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '18px', color: C.text, fontWeight: 'bold' }}>Math XL Repetition</div>
              <div style={{ marginTop: '4px', color: C.dim, fontSize: '14px' }}>
                AI-generated fill-in-the-blank SIE math drills with spaced repetition scheduling.
              </div>
            </div>
            <button
              onClick={() => {
                onLog('overview_open_math_drills_clicked', {});
                onOpenMathDrills();
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.amber}`,
                background: C.amber,
                color: '#ffffff',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Open Math XL
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Tracked', value: mathSummary.tracked },
              { label: 'Due Now', value: mathSummary.dueNow },
              { label: 'Mastered', value: mathSummary.mastered },
              { label: 'Accuracy', value: `${mathSummary.accuracyPct}%` },
            ].map((item) => (
              <div key={item.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 700, color: C.text }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '20px', color: C.text, fontWeight: 'bold' }}>Grand Overview</div>
              <div style={{ marginTop: '4px', color: C.dim, fontSize: '14px' }}>
                Track performance, reset mastered sections, and restart questioning loops.
              </div>
              <div style={{ marginTop: '4px', color: C.dim, fontSize: '12px' }}>
                Reset/Restart keeps your daily test history and trend charts.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  onLog('overview_reset_all_sections_clicked', {});
                  void runAction('reset-all', onResetAll);
                }}
                disabled={Boolean(busyAction)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.borderHi}`,
                  background: C.panel,
                  color: C.text,
                  fontSize: '12px',
                  cursor: busyAction ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Reset All Sections
              </button>
              <button
                onClick={() => {
                  onLog('overview_restart_all_questions_clicked', {});
                  void runAction('restart-all', onRestartAllQuestions);
                }}
                disabled={Boolean(busyAction)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.borderHi}`,
                  background: '#92400e',
                  color: '#fcd34d',
                  fontSize: '12px',
                  cursor: busyAction ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Restart All Questioning
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={cardStyle}>
            <div style={{ color: C.dim, fontSize: '12px' }}>Overall Progress</div>
            <div style={{ color: C.text, fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{overallPct}%</div>
            <div style={{ color: C.muted, fontSize: '13px' }}>{totalMastered}/{TOTAL} topics mastered</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: C.dim, fontSize: '12px' }}>Avg Daily Score</div>
            <div style={{ color: C.text, fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{avgScore}%</div>
            <div style={{ color: C.muted, fontSize: '13px' }}>Across {history.length} attempts</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: C.dim, fontSize: '12px' }}>Best Daily Score</div>
            <div style={{ color: C.text, fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{bestScore}%</div>
            <div style={{ color: C.muted, fontSize: '13px' }}>Recent peak performance</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: C.dim, fontSize: '12px' }}>Current Streak</div>
            <div style={{ color: C.text, fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{streakDays} day{streakDays === 1 ? '' : 's'}</div>
            <div style={{ color: C.muted, fontSize: '13px' }}>{profileLabel} consistency tracker</div>
          </div>
        </div>

        <div style={{ ...cardStyle, border: `1px solid ${C.borderHi}` }}>
          <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold' }}>Next Best Step</div>
          <div style={{ marginTop: '6px', color: C.text, fontSize: '18px', fontWeight: 700 }}>{nextBestStep.title}</div>
          <div style={{ marginTop: '4px', color: C.dim, fontSize: '14px' }}>{nextBestStep.detail}</div>
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                if (nextBestStep.sectionId) {
                  onOpenSection(nextBestStep.sectionId);
                  onLog('overview_next_best_step_clicked', { sectionId: nextBestStep.sectionId });
                }
              }}
              disabled={!nextBestStep.sectionId}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.amber}`,
                background: nextBestStep.sectionId ? C.amber : C.panel,
                color: nextBestStep.sectionId ? '#fff' : C.dim,
                fontSize: '12px',
                cursor: nextBestStep.sectionId ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              {nextBestStep.cta}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Family Leaderboard</div>
          {familyStats.length === 0 ? (
            <div style={{ color: C.dim, fontSize: '14px' }}>No family test data yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: '6px' }}>
              {familyStats.map((p, idx) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 120px 90px', alignItems: 'center', gap: '8px', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: '8px', background: C.panel }}>
                  <div style={{ color: C.dim, fontSize: '12px' }}>#{idx + 1}</div>
                  <div style={{ color: p.id === profileId ? C.amber : C.text, fontSize: '14px', fontWeight: 'bold' }}>{p.label}</div>
                  <div style={{ color: C.muted, fontSize: '12px' }}>Avg {p.avgPct}%</div>
                  <div style={{ color: C.muted, fontSize: '12px' }}>Best {p.bestPct}%</div>
                  <div style={{ color: C.dim, fontSize: '12px' }}>{p.attempts} tests</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          <div style={cardStyle}>
            <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Daily Tests Over Time</div>
            {loading ? (
              <div style={{ color: C.dim, fontSize: '14px' }}>Loading chart...</div>
            ) : scoreTrend.length === 0 ? (
              <div style={{ color: C.dim, fontSize: '14px' }}>No daily test attempts yet.</div>
            ) : (
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer>
                  <LineChart data={scoreTrend}>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke={C.dim} fontSize={12} />
                    <YAxis domain={[0, 100]} stroke={C.dim} fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                      formatter={(value: any) => [`${value}%`, 'Score']}
                    />
                    <Line type="monotone" dataKey="pct" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Section Progress</div>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <BarChart data={sectionProgress}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke={C.dim} fontSize={12} />
                  <YAxis domain={[0, 100]} stroke={C.dim} fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    formatter={(value: any) => [`${value}%`, 'Mastered']}
                  />
                  <Bar dataKey="pct" fill={C.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: C.text, fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Iterate By Section</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {sectionProgress.map((s) => (
              <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', background: C.panel }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ color: s.color, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.06em' }}>{s.label}</div>
                  <div style={{ color: C.text, fontSize: '14px', fontWeight: 'bold' }}>{s.title}</div>
                  <div style={{ color: C.dim, fontSize: '12px' }}>{s.mastered}/{s.total} mastered ({s.pct}%)</div>
                  <button
                    onClick={() => onOpenSection(s.id)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${C.borderHi}`,
                      background: C.card,
                      color: C.text,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Open Section
                  </button>
                  <button
                    onClick={() => {
                      onLog('overview_reset_section_clicked', { sectionId: s.id });
                      void runAction(`reset-${s.id}`, () => onResetSection(s.id));
                    }}
                    disabled={Boolean(busyAction)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${C.border}`,
                      background: C.card,
                      color: C.muted,
                      fontSize: '12px',
                      cursor: busyAction ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Reset Mastery
                  </button>
                  <button
                    onClick={() => {
                      onLog('overview_restart_section_questions_clicked', { sectionId: s.id });
                      void runAction(`restart-${s.id}`, () => onRestartSectionQuestions(s.id));
                    }}
                    disabled={Boolean(busyAction)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${C.border}`,
                      background: '#92400e',
                      color: '#fcd34d',
                      fontSize: '12px',
                      cursor: busyAction ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Restart Questioning
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
