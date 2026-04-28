import { useState } from 'react';
import { C } from '../data/colors';
import type { AccessProfile } from '../types/index';

export default function AccessGate({ profiles, onUnlock }: { profiles: AccessProfile[]; onUnlock: (profileId: string) => void }) {
  const [selected, setSelected] = useState<string>(profiles[0]?.id ?? 'daniel');
  const [pinInput, setPinInput] = useState('');
  const [err, setErr] = useState('');

  const selectedProfile = profiles.find((p) => p.id === selected) ?? profiles[0];

  const unlock = () => {
    if (!selectedProfile) return;
    if (selectedProfile.pin && pinInput !== selectedProfile.pin) {
      setErr('Wrong PIN. Try again.');
      return;
    }
    setErr('');
    setPinInput('');
    onUnlock(selectedProfile.id);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        color: C.text,
        fontFamily: "'Poppins','Segoe UI',sans-serif",
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ fontSize: '10px', color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Personal Access
        </div>
        <div style={{ fontSize: '17px', color: C.amber, fontWeight: 'bold', marginTop: '5px' }}>Choose Profile</div>
        <div style={{ fontSize: '11px', color: C.dim, marginTop: '4px' }}>No deep login. Just a quick profile check.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setSelected(profile.id);
                setErr('');
                setPinInput('');
              }}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selected === profile.id ? C.amber : C.border,
                background: selected === profile.id ? C.amberBg : C.panel,
                color: selected === profile.id ? C.amber : C.muted,
                fontFamily: 'inherit',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {profile.label}
            </button>
          ))}
        </div>

        {selectedProfile?.pin ? (
          <>
            <div
              style={{
                fontSize: '10px',
                color: C.dim,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '14px',
              }}
            >
              PIN
            </div>
            <input
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (err) setErr('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') unlock();
              }}
              type="password"
              placeholder="Enter PIN"
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '9px 10px',
                background: C.panel,
                border: `1px solid ${err ? '#b91c1c' : C.border}`,
                borderRadius: '6px',
                color: C.text,
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </>
        ) : (
          <div style={{ fontSize: '10px', color: C.dim, marginTop: '14px' }}>
            No PIN set for this profile. Add VITE_PIN_DANIEL (or VITE_PIN_DAN) to enable one.
          </div>
        )}

        {err && <div style={{ marginTop: '10px', fontSize: '11px', color: '#f87171' }}>{err}</div>}

        <button
          onClick={unlock}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: `1px solid ${C.amberDim}`,
            background: C.amber,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
            letterSpacing: '0.08em',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
