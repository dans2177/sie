import { C } from '../data/colors';

export default function AppHeader({
  pct,
  profileLabel,
}: {
  pct: number;
  profileLabel: string;
}) {
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
        <div style={{ fontSize: '10px', color: C.dim }}>
          Locked progression mode
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
      <div
        style={{
          padding: '5px 8px',
          borderRadius: '6px',
          border: `1px solid ${C.border}`,
          background: C.card,
          color: C.dim,
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {profileLabel}
      </div>
    </div>
  );
}
