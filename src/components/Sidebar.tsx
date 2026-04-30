import { useMemo } from 'react';
import { C } from '../data/colors';
import { CURRICULUM } from '../data/curriculum';
import { loadTopicChat } from '../lib/storage';
import { parseAssistantOutcome } from '../lib/chatHelpers';
import type { Domain, SelectedTopic, Topic, View } from '../types/index';

export default function Sidebar({
  profileId,
  done,
  sel,
  onSelectTopic,
  exp,
  onToggleExp,
  collapsed,
  onToggleCollapsed,
  view,
  onViewChange,
  profileLabel,
  onSwitchProfile,
  onOpenTour,
}: {
  profileId: string;
  done: Set<string>;
  sel: SelectedTopic | null;
  onSelectTopic: (topic: Topic, domain: Domain) => void;
  exp: Record<string, boolean>;
  onToggleExp: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  view: View;
  onViewChange: (v: View) => void;
  profileLabel: string;
  onSwitchProfile: () => void;
  onOpenTour: () => void;
}) {
  const masteredByTopic = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const domain of CURRICULUM) {
      for (const topic of domain.topics) {
        map[topic.id] = done.has(topic.id);
      }
    }
    return map;
  }, [done]);

  const unlockedByTopic = useMemo(() => {
    const map: Record<string, boolean> = {};
    const ordered = CURRICULUM.flatMap((d) => d.topics.map((t) => t.id));
    for (let i = 0; i < ordered.length; i += 1) {
      const topicId = ordered[i];
      const prevId = i > 0 ? ordered[i - 1] : null;
      map[topicId] = i === 0 || done.has(topicId) || (prevId ? done.has(prevId) : false);
    }
    return map;
  }, [done]);

  const sectionChatSummary = useMemo(() => {
    const map: Record<string, { correct: number; needsWork: number }> = {};
    for (const domain of CURRICULUM) {
      let correct = 0;
      let needsWork = 0;
      for (const topic of domain.topics) {
        const messages = loadTopicChat(profileId, topic.id);
        for (const m of messages) {
          if (m.role !== 'assistant') continue;
          const outcome = parseAssistantOutcome(m.content);
          if (outcome === 'correct') correct += 1;
          if (outcome === 'needsWork') needsWork += 1;
        }
      }
      map[domain.id] = { correct, needsWork };
    }
    return map;
  }, [profileId]);

  const iconForDomain: Record<string, string> = {
    d1: '📘',
    d2: '📊',
    d3: '🧾',
    d4: '⚖️',
  };

  const IconBtn = ({
    icon,
    label,
    active,
    onClick,
  }: {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 8px',
        borderRadius: '7px',
        border: `1px solid ${active ? C.amber : C.border}`,
        background: active ? C.amberBg : C.card,
        color: active ? C.amber : C.dim,
        cursor: 'pointer',
        fontSize: '11px',
        letterSpacing: '0.03em',
        fontFamily: 'inherit',
      }}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div
      style={{
        width: collapsed ? '86px' : '320px',
        borderRight: `1px solid ${C.border}`,
        overflowY: 'auto',
        flexShrink: 0,
        background: C.panel,
        transition: 'width 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: `1px solid ${C.border}`,
          position: 'sticky',
          top: 0,
          background: C.panel,
          zIndex: 2,
        }}
      >
        {!collapsed ? (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11px', color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Study Menu
            </div>
            <div style={{ fontSize: '13px', color: C.text, fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sel ? sel.topic.title : 'Pick an unlocked topic'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Menu</div>
        )}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            border: `1px solid ${C.border}`,
            background: C.card,
            color: C.dim,
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      {!collapsed ? (
        <>
          <div style={{ display: 'grid', gap: '7px', padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              <IconBtn icon="🏠" label="Overview" active={view === 'overview'} onClick={() => onViewChange('overview')} />
              <IconBtn icon="🧠" label="Topics" active={view === 'topics' || view === 'chat'} onClick={() => onViewChange('topics')} />
              <IconBtn icon="📅" label="Daily" active={view === 'daily'} onClick={() => onViewChange('daily')} />
              <IconBtn icon="📝" label="Mock" active={view === 'mock'} onClick={() => onViewChange('mock')} />
            </div>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              <IconBtn icon="✏️" label="Math XL" active={view === 'math-drills'} onClick={() => onViewChange('math-drills')} />
              <IconBtn icon="📐" label="Formulas" active={false} onClick={() => onViewChange('math')} />
              <IconBtn icon="📌" label="Cheat" active={false} onClick={() => onViewChange('cheatsheet')} />
              <IconBtn icon="🚀" label="Tour" active={false} onClick={onOpenTour} />
              <IconBtn icon="👤" label={`${profileLabel}`} active={false} onClick={onSwitchProfile} />
            </div>
          </div>
          {CURRICULUM.map((domain) => {
            const dd = domain.topics.filter((t) => masteredByTopic[t.id]).length;
            const chat = sectionChatSummary[domain.id] || { correct: 0, needsWork: 0 };
            const isExp = exp[domain.id];
            return (
              <div key={domain.id}>
                <div
                  onClick={() => onToggleExp(domain.id)}
                  style={{
                    padding: '14px 14px',
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
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: domain.color,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span style={{ marginRight: '6px' }}>{iconForDomain[domain.id] ?? '📚'}</span>
                      {domain.label}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: C.muted,
                        marginTop: '4px',
                        lineHeight: 1.45,
                      }}
                    >
                      {domain.title}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: C.dim, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '2px 7px' }}>
                        {dd}/{domain.topics.length} done
                      </span>
                      <span style={{ fontSize: '11px', color: C.dim, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '2px 7px' }}>
                        right {chat.correct}
                      </span>
                      <span style={{ fontSize: '11px', color: C.dim, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '999px', padding: '2px 7px' }}>
                        review {chat.needsWork}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: domain.color, opacity: 0.8, flexShrink: 0 }}>
                    {dd}/{domain.topics.length}
                  </span>
                  <span
                    style={{
                      color: C.dim,
                      fontSize: '12px',
                      transform: isExp ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    ▶
                  </span>
                </div>
                {isExp &&
                  domain.topics.map((topic) => {
                    const isDone = masteredByTopic[topic.id];
                    const isUnlocked = unlockedByTopic[topic.id];
                    const isActive = sel?.topic.id === topic.id;
                    return (
                      <div
                        key={topic.id}
                        onClick={() => {
                          if (!isUnlocked) return;
                          onSelectTopic(topic, domain);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px 10px 20px',
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          background: isActive ? C.card : 'transparent',
                          borderBottom: `1px solid ${C.bg}`,
                          transition: 'background 0.15s',
                          opacity: isUnlocked ? 1 : 0.55,
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '3px',
                            border: `1px solid ${isDone ? domain.color : C.ghost}`,
                            background: isDone ? domain.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'default',
                          }}
                        >
                          {isDone && (
                            <span style={{ color: C.card, fontSize: '12px', fontWeight: 'bold', lineHeight: 1 }}>
                              ✓
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            fontSize: '15px',
                            color: isActive ? C.text : C.muted,
                            lineHeight: 1.45,
                          }}
                        >
                          {topic.title}
                        </div>
                        <span style={{ fontSize: '12px', color: C.dim, flexShrink: 0 }}>{isUnlocked ? topic.code : '🔒'}</span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ display: 'grid', gap: '8px', padding: '10px 8px' }}>
          <button
            onClick={() => onViewChange('overview')}
            style={{ border: `1px solid ${C.border}`, background: C.card, color: C.dim, borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}
            title="Overview"
          >
            OVR
          </button>
          <button
            onClick={() => onViewChange('topics')}
            style={{ border: `1px solid ${C.border}`, background: C.card, color: C.dim, borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}
            title="Topics"
          >
            TOP
          </button>
          <button
            onClick={() => onViewChange('daily')}
            style={{ border: `1px solid ${C.border}`, background: C.card, color: C.dim, borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}
            title="Daily Test"
          >
            DAY
          </button>
          <button
            onClick={() => onViewChange('mock')}
            style={{ border: `1px solid ${C.border}`, background: C.card, color: C.dim, borderRadius: '8px', padding: '8px 4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit' }}
            title="Mock Exam"
          >
            MCK
          </button>
        </div>
      )}
    </div>
  );
}
