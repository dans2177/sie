import { C } from '../data/colors';

export default function AppHeader({
  pct,
  profileLabel,
  showMenuButton = false,
  onMenuClick,
}: {
  pct: number;
  profileLabel: string;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: 'clamp(8px, 2vw, 12px) clamp(10px, 3vw, 18px)',
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
        gap: 'clamp(8px, 2vw, 12px)',
        flexShrink: 0,
      }}
    >
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          aria-label="Toggle menu"
          style={{
            border: `1px solid ${C.border}`,
            background: C.card,
            color: C.text,
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          ☰
        </button>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 'clamp(12px, 3.2vw, 14px)',
            fontWeight: 'bold',
            color: C.amber,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          SIE STUDY SYSTEM
        </div>
        <div
          style={{
            fontSize: 'clamp(9px, 2.4vw, 11px)',
            color: C.dim,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Locked progression mode
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: '32px',
          height: '4px',
          background: C.border,
          borderRadius: '2px',
          overflow: 'hidden',
          margin: '0 clamp(6px, 2vw, 12px)',
        }}
      >
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
      <div style={{ fontSize: '11px', color: C.amber, minWidth: '36px', textAlign: 'right' }}>{pct}%</div>
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
          maxWidth: '40vw',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {profileLabel}
      </div>
    </div>
  );
}
