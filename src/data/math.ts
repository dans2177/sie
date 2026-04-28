import { C } from './colors';
import type { MathFormula } from '../types';

export const MATH: MathFormula[] = [
  {
    id: 'm1',
    title: 'Current Yield',
    color: C.d1,
    formula: 'Current Yield = Annual Coupon ÷ Current Market Price',
    parts: [
      { label: 'Annual Coupon', desc: 'Face value × coupon rate (e.g. $1,000 × 8% = $80/yr)' },
      { label: 'Market Price', desc: 'What the bond trades at today — not par value' },
    ],
    example: { q: 'Bond: $1,000 par, 8% coupon, trading at $900', a: '$80 ÷ $900 = 8.89%' },
    rule: 'Discount bond (price < par) → Current Yield > Coupon Rate. Premium bond → Current Yield < Coupon Rate.',
  },
  {
    id: 'm2',
    title: 'Approximate Yield to Maturity (YTM)',
    color: C.d2,
    formula: 'YTM ≈ [Annual Interest + (Par − Price) / Years] ÷ [(Par + Price) / 2]',
    parts: [
      { label: 'Annual Interest', desc: 'Par × coupon rate' },
      { label: '(Par − Price)/Years', desc: 'Annual capital gain (discount) or loss (premium)' },
      { label: '(Par + Price)/2', desc: 'Average of face value and current price' },
    ],
    example: { q: '$1,000 par, 8% coupon, price $900, 10 years', a: '[$80 + $10] ÷ [$950] = $90 ÷ $950 = 9.47%' },
    rule: 'Discount bond: YTM > Current Yield > Coupon Rate. Premium bond: Coupon Rate > Current Yield > YTM.',
  },
  {
    id: 'm3',
    title: 'Net Asset Value (NAV) per Share',
    color: C.d3,
    formula: 'NAV = (Total Assets − Total Liabilities) ÷ Shares Outstanding',
    parts: [
      { label: 'Total Assets', desc: 'Market value of all securities in the fund' },
      { label: 'Total Liabilities', desc: 'Accrued fees and expenses' },
      { label: 'Shares Outstanding', desc: 'Total shares currently held by investors' },
    ],
    example: { q: 'Assets $10M, liabilities $500K, 950,000 shares', a: '($10,000,000 − $500,000) ÷ 950,000 = $10.00 per share' },
    rule: 'Open-end funds price at NAV once daily after market close. Closed-end fund market price may be above (premium) or below (discount) NAV.',
  },
  {
    id: 'm4',
    title: 'Options Breakeven at Expiration',
    color: C.d4,
    formula: 'Long Call Breakeven = Strike Price + Premium Paid\nLong Put Breakeven = Strike Price − Premium Paid',
    parts: [
      { label: 'Strike Price', desc: 'The agreed price to buy (call) or sell (put)' },
      { label: 'Premium', desc: 'Price paid for the option contract (per share)' },
    ],
    example: { q: 'Call: strike $50, premium $3 | Put: strike $50, premium $3', a: 'Call BE = $53 | Put BE = $47' },
    rule: 'Long call profitable when stock > $53. Long put profitable when stock < $47. Short sellers\' breakeven is mirrored.',
  },
  {
    id: 'm5',
    title: 'Margin — Regulation T & Account Equity',
    color: '#f87171',
    formula: 'Reg T Initial Requirement = 50% of Purchase Price\nLong Account Equity = Market Value − Debit Balance\nShort Account Equity = Credit Balance − Market Value',
    parts: [
      { label: 'Reg T', desc: 'Federal Reserve rule — initial margin is 50% of purchase' },
      { label: 'Debit Balance', desc: 'Amount borrowed from the broker-dealer' },
      { label: 'Maintenance Margin', desc: 'FINRA min: 25% long / 30% short. Firms may require more.' },
    ],
    example: { q: 'Buy $10,000 of stock on margin (50% Reg T)', a: 'Customer pays $5,000. Debit = $5,000. Equity = $10,000 − $5,000 = $5,000 (50%)' },
    rule: 'Maintenance call triggered when long equity falls below 25% of market value. Must restore equity or broker can liquidate.',
  },
  {
    id: 'm6',
    title: 'Dividend Yield & P/E Ratio',
    color: '#34d399',
    formula: 'Dividend Yield = Annual Dividend per Share ÷ Market Price\nP/E Ratio = Market Price per Share ÷ EPS',
    parts: [
      { label: 'Annual Dividend', desc: 'Total dividends paid per share over one year' },
      { label: 'EPS', desc: 'Earnings per share — net income ÷ shares outstanding' },
    ],
    example: { q: 'Stock price $40, annual dividend $2.00, EPS $4.00', a: 'Dividend Yield = $2 / $40 = 5% | P/E = $40 / $4 = 10×' },
    rule: 'Higher P/E = market expects higher future growth. Dividend yield and stock price move in opposite directions.',
  },
];
