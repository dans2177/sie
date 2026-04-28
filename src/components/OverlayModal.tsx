import { C } from '../data/colors';

export default function OverlayModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(37, 99, 235, 0.14)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1700px, 98vw)',
          maxHeight: '90vh',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${C.border}`,
            background: C.panel,
          }}
        >
          <div style={{ fontSize: '16px', color: C.text, fontWeight: 'bold', letterSpacing: '0.04em' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.dim,
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
