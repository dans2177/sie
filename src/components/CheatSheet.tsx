import { useState } from 'react';
import { C } from '../data/colors';
import { CHEATSHEET } from '../data/cheatsheet';
import FormulaDisplay from './FormulaDisplay';

export default function CheatSheet({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState('');
  const filtered = CHEATSHEET.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.title, item.category, item.content, ...(item.rules || [])].join(' ').toLowerCase().includes(q);
  });

  const byCategory = filtered.reduce<Record<string, typeof CHEATSHEET>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: embedded ? C.card : C.bg,
        padding: 'clamp(12px, 4vw, 20px)',
      }}
    >
      <div style={{ maxWidth: '1460px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: C.amber,
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            SIE QUICK REFERENCE CHEATSHEET
          </div>
          <div style={{ fontSize: '15px', color: C.dim }}>
            Essential formulas, rules, and definitions for SIE exam mastery
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formulas, rules, and topics..."
            style={{
              marginTop: '14px',
              width: '100%',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              color: C.text,
              padding: '10px 12px',
              fontSize: '15px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '28px' }}>
            <div
              style={{
                fontSize: '13px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.amber,
                marginBottom: '10px',
              }}
            >
              {category}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                gap: '16px',
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: '12px',
                    padding: '18px',
                    borderLeft: `4px solid ${item.color}`,
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: C.text, marginBottom: '10px' }}>{item.title}</div>
                  <FormulaDisplay title={item.title} fallback={item.content} color={item.color} />
                  {item.rules && item.rules.length > 0 && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
                      {item.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '14px',
                            color: C.muted,
                            marginBottom: '7px',
                            paddingLeft: '10px',
                            borderLeft: `2px solid ${item.color}66`,
                            lineHeight: 1.55,
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
        ))}
      </div>
    </div>
  );
}
