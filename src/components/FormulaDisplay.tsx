import { BlockMath } from 'react-katex';

const LATEX_BY_TITLE: Record<string, string> = {
  'Current Yield': '\\text{Current Yield} = \\frac{\\text{Annual Coupon}}{\\text{Current Market Price}}',
  'Approximate Yield to Maturity (YTM)': '\\text{YTM} \\approx \\frac{\\text{Annual Interest}+\\frac{(\\text{Par}-\\text{Price})}{\\text{Years}}}{\\frac{(\\text{Par}+\\text{Price})}{2}}',
  'Net Asset Value (NAV) per Share': '\\text{NAV} = \\frac{\\text{Total Assets}-\\text{Total Liabilities}}{\\text{Shares Outstanding}}',
  'Options Breakeven at Expiration': '\\text{Call BE}=\\text{Strike}+\\text{Premium}\\quad\\text{Put BE}=\\text{Strike}-\\text{Premium}',
  'Margin — Regulation T & Account Equity': '\\text{Reg T Initial}=50\\%\\quad\\text{Long Equity}=MV-Debit\\quad\\text{Short Equity}=Credit-MV',
  'Dividend Yield & P/E Ratio': '\\text{Dividend Yield}=\\frac{Dividend}{Price}\\quad\\text{P/E}=\\frac{Price}{EPS}',
  'Yield to Maturity (YTM)': '\\text{YTM} \\approx \\frac{\\text{Annual Interest}+\\frac{(\\text{Par}-\\text{Price})}{\\text{Years}}}{\\frac{(\\text{Par}+\\text{Price})}{2}}',
  'Net Asset Value (NAV)': '\\text{NAV} = \\frac{\\text{Total Assets}-\\text{Total Liabilities}}{\\text{Shares Outstanding}}',
  'Options Breakeven': '\\text{Call BE}=\\text{Strike}+\\text{Premium}\\quad\\text{Put BE}=\\text{Strike}-\\text{Premium}',
};

export default function FormulaDisplay({ title, fallback, color }: { title: string; fallback: string; color: string }) {
  const latex = LATEX_BY_TITLE[title];

  if (!latex) {
    return (
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '16px',
          color,
          background: `${color}12`,
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '12px',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      style={{
        background: `${color}12`,
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '12px',
        color,
        overflowX: 'auto',
      }}
    >
      <BlockMath math={latex} />
    </div>
  );
}
