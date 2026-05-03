import { BlockMath } from 'react-katex';

const LATEX_BY_TITLE: Record<string, string> = {
  'Current Yield': 'CY = AnnualCoupon / MarketPrice',
  'Approximate Yield to Maturity (YTM)': 'YTM = (AnnualInterest + (Par-Price)/Years) / ((Par+Price)/2)',
  'Net Asset Value (NAV) per Share': 'NAV = (TotalAssets - TotalLiabilities) / SharesOutstanding',
  'Options Breakeven at Expiration': 'CallBE = Strike + Premium, PutBE = Strike - Premium',
  'Margin — Regulation T & Account Equity': 'RegTInitial = 50%, LongEquity = MV - Debit, ShortEquity = Credit - MV',
  'Dividend Yield & P/E Ratio': 'DividendYield = Dividend/Price, PE = Price/EPS',
  'Yield to Maturity (YTM)': 'YTM = (AnnualInterest + (Par-Price)/Years) / ((Par+Price)/2)',
  'Net Asset Value (NAV)': 'NAV = (TotalAssets - TotalLiabilities) / SharesOutstanding',
  'Options Breakeven': 'CallBE = Strike + Premium, PutBE = Strike - Premium',
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
      className="formula-math-block"
      style={{
        background: `${color}12`,
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '12px',
        color,
        overflowX: 'auto',
      }}
    >
      <style>{`.formula-math-block .katex-display{margin:0;text-align:left}.formula-math-block .katex-display>.katex{text-align:left}`}</style>
      <BlockMath math={latex} />
    </div>
  );
}
