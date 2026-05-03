import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { C, applyTheme } from './data/colors';
import { CURRICULUM, TOTAL } from './data/curriculum';
import { callClaude } from './lib/api';
import {
  clearActiveProfile,
  loadActiveProfile,
  loadDone,
  loadTourHidden,
  loadTopicChat,
  saveActiveProfile,
  saveDone,
  saveTourHidden,
  saveTopicChat,
} from './lib/storage';
import { pickVoice, cleanSpeech } from './lib/tts';
import {
  loadMemorySummary,
  loadLastTopic,
  loadProgress,
  loadTopicChatRemote,
  logEvent,
  saveChatMemory,
  saveLastTopic,
  saveTopicChatRemote,
  syncProgress,
} from './lib/server';
import { countCorrectAnswers, extractCorrectAnswerLabel, parseAssistantOutcome, upsertAssistantMessage } from './lib/chatHelpers';
import type { ChatMessage, Domain, MemorySummary, SelectedTopic, Topic, View } from './types/index';
import AccessGate from './components/AccessGate';
import AppHeader from './components/AppHeader';
import OverlayModal from './components/OverlayModal';
import Sidebar from './components/Sidebar';
import { useIsMobile } from './lib/useIsMobile';
import WalkthroughContent from './components/WalkthroughContent';
import { clearObjectives, reviewObjective } from './lib/spacedRepetition';

const ChatView = lazy(() => import('./components/ChatView'));
const MathDrillView = lazy(() => import('./components/MathDrillView'));
const MathSheet = lazy(() => import('./components/MathSheet'));
const CheatSheet = lazy(() => import('./components/CheatSheet'));
const DailyTestView = lazy(() => import('./components/DailyTestView'));
const OverviewView = lazy(() => import('./components/OverviewView'));
const MockExamView = lazy(() => import('./components/MockExamView'));

type Profile = {
  id: string;
  label: string;
  pin: string;
};

const MASTERY_CORRECT_REQUIRED = 3;

const PROFILES: Profile[] = [
  { id: 'daniel', label: 'Daniel', pin: (import.meta.env.VITE_PIN_DANIEL ?? import.meta.env.VITE_PIN_DAN ?? '').trim() },
  { id: 'dad', label: 'Dad', pin: '2503' },
  { id: 'mom', label: 'Mom', pin: '2504' },
  { id: 'nick', label: 'Nick', pin: (import.meta.env.VITE_PIN_NICK ?? '1443').trim() },
];

export default function App() {
  const [activeProfile, setActiveProfile] = useState<string | null>(() => loadActiveProfile());
  const [done, setDone] = useState<Set<string>>(() => (activeProfile ? loadDone(activeProfile) : new Set()));
  const [modal, setModal] = useState<'math' | 'cheatsheet' | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourDontShowAgain, setTourDontShowAgain] = useState(false);
  const [memory, setMemory] = useState<MemorySummary>({ adaptiveBrief: '', weakTopicIds: [], recentScores: [] });
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const [sel, setSel] = useState<SelectedTopic | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [exp, setExp] = useState<Record<string, boolean>>({ d1: true, d2: false, d3: false, d4: false });
  const [view, setView] = useState<View>('overview');
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches));
  useEffect(() => {
    setSidebarCollapsed((prev) => (isMobile ? true : prev));
  }, [isMobile]);
  const [speakIdx, setSpeakIdx] = useState<number | string | null>(null);
  const [spRate, setSpRate] = useState(1.0);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const streamRunRef = useRef(0);
  const activeTopicIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!activeProfile) {
      setDone(new Set());
      setMemory({ adaptiveBrief: '', weakTopicIds: [], recentScores: [] });
      setLastTopicId(null);
      setShowTour(false);
      setTourDontShowAgain(false);
      return;
    }
    const localDone = loadDone(activeProfile);
    setDone(localDone);

    void (async () => {
      const remoteDone = await loadProgress(activeProfile);
      if (remoteDone && remoteDone.length) {
        const merged = new Set<string>([...localDone, ...remoteDone]);
        setDone(merged);
        saveDone(merged, activeProfile);
      }
      const memorySummary = await loadMemorySummary(activeProfile);
      setMemory(memorySummary);
      const remoteLastTopic = await loadLastTopic(activeProfile);
      setLastTopicId(remoteLastTopic);

      const hidden = loadTourHidden(activeProfile);
      setTourDontShowAgain(hidden);
      setShowTour(!hidden);
    })();
  }, [activeProfile]);

  useEffect(() => {
    applyTheme('light');
    document.documentElement.style.colorScheme = 'light';
    document.body.style.colorScheme = 'light';
    document.body.style.background = C.bg;
    document.body.style.color = C.text;
  }, [activeProfile]);

  useEffect(() => {
    if (!activeProfile) return;
    void syncProgress(activeProfile, [...done]);
  }, [done, activeProfile]);

  useEffect(() => {
    activeTopicIdRef.current = sel?.topic.id ?? null;
  }, [sel]);

  const pct = Math.round((done.size / TOTAL) * 100);

  const log = useCallback(
    (eventType: string, payload: Record<string, unknown> = {}) => {
      if (!activeProfile) return;
      void logEvent(activeProfile, eventType, payload);
    },
    [activeProfile]
  );

  const applyReviewOutcome = useCallback(
    (topicId: string, correct: boolean) => {
      if (!activeProfile) return;
      reviewObjective(activeProfile, topicId, correct ? 'correct' : 'needsWork');
    },
    [activeProfile]
  );

  const markTopicPassed = useCallback(
    (topicId: string, messages: ChatMessage[]) => {
      if (!activeProfile) return;
      const correct = countCorrectAnswers(messages);
      if (correct < MASTERY_CORRECT_REQUIRED) return;

      setDone((prev) => {
        if (prev.has(topicId)) return prev;
        const next = new Set(prev);
        next.add(topicId);
        saveDone(next, activeProfile);
        return next;
      });
      log('topic_auto_passed', { topicId, correct });
    },
    [activeProfile, log]
  );

  const isTopicUnlocked = useCallback(
    (topicId: string) => {
      const ordered = CURRICULUM.flatMap((d) => d.topics.map((t) => t.id));
      const idx = ordered.indexOf(topicId);
      if (idx <= 0) return true;
      const prevId = ordered[idx - 1];
      return done.has(topicId) || done.has(prevId);
    },
    [done]
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
    async (topic: Topic, domain: Domain) => {
      if (!activeProfile) return;
      if (!isTopicUnlocked(topic.id)) {
        log('locked_topic_attempted', { topicId: topic.id });
        return;
      }
      streamRunRef.current += 1;
      const runId = streamRunRef.current;
      const isCurrentRun = () => streamRunRef.current === runId && activeTopicIdRef.current === topic.id;

      window.speechSynthesis.cancel();
      setSpeakIdx(null);
      setSel({ topic, domain });
      setView('chat');
      activeTopicIdRef.current = topic.id;
      setLastTopicId(topic.id);
      void saveLastTopic(activeProfile, topic.id);
      log('topic_opened', { topicId: topic.id, topicCode: topic.code });

      const remote = await loadTopicChatRemote(activeProfile, topic.id);
      if (remote && remote.length > 0) {
        if (isCurrentRun()) setMsgs(remote);
        saveTopicChat(activeProfile, topic.id, remote);
        markTopicPassed(topic.id, remote);
        if (isCurrentRun()) setLoading(false);
        return;
      }

      const cached = loadTopicChat(activeProfile, topic.id);
      if (cached.length > 0) {
        if (isCurrentRun()) setMsgs(cached as ChatMessage[]);
        markTopicPassed(topic.id, cached as ChatMessage[]);
        if (isCurrentRun()) setLoading(false);
        return;
      }

      const init: ChatMessage[] = [
        {
          role: 'user',
          content: `Teach me "${topic.title}" for the SIE exam. Cover the key concepts, then give me a practice multiple-choice question.`,
        },
      ];
      setMsgs(init);
      setLoading(true);
      try {
        if (isCurrentRun()) setMsgs(upsertAssistantMessage(init, ''));
        const r = await callClaude(init, topic, domain, memory.adaptiveBrief, (snapshot) => {
          if (!isCurrentRun()) return;
          setMsgs((prev) => upsertAssistantMessage(prev, snapshot));
        });
        const next = upsertAssistantMessage(init, r);
        if (isCurrentRun()) setMsgs(next);
        saveTopicChat(activeProfile, topic.id, next);
        await saveTopicChatRemote(activeProfile, topic.id, next);
        markTopicPassed(topic.id, next);
        const outcome = parseAssistantOutcome(r);
        if (outcome !== 'neutral') {
          applyReviewOutcome(topic.id, outcome === 'correct');
        }
        await saveChatMemory({
          profileId: activeProfile,
          topicId: topic.id,
          userMessage: init[0].content,
          assistantMessage: r,
        });
        log('topic_bootstrap_generated', { topicId: topic.id });
      } catch (e) {
        const next = [...init, { role: 'assistant' as const, content: `Error: ${(e as Error).message}` }];
        if (isCurrentRun()) setMsgs(next);
        saveTopicChat(activeProfile, topic.id, next);
        await saveTopicChatRemote(activeProfile, topic.id, next);
        log('topic_bootstrap_error', { topicId: topic.id });
      }
      if (isCurrentRun()) setLoading(false);
    },
    [activeProfile, memory.adaptiveBrief, log, markTopicPassed, applyReviewOutcome, isTopicUnlocked]
  );

  const sendWithText = useCallback(
    async (rawText: string, userMeta?: import('./types/index').ChatAnswerMeta) => {
      if (!rawText.trim() || loading || !sel || !activeProfile) return;
      streamRunRef.current += 1;
      const runId = streamRunRef.current;
      const txt = rawText.trim();
      const topicId = sel.topic.id;
      const isCurrentRun = () => streamRunRef.current === runId && activeTopicIdRef.current === topicId;

      const userMsg: ChatMessage = userMeta
        ? { role: 'user', content: txt, meta: userMeta }
        : { role: 'user', content: txt };
      const next: ChatMessage[] = [...msgs, userMsg];
      setMsgs(next);
      saveTopicChat(activeProfile, topicId, next);
      await saveTopicChatRemote(activeProfile, topicId, next);

      setLoading(true);
      log('chat_user_message', { topicId, length: txt.length, hasAnswer: Boolean(userMeta?.userAnswerLabel) });
      try {
        if (isCurrentRun()) setMsgs(upsertAssistantMessage(next, ''));
        const r = await callClaude(next, sel.topic, sel.domain, memory.adaptiveBrief, (snapshot) => {
          if (!isCurrentRun()) return;
          setMsgs((prev) => upsertAssistantMessage(prev, snapshot));
        });
        const outcome = parseAssistantOutcome(r);
        const correctLabel = extractCorrectAnswerLabel(r);
        // Back-fill the user message with isCorrect / correctAnswer when known.
        let full = upsertAssistantMessage(next, r);
        if (userMeta?.userAnswerLabel) {
          const fixedUserMeta: import('./types/index').ChatAnswerMeta = {
            ...userMeta,
            outcome,
            isCorrect: outcome === 'correct'
              ? true
              : outcome === 'needsWork'
                ? false
                : (correctLabel ? correctLabel === userMeta.userAnswerLabel : userMeta.isCorrect),
            correctAnswerLabel: correctLabel || userMeta.correctAnswerLabel,
            correctAnswerText: correctLabel
              ? userMeta.options?.find((o) => o.label === correctLabel)?.text
              : userMeta.correctAnswerText,
          };
          // Replace the user message in `full` (it sits before the trailing assistant message).
          full = full.map((m, idx) => (idx === full.length - 2 ? { ...m, meta: fixedUserMeta } : m));
        }
        if (isCurrentRun()) setMsgs(full);
        saveTopicChat(activeProfile, topicId, full);
        await saveTopicChatRemote(activeProfile, topicId, full);
        markTopicPassed(topicId, full);
        if (outcome !== 'neutral') {
          applyReviewOutcome(topicId, outcome === 'correct');
        }
        await saveChatMemory({
          profileId: activeProfile,
          topicId,
          userMessage: txt,
          assistantMessage: r,
        });
        log('chat_assistant_message', { topicId, length: r.length, outcome });
      } catch (e) {
        const full = [...next, { role: 'assistant' as const, content: `Error: ${(e as Error).message}` }];
        if (isCurrentRun()) setMsgs(full);
        saveTopicChat(activeProfile, topicId, full);
        await saveTopicChatRemote(activeProfile, topicId, full);
        log('chat_assistant_error', { topicId });
      }
      if (isCurrentRun()) setLoading(false);
    },
    [loading, sel, msgs, activeProfile, memory.adaptiveBrief, log, markTopicPassed, applyReviewOutcome]
  );

  const send = useCallback(async () => {
    if (!inp.trim()) return;
    const txt = inp.trim();
    setInp('');
    await sendWithText(txt);
  }, [inp, sendWithText]);

  const sendQuickAnswer = useCallback(async (
    pick: import('./types/index').McqOption,
    all: import('./types/index').McqOption[],
    questionPrompt?: string,
  ) => {
    const text = `My answer is ${pick.label}. ${pick.text}`;
    await sendWithText(text, {
      questionPrompt,
      options: all,
      userAnswerLabel: pick.label,
      userAnswerText: pick.text,
    });
  }, [sendWithText]);

  const findTopicById = useCallback((topicId: string) => {
    for (const domain of CURRICULUM) {
      const topic = domain.topics.find((t) => t.id === topicId);
      if (topic) return { topic, domain };
    }
    return null;
  }, []);

  const openSectionFromOverview = useCallback((sectionId: string) => {
    setModal(null);
    setView('topics');
    setSel(null);
    setMsgs([]);
    setExp((prev) => ({ ...prev, [sectionId]: true }));
  }, []);

  const resetSectionMastery = useCallback(
    async (sectionId: string) => {
      if (!activeProfile) return;
      const section = CURRICULUM.find((d) => d.id === sectionId);
      if (!section) return;

      const topicIds = new Set(section.topics.map((t) => t.id));
      setDone((prev) => {
        const next = new Set([...prev].filter((id) => !topicIds.has(id)));
        saveDone(next, activeProfile);
        return next;
      });
      clearObjectives(activeProfile, [...topicIds]);
      log('overview_reset_section_mastery_completed', { sectionId, topics: section.topics.length });
    },
    [activeProfile, log]
  );

  const resetAllMastery = useCallback(async () => {
    if (!activeProfile) return;
    const next = new Set<string>();
    setDone(next);
    saveDone(next, activeProfile);
    clearObjectives(activeProfile);
    log('overview_reset_all_mastery_completed', { preservesDailyHistory: true });
  }, [activeProfile, log]);

  const restartSectionQuestions = useCallback(
    async (sectionId: string) => {
      if (!activeProfile) return;
      const section = CURRICULUM.find((d) => d.id === sectionId);
      if (!section) return;

      for (const topic of section.topics) {
        saveTopicChat(activeProfile, topic.id, []);
        await saveTopicChatRemote(activeProfile, topic.id, []);
      }

      if (sel && section.topics.some((t) => t.id === sel.topic.id)) {
        setMsgs([]);
        setSel(null);
      }

      log('overview_restart_section_questions_completed', { sectionId, topics: section.topics.length, preservesDailyHistory: true });
    },
    [activeProfile, sel, log]
  );

  const restartAllQuestions = useCallback(async () => {
    if (!activeProfile) return;
    for (const section of CURRICULUM) {
      for (const topic of section.topics) {
        saveTopicChat(activeProfile, topic.id, []);
        await saveTopicChatRemote(activeProfile, topic.id, []);
      }
    }
    setMsgs([]);
    setSel(null);
    log('overview_restart_all_questions_completed', { preservesDailyHistory: true });
  }, [activeProfile, log]);

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
          fontFamily: "'Poppins','Segoe UI',sans-serif",
        }}
      >
        Loading...
      </div>
    );

  if (!activeProfile) {
    return (
      <AccessGate
        profiles={PROFILES}
        onUnlock={(profileId) => {
          saveActiveProfile(profileId);
          setActiveProfile(profileId);
          void logEvent(profileId, 'profile_unlocked', {});
          setView('overview');
          setSel(null);
          setMsgs([]);
          setInp('');
        }}
      />
    );
  }

  const isTopicView = view === 'topics' || view === 'chat';
  const profileLabel = (PROFILES.find((p) => p.id === activeProfile)?.label ?? activeProfile).toUpperCase();
  const viewFallback = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, background: C.bg }}>
      Loading...
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100vh',
        fontFamily: "'Poppins','Segoe UI',sans-serif",
        background: C.bg,
        color: C.text,
        fontSize: '16px',
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}html,body{overscroll-behavior-y:contain}`}</style>
      <AppHeader
        pct={pct}
        profileLabel={profileLabel}
        showMenuButton={isMobile && isTopicView}
        onMenuClick={() => setSidebarCollapsed((v) => !v)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {view === 'overview' && (
          <Suspense fallback={viewFallback}>
            <OverviewView
              profileId={activeProfile}
              profileLabel={profileLabel}
              familyProfiles={PROFILES.map((p) => ({ id: p.id, label: p.label }))}
              done={done}
              onOpenSection={openSectionFromOverview}
              onResetSection={resetSectionMastery}
              onResetAll={resetAllMastery}
              onRestartSectionQuestions={restartSectionQuestions}
              onRestartAllQuestions={restartAllQuestions}
              onOpenMathDrills={() => setView('math-drills')}
              onLog={log}
            />
          </Suspense>
        )}
        {view === 'math-drills' && (
          <Suspense fallback={viewFallback}>
            <MathDrillView
              profileId={activeProfile}
              onLog={log}
              onBack={() => setView('overview')}
              onOpenFormulaSheet={() => {
                setModal('math');
                log('modal_opened', { modal: 'math', source: 'math_drills' });
              }}
              onOpenCheatSheet={() => {
                setModal('cheatsheet');
                log('modal_opened', { modal: 'cheatsheet', source: 'math_drills' });
              }}
            />
          </Suspense>
        )}
        {view === 'daily' && (
          <Suspense fallback={viewFallback}>
            <DailyTestView
              profileId={activeProfile}
              memory={memory}
              onLog={log}
              onSaved={() => {
                void loadMemorySummary(activeProfile).then(setMemory);
              }}
              onOutcome={applyReviewOutcome}
            />
          </Suspense>
        )}
        {view === 'mock' && (
          <Suspense fallback={viewFallback}>
            <MockExamView
              profileId={activeProfile}
              memory={memory}
              onLog={log}
              onOutcome={applyReviewOutcome}
            />
          </Suspense>
        )}
        {isTopicView && (
          <>
            <Sidebar
              profileId={activeProfile}
              done={done}
              sel={sel}
              onSelectTopic={openTopic}
              exp={exp}
              onToggleExp={(id) => setExp((p) => ({ ...p, [id]: !p[id] }))}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
              isMobile={isMobile}
              view={view}
              onViewChange={(next) => {
                if (next === 'math' || next === 'cheatsheet') {
                  setModal(next);
                  log('modal_opened', { modal: next, source: 'sidebar_menu' });
                  return;
                }

                if (next === 'math-drills') {
                  setModal(null);
                  setView(next);
                  log('view_changed', { view: next });
                  return;
                }

                if (next === 'topics' && lastTopicId) {
                  const found = findTopicById(lastTopicId);
                  if (found) {
                    void openTopic(found.topic, found.domain);
                    log('view_changed', { view: 'chat', source: 'resume_last_topic', topicId: lastTopicId });
                    return;
                  }
                }
                setModal(null);
                setView(next);
                log('view_changed', { view: next });
              }}
              profileLabel={profileLabel}
              onOpenTour={() => {
                setShowTour(true);
                log('tour_opened', { source: 'sidebar_menu' });
              }}
              onSwitchProfile={() => {
                log('profile_switch_clicked', {});
                clearActiveProfile();
                setActiveProfile(null);
                setView('overview');
                setSel(null);
                setMsgs([]);
                setInp('');
                setLoading(false);
                setModal(null);
                setLastTopicId(null);
                window.speechSynthesis.cancel();
                setSpeakIdx(null);
              }}
            />
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
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
                    color: C.dim,
                    textAlign: 'center',
                    lineHeight: 2,
                  }}
                >
                  {`Pick one topic on the left\nChat will coach you step-by-step\nProgress unlocks the next topic`}
                </div>
                <button
                  onClick={() => {
                    setModal(null);
                    setView('math-drills');
                    log('view_changed', { view: 'math-drills', source: 'topics_empty_state' });
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${C.amber}`,
                    background: C.amber,
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    letterSpacing: '0.04em',
                  }}
                >
                  ✏️ Open Math XL Drills
                </button>
              </div>
              ) : (
                <Suspense fallback={viewFallback}>
                  <ChatView
                    sel={sel}
                    msgs={msgs}
                    loading={loading}
                    inp={inp}
                    onInpChange={setInp}
                    onSend={send}
                    onQuickAnswer={sendQuickAnswer}
                    speakIdx={speakIdx}
                    onSpeak={speak}
                    spRate={spRate}
                    onSpRateChange={setSpRate}
                    voiceName={voiceName}
                  />
                </Suspense>
              )}
            </div>
          </>
        )}
      </div>
      {modal === 'math' && (
        <OverlayModal
          title="Math Formula Sheet"
          onClose={() => {
            setModal(null);
            log('modal_closed', { modal: 'math' });
          }}
        >
          <Suspense fallback={viewFallback}>
            <MathSheet speakIdx={speakIdx} onSpeak={speak} embedded />
          </Suspense>
        </OverlayModal>
      )}
      {modal === 'cheatsheet' && (
        <OverlayModal
          title="SIE Cheatsheet"
          onClose={() => {
            setModal(null);
            log('modal_closed', { modal: 'cheatsheet' });
          }}
        >
          <Suspense fallback={viewFallback}>
            <CheatSheet embedded />
          </Suspense>
        </OverlayModal>
      )}
      {showTour && (
        <OverlayModal
          title="Welcome Tour"
          onClose={() => {
            setShowTour(false);
            if (activeProfile) saveTourHidden(activeProfile, tourDontShowAgain);
            log('tour_closed', { dontShowAgain: tourDontShowAgain });
          }}
        >
          <WalkthroughContent
            dontShowAgain={tourDontShowAgain}
            onDontShowAgainChange={(value) => {
              setTourDontShowAgain(value);
              if (activeProfile) saveTourHidden(activeProfile, value);
            }}
            onClose={() => {
              setShowTour(false);
              if (activeProfile) saveTourHidden(activeProfile, tourDontShowAgain);
              log('tour_completed', { dontShowAgain: tourDontShowAgain });
            }}
          />
        </OverlayModal>
      )}
    </div>
  );
}
