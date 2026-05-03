export interface MathFormula {
  id: string;
  title: string;
  color: string;
  formula: string;
  parts: { label: string; desc: string }[];
  example: { q: string; a: string };
  rule: string;
}
