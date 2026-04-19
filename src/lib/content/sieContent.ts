import type { Equation, ConceptCard, ToughSpot } from '../../types/index';

// SIE EQUATIONS DATABASE
export const equations: Equation[] = [
  // BONDS & FIXED INCOME
  {
    id: 'bond_price',
    name: 'Bond Pricing Formula',
    category: 'bonds',
    formula: 'P = \\sum_{t=1}^{n} \\frac{C}{(1+y)^t} + \\frac{FV}{(1+y)^n}',
    description: 'Present value of all future coupon payments plus face value',
    variables: [
      { symbol: 'P', meaning: 'Bond Price', units: '$' },
      { symbol: 'C', meaning: 'Coupon Payment', units: '$' },
      { symbol: 'y', meaning: 'Yield to Maturity (periodic)', units: 'decimal' },
      { symbol: 'n', meaning: 'Number of periods' },
      { symbol: 'FV', meaning: 'Face Value', units: '$' },
    ],
    example: {
      values: { C: 50, y: 0.05, n: 20, FV: 1000 },
      solution: 1000,
      explanation: 'At 5% yield, a $1000 bond with $50 semi-annual coupons trades at par',
    },
    commonMistakes: [
      'Forgetting to compound yield to match coupon frequency',
      'Using annual yield when coupons are semi-annual',
      'Mixing up coupon rate and yield to maturity',
    ],
    mnemonicOrTip: 'PV of coupons + PV of face value',
    difficulty: 'basic',
  },
  {
    id: 'current_yield',
    name: 'Current Yield',
    category: 'bonds',
    formula: 'CY = \\frac{C}{P}',
    description: 'Annual coupon payment divided by current market price',
    variables: [
      { symbol: 'CY', meaning: 'Current Yield', units: 'decimal' },
      { symbol: 'C', meaning: 'Annual Coupon Payment', units: '$' },
      { symbol: 'P', meaning: 'Current Bond Price', units: '$' },
    ],
    example: {
      values: { C: 80, P: 950 },
      solution: 0.0842,
      explanation: '$80 coupon / $950 price = 8.42% current yield',
    },
    commonMistakes: [
      'Confusing with yield to maturity',
      'Using face value instead of market price',
      'Forgetting it ignores capital gains/losses',
    ],
    mnemonicOrTip: 'Annual income / Current price',
    difficulty: 'basic',
  },
  {
    id: 'accrued_interest',
    name: 'Accrued Interest',
    category: 'bonds',
    formula: 'AI = C \\times \\frac{d}{D}',
    description: 'Interest earned by seller but not yet paid',
    variables: [
      { symbol: 'AI', meaning: 'Accrued Interest', units: '$' },
      { symbol: 'C', meaning: 'Coupon Payment', units: '$' },
      { symbol: 'd', meaning: 'Days since last coupon', units: 'days' },
      { symbol: 'D', meaning: 'Days in coupon period', units: 'days' },
    ],
    example: {
      values: { C: 50, d: 45, D: 180 },
      solution: 12.5,
      explanation: '$50 × (45/180) = $12.50 accrued interest',
    },
    commonMistakes: [
      'Including accrued interest in quoted (clean) price',
      'Using actual days vs 30/360 day count convention',
      'Forgetting buyer pays seller the accrued interest',
    ],
    mnemonicOrTip: 'Seller gets paid for waiting; buyer pays this at settlement',
    difficulty: 'intermediate',
  },
  {
    id: 'macaulay_duration',
    name: 'Macaulay Duration',
    category: 'bonds',
    formula: 'D_{Mac} = \\frac{\\sum_{t=1}^{n} t \\times PV(CF_t)}{P}',
    description: 'Weighted average time to receive cash flows',
    variables: [
      { symbol: 'D_{Mac}', meaning: 'Macaulay Duration', units: 'years' },
      { symbol: 't', meaning: 'Time period', units: 'years' },
      { symbol: 'PV(CF_t)', meaning: 'Present value of cash flow', units: '$' },
      { symbol: 'P', meaning: 'Bond Price', units: '$' },
    ],
    example: {
      values: {},
      solution: 5.2,
      explanation: 'Average time to recover investment is 5.2 years',
    },
    commonMistakes: [
      'Confusing with modified duration (interest rate sensitivity)',
      'Forgetting to weight by present values',
      'Using nominal time instead of discounted time',
    ],
    mnemonicOrTip: 'Weighted average maturity of cash flows',
    difficulty: 'advanced',
  },
  {
    id: 'modified_duration',
    name: 'Modified Duration',
    category: 'bonds',
    formula: 'D_{Mod} = \\frac{D_{Mac}}{1 + y}',
    description: 'Price sensitivity to interest rate changes',
    variables: [
      { symbol: 'D_{Mod}', meaning: 'Modified Duration' },
      { symbol: 'D_{Mac}', meaning: 'Macaulay Duration', units: 'years' },
      { symbol: 'y', meaning: 'Yield to Maturity (periodic)', units: 'decimal' },
    ],
    example: {
      values: { DMac: 5.2, y: 0.04 },
      solution: 5.0,
      explanation: '5.2 / 1.04 = 5.0 years; 1% yield increase = 5% price decrease',
    },
    commonMistakes: [
      'Using annual yield when duration is in periods',
      'Forgetting the negative relationship with price',
      'Treating it as actual duration',
    ],
    mnemonicOrTip: 'For every 1% yield change, price changes ~Modified Duration %',
    difficulty: 'advanced',
  },

  // TIME VALUE OF MONEY
  {
    id: 'present_value',
    name: 'Present Value',
    category: 'npv_irr',
    formula: 'PV = \\frac{FV}{(1+r)^n}',
    description: 'Value today of a future sum of money',
    variables: [
      { symbol: 'PV', meaning: 'Present Value', units: '$' },
      { symbol: 'FV', meaning: 'Future Value', units: '$' },
      { symbol: 'r', meaning: 'Discount Rate (periodic)', units: 'decimal' },
      { symbol: 'n', meaning: 'Number of periods' },
    ],
    example: {
      values: { FV: 1000, r: 0.08, n: 5 },
      solution: 680.58,
      explanation: '$1000 in 5 years at 8% discount = $680.58 today',
    },
    commonMistakes: [
      'Using annual rate when compounding is more frequent',
      'Confusing discount rate with growth rate',
      'Rounding too early in calculations',
    ],
    mnemonicOrTip: 'Discount the future back to today',
    difficulty: 'basic',
  },
  {
    id: 'future_value',
    name: 'Future Value',
    category: 'npv_irr',
    formula: 'FV = PV \\times (1+r)^n',
    description: 'Value of an investment at a future date',
    variables: [
      { symbol: 'FV', meaning: 'Future Value', units: '$' },
      { symbol: 'PV', meaning: 'Present Value', units: '$' },
      { symbol: 'r', meaning: 'Growth Rate (periodic)', units: 'decimal' },
      { symbol: 'n', meaning: 'Number of periods' },
    ],
    example: {
      values: { PV: 1000, r: 0.08, n: 5 },
      solution: 1469.33,
      explanation: '$1000 invested at 8% for 5 years grows to $1469.33',
    },
    commonMistakes: [
      'Using annual rate for non-annual compounding',
      'Confusing with compound interest calculation',
      'Using simple interest instead of compound',
    ],
    mnemonicOrTip: 'Compound forward into the future',
    difficulty: 'basic',
  },
  {
    id: 'npv',
    name: 'Net Present Value (NPV)',
    category: 'npv_irr',
    formula: 'NPV = \\sum_{t=0}^{n} \\frac{CF_t}{(1+r)^t} - I_0',
    description: 'Present value of all future cash flows minus initial investment',
    variables: [
      { symbol: 'NPV', meaning: 'Net Present Value', units: '$' },
      { symbol: 'CF_t', meaning: 'Cash Flow in period t', units: '$' },
      { symbol: 'r', meaning: 'Discount Rate (WACC)', units: 'decimal' },
      { symbol: 'I_0', meaning: 'Initial Investment', units: '$' },
      { symbol: 'n', meaning: 'Project Life', units: 'periods' },
    ],
    example: {
      values: {},
      solution: 150.5,
      explanation: 'Positive NPV means project creates value',
    },
    commonMistakes: [
      'Using wrong discount rate',
      'Forgetting to subtract initial investment',
      'Mixing nominal and real cash flows',
    ],
    mnemonicOrTip: 'NPV > 0 = Accept project; NPV < 0 = Reject project',
    difficulty: 'intermediate',
  },
  {
    id: 'irr',
    name: 'Internal Rate of Return (IRR)',
    category: 'npv_irr',
    formula: 'NPV = 0 = \\sum_{t=0}^{n} \\frac{CF_t}{(1+IRR)^t}',
    description: 'Discount rate that makes NPV = 0',
    variables: [
      { symbol: 'IRR', meaning: 'Internal Rate of Return', units: '%' },
      { symbol: 'CF_t', meaning: 'Cash Flow in period t', units: '$' },
      { symbol: 'n', meaning: 'Number of periods' },
    ],
    example: {
      values: {},
      solution: 15.24,
      explanation: 'Project returns 15.24% annualized',
    },
    commonMistakes: [
      'Confusing IRR with required return rate',
      'Assuming higher IRR always means better investment',
      'IRR problems with non-conventional cash flows',
      'Not considering size of investment',
    ],
    mnemonicOrTip: 'IRR > Required Return = Accept; IRR < Required Return = Reject',
    difficulty: 'advanced',
  },
  {
    id: 'annuity_pv',
    name: 'Present Value of Ordinary Annuity',
    category: 'npv_irr',
    formula: 'PV = PMT \\times \\frac{1 - (1+r)^{-n}}{r}',
    description: 'Present value of equal periodic payments',
    variables: [
      { symbol: 'PV', meaning: 'Present Value', units: '$' },
      { symbol: 'PMT', meaning: 'Payment per period', units: '$' },
      { symbol: 'r', meaning: 'Interest Rate (periodic)', units: 'decimal' },
      { symbol: 'n', meaning: 'Number of periods' },
    ],
    example: {
      values: { PMT: 1000, r: 0.06, n: 10 },
      solution: 7360.09,
      explanation: '10 annual $1000 payments at 6% = $7360.09 today',
    },
    commonMistakes: [
      'Confusing ordinary annuity with annuity due',
      'Using annual rate for non-annual payments',
      'Wrong formula for annuity due',
    ],
    mnemonicOrTip: 'Ordinary = payments at END of period',
    difficulty: 'intermediate',
  },

  // YIELDS & RETURNS
  {
    id: 'ytm',
    name: 'Yield to Maturity (YTM)',
    category: 'yields',
    formula: 'P = \\sum_{t=1}^{n} \\frac{C}{(1+YTM)^t} + \\frac{FV}{(1+YTM)^n}',
    description: 'Total return if bond held to maturity (must solve iteratively)',
    variables: [
      { symbol: 'YTM', meaning: 'Yield to Maturity', units: 'decimal' },
      { symbol: 'P', meaning: 'Bond Price', units: '$' },
      { symbol: 'C', meaning: 'Coupon Payment', units: '$' },
      { symbol: 'FV', meaning: 'Face Value', units: '$' },
      { symbol: 'n', meaning: 'Periods to maturity' },
    ],
    example: {
      values: { P: 950, C: 50, n: 20, FV: 1000 },
      solution: 0.0544,
      explanation: 'Discounting at 5.44% equals the $950 price',
    },
    commonMistakes: [
      'Confusing YTM with coupon rate',
      'YTM assumes reinvestment at same rate',
      'Not adjusting for semi-annual coupons',
    ],
    mnemonicOrTip: 'The interest rate that makes bond price equation work',
    difficulty: 'advanced',
  },
  {
    id: 'ytc',
    name: 'Yield to Call (YTC)',
    category: 'yields',
    formula: 'P = \\sum_{t=1}^{n} \\frac{C}{(1+YTC)^t} + \\frac{CP}{(1+YTC)^n}',
    description: 'Return if issuer calls bond before maturity',
    variables: [
      { symbol: 'YTC', meaning: 'Yield to Call', units: 'decimal' },
      { symbol: 'P', meaning: 'Bond Price', units: '$' },
      { symbol: 'C', meaning: 'Coupon Payment', units: '$' },
      { symbol: 'CP', meaning: 'Call Price', units: '$' },
      { symbol: 'n', meaning: 'Periods to call date' },
    ],
    example: {
      values: { P: 1050, C: 50, CP: 1000, n: 10 },
      solution: 0.045,
      explanation: 'Callable bond has lower YTC than YTM when trading at premium',
    },
    commonMistakes: [
      'Comparing YTC to YTM without understanding which applies',
      'Forgetting call price is typically 100-102',
      'Assuming bond will be called just because YTC < YTM',
    ],
    mnemonicOrTip: 'YTC < YTM for premium bonds (issuer will call)',
    difficulty: 'intermediate',
  },
  {
    id: 'holding_period_return',
    name: 'Holding Period Return',
    category: 'yields',
    formula: 'HPR = \\frac{P_{end} - P_{begin} + Income}{P_{begin}}',
    description: 'Total return including price change and income',
    variables: [
      { symbol: 'HPR', meaning: 'Holding Period Return', units: 'decimal' },
      { symbol: 'P_{end}', meaning: 'Ending Price', units: '$' },
      { symbol: 'P_{begin}', meaning: 'Beginning Price', units: '$' },
      { symbol: 'Income', meaning: 'Dividends/Interest', units: '$' },
    ],
    example: {
      values: { Pend: 110, Pbegin: 100, Income: 5 },
      solution: 0.15,
      explanation: '($110 - $100 + $5) / $100 = 15% return',
    },
    commonMistakes: [
      'Forgetting to include income',
      'Using average price instead of beginning price',
      'Not annualizing the return',
    ],
    mnemonicOrTip: 'What you made / What you invested',
    difficulty: 'basic',
  },

  // OPTIONS
  {
    id: 'intrinsic_value',
    name: 'Option Intrinsic Value',
    category: 'options',
    formula: 'Call: IV = max(S - K, 0) \\text{ | } Put: IV = max(K - S, 0)',
    description: 'Value if exercised immediately',
    variables: [
      { symbol: 'IV', meaning: 'Intrinsic Value', units: '$' },
      { symbol: 'S', meaning: 'Stock Price', units: '$' },
      { symbol: 'K', meaning: 'Strike Price', units: '$' },
    ],
    example: {
      values: { S: 55, K: 50 },
      solution: 5,
      explanation: 'Call intrinsic = max($55 - $50, 0) = $5',
    },
    commonMistakes: [
      'Forgetting it can never be negative',
      'Confusing call and put formulas',
      'Thinking intrinsic = total value',
    ],
    mnemonicOrTip: 'Call: Stock - Strike; Put: Strike - Stock; minimum 0',
    difficulty: 'basic',
  },
  {
    id: 'time_value',
    name: 'Option Time Value',
    category: 'options',
    formula: 'Time Value = Premium - Intrinsic Value',
    description: 'Value from possibility of favorable price movement',
    variables: [
      { symbol: 'TV', meaning: 'Time Value', units: '$' },
      { symbol: 'Premium', meaning: 'Option Price', units: '$' },
      { symbol: 'IV', meaning: 'Intrinsic Value', units: '$' },
    ],
    example: {
      values: { Premium: 8, IV: 5 },
      solution: 3,
      explanation: '$8 premium - $5 intrinsic = $3 time value',
    },
    commonMistakes: [
      'Forgetting time value decreases as expiration approaches',
      'Confusing with extrinsic value (synonym)',
      'Thinking ITM options have no time value',
    ],
    mnemonicOrTip: 'Time value = what you pay for possibility',
    difficulty: 'intermediate',
  },
  {
    id: 'put_call_parity',
    name: 'Put-Call Parity',
    category: 'options',
    formula: 'C + K e^{-rT} = P + S',
    description: 'Relationship between call and put prices',
    variables: [
      { symbol: 'C', meaning: 'Call Price', units: '$' },
      { symbol: 'P', meaning: 'Put Price', units: '$' },
      { symbol: 'S', meaning: 'Stock Price', units: '$' },
      { symbol: 'K', meaning: 'Strike Price', units: '$' },
      { symbol: 'r', meaning: 'Risk-free Rate', units: 'decimal' },
      { symbol: 'T', meaning: 'Time to Expiration', units: 'years' },
    ],
    example: {
      values: { C: 5, K: 100, r: 0.05, T: 1, S: 100, P: 3.88 },
      solution: 103.88,
      explanation: 'If parity violated, arbitrage opportunity exists',
    },
    commonMistakes: [
      'Ignoring the interest rate component',
      'Assuming call and put have equal prices',
      'Not accounting for dividends',
    ],
    mnemonicOrTip: 'Call + PV(Strike) = Put + Stock',
    difficulty: 'advanced',
  },
];

// REGULATORY & COMPLIANCE CONCEPTS
export const concepts: ConceptCard[] = [
  {
    id: 'sec_overview',
    title: 'SEC Regulation Overview',
    category: 'regulations',
    content: `The Securities and Exchange Commission (SEC) enforces federal securities laws.
    Key acts: Securities Act of 1933 (new offerings), Securities Exchange Act of 1934 (trading), FINRA rules.
    SIE candidates must understand primary and secondary market regulations.`,
    difficulty: 'basic',
    relatedConcepts: ['disclosure_requirements', 'insider_trading'],
    keyPoints: [
      'SEC has enforcement authority',
      'FINRA enforces self-regulatory rules',
      'Securities Act of 1933 = new issues',
      'Exchange Act of 1934 = trading markets',
    ],
    commonMistakes: [
      'Confusing SEC with FINRA jurisdiction',
      'Mixing up 1933 and 1934 Acts',
      'Forgetting states also regulate securities',
    ],
  },
  {
    id: 'insider_trading',
    title: 'Insider Trading Rules',
    category: 'regulations',
    content: `Insiders cannot trade on material nonpublic information.
    Officers, directors, large shareholders, and anyone with inside info are restricted.
    Rule 10b-5 prohibits fraudulent trading; Rule 16 requires officer/director reporting.
    Penalties include disgorgement of profits, fines, and prison time.`,
    difficulty: 'intermediate',
    relatedConcepts: ['sec_overview', 'disclosure_requirements'],
    keyPoints: [
      'Material nonpublic information = prohibited trading basis',
      'Insiders = officers, directors, 10% shareholders',
      'Tipping others with inside info is also illegal',
      'Lock-up periods restrict sales after IPOs',
    ],
    commonMistakes: [
      'Thinking only officers are insiders',
      'Forgetting indirect trading (through family) is also restricted',
      'Misunderstanding what constitutes "material" information',
    ],
  },
  {
    id: 'fiduciary_duty',
    title: 'Fiduciary Duties',
    category: 'ethics',
    content: `Registered reps must act in clients' best interests.
    Duty of loyalty = no conflicts of interest; Duty of care = informed decisions.
    Must disclose conflicts and avoid self-dealing.
    Suitability rule = recommendations must match client profile.`,
    difficulty: 'intermediate',
    relatedConcepts: ['suitability_rule', 'disclosure_requirements'],
    keyPoints: [
      'Client interests come first',
      'Disclose all conflicts of interest',
      'Avoid self-dealing transactions',
      'Document suitability analysis',
    ],
    commonMistakes: [
      'Prioritizing commissions over client benefit',
      'Not understanding fiduciary vs. suitability standard',
      'Forgetting to document recommendations',
    ],
  },
  {
    id: 'suitability_rule',
    title: 'Suitability Rule',
    category: 'regulations',
    content: `Recommendations must be suitable for client based on:
    Financial situation, Investment objectives, Risk tolerance, Time horizon.
    Customer profile must be established and updated; documentation required.
    More stringent than basic suitability: best execution, reasonable charges.`,
    difficulty: 'basic',
    relatedConcepts: ['fiduciary_duty', 'customer_profiles'],
    keyPoints: [
      'Establish customer profile (age, income, goals)',
      'Match recommendations to profile',
      'Update profile periodically',
      'Document the suitability analysis',
    ],
    commonMistakes: [
      'Recommending unsuitable products for commissions',
      'Not updating customer profiles',
      'Assuming all clients have same risk tolerance',
    ],
  },
  {
    id: 'aml_kyc',
    title: 'AML & KYC Rules (Anti-Money Laundering)',
    category: 'regulations',
    content: `Know Your Customer (KYC) = identify clients and understand sources of funds.
    Anti-Money Laundering (AML) = monitor for suspicious activity.
    Firms must file SARs (Suspicious Activity Reports) for transactions >$10k or suspicious.
    Sanctions screening required; record retention for 5+ years.`,
    difficulty: 'intermediate',
    relatedConcepts: ['compliance_requirements', 'sec_overview'],
    keyPoints: [
      'KYC = identify clients, verify identity, understand sources of funds',
      'AML = monitor for suspicious transactions',
      'SAR = Suspicious Activity Report (file if >$10k or suspicious)',
      'CTR = Currency Transaction Report (file if >$10k cash)',
    ],
    commonMistakes: [
      'Not understanding difference between KYC and AML',
      'Forgetting sanctions screening',
      'Not reporting suspicious activity promptly',
    ],
  },
  {
    id: 'advertising_rules',
    title: 'Advertising & Communication Rules',
    category: 'regulations',
    content: `Firms must ensure advertisements are fair, accurate, not misleading.
    Past performance cannot be misleading; must include disclaimers.
    Testimonials must be typical and representative of experience.
    Must maintain written records of all communications.
    Sales literature subject to pre-approval in many cases.`,
    difficulty: 'intermediate',
    relatedConcepts: ['disclosure_requirements', 'compliance_requirements'],
    keyPoints: [
      'Advertisement must be fair and not misleading',
      'Past performance disclaimers required',
      'Testimonials must be representative',
      'Keep 3-year communication records',
    ],
    commonMistakes: [
      'Using testimonials that misrepresent typical results',
      'Implying guaranteed returns',
      'Not keeping communication records',
    ],
  },
];

// TOUGH SPOTS (Common Misconceptions)
export const toughSpots: ToughSpot[] = [
  {
    id: 'ts_ytm_vs_coupon',
    title: 'YTM vs Coupon Rate Confusion',
    problem: 'Many confuse yield to maturity (YTM) with the coupon rate',
    explanation: `Coupon rate = fixed percentage of face value paid annually.
    YTM = total return if held to maturity (depends on purchase price).
    Premium bond (price > par): YTM < coupon rate
    Discount bond (price < par): YTM > coupon rate
    Par bond (price = par): YTM = coupon rate`,
    relatedEquations: ['ytm', 'current_yield', 'bond_price'],
    relatedConcepts: ['sec_overview'],
    frequency: 'very common',
  },
  {
    id: 'ts_duration_sensitivity',
    title: 'Duration = Time to Maturity Misunderstanding',
    problem: 'Thinking duration is just how long until maturity',
    explanation: `Duration is weighted average time to receive cash flows.
    ALWAYS less than time to maturity (unless zero-coupon bond).
    Modified duration tells you price sensitivity: -ModDuration % per 1% yield change.
    Higher coupon = lower duration (get cash sooner).
    Longer maturity = higher duration (more exposure to rates).`,
    relatedEquations: ['macaulay_duration', 'modified_duration'],
    relatedConcepts: ['sec_overview'],
    frequency: 'very common',
  },
  {
    id: 'ts_irr_pitfall',
    title: 'IRR Assumes Reinvestment at IRR Rate',
    problem: 'Overlooking reinvestment rate assumption in IRR',
    explanation: `IRR assumes all cash flows reinvested at the IRR rate.
    In reality, you might reinvest at different rates.
    With significantly different cash flows, IRR can be misleading.
    Multiple IRRs possible with non-conventional cash flows.
    NPV is more reliable for investment decisions.`,
    relatedEquations: ['irr', 'npv'],
    relatedConcepts: ['sec_overview'],
    frequency: 'common',
  },
  {
    id: 'ts_call_vs_put',
    title: 'Call vs Put Option Mechanics',
    problem: 'Mixing up when calls and puts are profitable',
    explanation: `CALL = right to BUY. Profitable if stock price RISES above strike.
    PUT = right to SELL. Profitable if stock price FALLS below strike.
    Call buyer pays premium upfront; unlimited profit potential.
    Put buyer pays premium upfront; profit limited to strike minus premium.
    Seller of call has unlimited loss risk; seller of put has strike price risk.`,
    relatedEquations: ['intrinsic_value', 'time_value'],
    relatedConcepts: ['sec_overview'],
    frequency: 'very common',
  },
  {
    id: 'ts_fiduciary_vs_suitability',
    title: 'Fiduciary Duty vs Suitability Standard',
    problem: 'Not understanding the difference in obligations',
    explanation: `SUITABILITY = recommendation must match client profile (minimum standard).
    FIDUCIARY = must act in client's best interest (higher standard).
    Registered reps = suitability standard under FINRA rules.
    Investment advisers = fiduciary standard under Investment Advisers Act.
    Suitability less strict; fiduciary requires best execution, lowest fees possible.`,
    relatedEquations: [],
    relatedConcepts: ['fiduciary_duty', 'suitability_rule'],
    frequency: 'common',
  },
  {
    id: 'ts_insider_trading_scope',
    title: 'Who Qualifies as an Insider?',
    problem: 'Thinking only executives are restricted',
    explanation: `Insiders = officers, directors, 10%+ shareholders, and ANYONE with material nonpublic info.
    Includes consultants, lawyers, accountants, family members.
    TIPPING (giving inside info to others) is also illegal.
    Don't need to trade yourself; tipping violates the law.
    Must disclose when filing trades (Form 4); lock-up periods restrict sales.`,
    relatedEquations: [],
    relatedConcepts: ['insider_trading', 'sec_overview'],
    frequency: 'common',
  },
];

export function searchContent(query: string, category?: string) {
  const lowerQuery = query.toLowerCase();
  const filtered = {
    equations: equations.filter(
      (eq) =>
        (eq.name.toLowerCase().includes(lowerQuery) ||
          eq.description.toLowerCase().includes(lowerQuery)) &&
        (!category || eq.category === category),
    ),
    concepts: concepts.filter(
      (c) =>
        (c.title.toLowerCase().includes(lowerQuery) ||
          c.content.toLowerCase().includes(lowerQuery)) &&
        (!category || c.category === category),
    ),
    toughSpots: toughSpots.filter(
      (ts) =>
        ts.title.toLowerCase().includes(lowerQuery) ||
        ts.problem.toLowerCase().includes(lowerQuery) ||
        ts.explanation.toLowerCase().includes(lowerQuery),
    ),
  };
  return filtered;
}
