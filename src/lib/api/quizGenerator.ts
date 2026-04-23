import { sendMessage } from './claudeClient';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: 'basic' | 'intermediate' | 'advanced',
  count: number = 10,
): Promise<QuizQuestion[]> {
  const prompt = `Generate exactly ${count} multiple-choice SIE exam questions about "${topic}" at ${difficulty} difficulty.

Return ONLY a JSON array with no markdown, no explanation, no code fences. The JSON must start with [ and end with ].

Each object must have exactly these fields:
- "id": a short unique string like "q1"
- "question": the question text
- "options": array of exactly 4 strings (the answer choices, without A/B/C/D prefixes)
- "correctAnswer": integer 0-3 (index of the correct option)
- "explanation": concise explanation of why the correct answer is right and why the others are wrong
- "topic": "${topic}"
- "difficulty": "${difficulty}"

Make questions realistic for the actual SIE exam. Use specific numbers, regulations, and concepts. Include calculation questions where relevant for this topic.`;

  try {
    // Pass empty history to avoid duplicate user message
    const response = await sendMessage(prompt, []);
    const text = response.response.trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Empty or invalid question array');

    return questions;
  } catch (error) {
    console.error('Failed to generate quiz questions:', error);
    return getFallbackQuestions(topic, difficulty, count);
  }
}

function getFallbackQuestions(
  topic: string,
  difficulty: string,
  count: number,
): QuizQuestion[] {
  const allFallbacks = FALLBACK_QUESTIONS[topic] ?? FALLBACK_QUESTIONS['bonds'];
  const filtered = difficulty === 'all'
    ? allFallbacks
    : allFallbacks.filter((q) => q.difficulty === difficulty);
  const pool = filtered.length > 0 ? filtered : allFallbacks;

  // Return up to `count` questions, cycling if needed
  const result: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    result.push({ ...pool[i % pool.length], id: `fallback-${i}` });
  }
  return result;
}

export async function scoringQuiz(
  questions: QuizQuestion[],
  answers: number[],
): Promise<{
  score: number;
  total: number;
  percentage: number;
  mistakes: Array<{ question: QuizQuestion; userAnswer: number }>;
}> {
  let correct = 0;
  const mistakes = [];

  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correctAnswer) {
      correct += 1;
    } else {
      mistakes.push({ question: questions[i], userAnswer: answers[i] });
    }
  }

  return {
    score: correct,
    total: questions.length,
    percentage: Math.round((correct / questions.length) * 100),
    mistakes,
  };
}

// Real SIE-style fallback questions per topic
const FALLBACK_QUESTIONS: Record<string, QuizQuestion[]> = {
  bonds: [
    {
      id: 'b1',
      question: 'A bond has a face value of $1,000, a coupon rate of 6%, and is currently trading at $950. What is the current yield?',
      options: ['5.7%', '6.0%', '6.3%', '6.6%'],
      correctAnswer: 2,
      explanation: 'Current yield = Annual coupon / Market price = $60 / $950 = 6.32%. The coupon payment is $1,000 × 6% = $60 per year.',
      topic: 'bonds',
      difficulty: 'basic',
    },
    {
      id: 'b2',
      question: 'When interest rates rise, what happens to existing bond prices?',
      options: ['They rise proportionally', 'They fall', 'They remain unchanged', 'They become more volatile'],
      correctAnswer: 1,
      explanation: 'Bond prices and interest rates have an inverse relationship. When rates rise, newly issued bonds offer higher yields, making existing lower-coupon bonds less attractive, so their prices fall.',
      topic: 'bonds',
      difficulty: 'basic',
    },
    {
      id: 'b3',
      question: 'Which of the following bonds has the greatest price sensitivity to interest rate changes?',
      options: ['2-year bond with 8% coupon', '10-year bond with 8% coupon', '10-year zero-coupon bond', '2-year zero-coupon bond'],
      correctAnswer: 2,
      explanation: 'Duration measures interest rate sensitivity. Zero-coupon bonds have the highest duration for a given maturity because all cash flows occur at maturity. A 10-year zero-coupon has the longest duration here.',
      topic: 'bonds',
      difficulty: 'intermediate',
    },
    {
      id: 'b4',
      question: 'A callable bond is most likely to be called when:',
      options: ['Interest rates rise significantly', 'Interest rates fall significantly', 'The issuer\'s credit rating is downgraded', 'The bond approaches maturity'],
      correctAnswer: 1,
      explanation: 'When interest rates fall, issuers can refinance at lower rates by calling the existing bonds and issuing new ones at the lower prevailing rate, saving on interest costs.',
      topic: 'bonds',
      difficulty: 'intermediate',
    },
    {
      id: 'b5',
      question: 'Which measure accounts for reinvestment risk when evaluating bond returns?',
      options: ['Current yield', 'Yield to maturity', 'Nominal yield', 'Yield to worst'],
      correctAnswer: 1,
      explanation: 'YTM assumes all coupon payments are reinvested at the same YTM rate throughout the bond\'s life. This reinvestment assumption is the source of reinvestment risk.',
      topic: 'bonds',
      difficulty: 'intermediate',
    },
  ],

  npv_irr: [
    {
      id: 'n1',
      question: 'A project costs $100,000 today and returns $120,000 in one year. The discount rate is 15%. What is the NPV?',
      options: ['$4,348', '$20,000', '-$4,348', '$104,348'],
      correctAnswer: 0,
      explanation: 'NPV = -$100,000 + $120,000/1.15 = -$100,000 + $104,348 = $4,348. Since NPV > 0, the project adds value.',
      topic: 'npv_irr',
      difficulty: 'intermediate',
    },
    {
      id: 'n2',
      question: 'A project has an IRR of 18%. The firm\'s required rate of return is 12%. The project should be:',
      options: ['Rejected because IRR exceeds hurdle rate', 'Accepted because IRR exceeds hurdle rate', 'Rejected because IRR is positive', 'Accepted because IRR equals NPV'],
      correctAnswer: 1,
      explanation: 'Accept a project when IRR > required rate of return (hurdle rate). Here 18% > 12%, so the project returns more than the minimum required and should be accepted.',
      topic: 'npv_irr',
      difficulty: 'basic',
    },
    {
      id: 'n3',
      question: 'Which statement about NPV and IRR is correct?',
      options: ['They always agree on project ranking', 'NPV assumes reinvestment at the discount rate; IRR assumes reinvestment at the IRR', 'IRR is always more reliable than NPV', 'NPV gives the same result regardless of the discount rate'],
      correctAnswer: 1,
      explanation: 'A key difference: NPV assumes cash flows are reinvested at the discount rate, while IRR assumes reinvestment at the computed IRR. This can cause ranking conflicts between mutually exclusive projects.',
      topic: 'npv_irr',
      difficulty: 'advanced',
    },
  ],

  yields: [
    {
      id: 'y1',
      question: 'A bond matures in 5 years, has a 7% coupon, and is priced at $1,050. Which statement is true?',
      options: ['YTM > coupon rate', 'YTM = coupon rate', 'YTM < coupon rate', 'Current yield > YTM'],
      correctAnswer: 2,
      explanation: 'When a bond trades at a premium (price > par), its YTM is less than the coupon rate. The investor pays more than face value and will receive only face value at maturity, reducing overall yield.',
      topic: 'yields',
      difficulty: 'basic',
    },
    {
      id: 'y2',
      question: 'Which yield measure is most useful for comparing bonds with different maturities and coupon rates?',
      options: ['Nominal yield', 'Current yield', 'Yield to maturity', 'Coupon yield'],
      correctAnswer: 2,
      explanation: 'YTM accounts for the coupon payments, the time value of money, and any premium or discount to par—making it the most comprehensive and comparable yield measure across different bonds.',
      topic: 'yields',
      difficulty: 'basic',
    },
    {
      id: 'y3',
      question: 'Yield to worst (YTW) is defined as:',
      options: ['The lowest possible yield an investor can receive', 'The yield if the bond defaults', 'The yield calculated to the earliest call date', 'The yield assuming all coupons are reinvested at zero'],
      correctAnswer: 0,
      explanation: 'YTW is the minimum of YTM and all yield-to-call calculations (for each call date). It represents the worst-case yield assuming the issuer exercises any call option at the worst time for the investor.',
      topic: 'yields',
      difficulty: 'intermediate',
    },
  ],

  options: [
    {
      id: 'o1',
      question: 'An investor buys a call option with a strike price of $50 and pays a $3 premium. The stock is currently at $52. What is the intrinsic value of the option?',
      options: ['$0', '$2', '$3', '$5'],
      correctAnswer: 1,
      explanation: 'Intrinsic value of a call = max(0, Stock price - Strike price) = max(0, $52 - $50) = $2. The remaining $1 of the $3 premium is time value.',
      topic: 'options',
      difficulty: 'basic',
    },
    {
      id: 'o2',
      question: 'A put option with a $60 strike is purchased for $4. At expiration the stock is at $53. What is the profit/loss?',
      options: ['-$4', '+$3', '+$7', '-$3'],
      correctAnswer: 1,
      explanation: 'Payoff = Strike - Stock price = $60 - $53 = $7 (intrinsic value). Profit = $7 - $4 premium paid = $3. The option expires in-the-money.',
      topic: 'options',
      difficulty: 'intermediate',
    },
    {
      id: 'o3',
      question: 'Which option strategy has unlimited loss potential?',
      options: ['Buying a call', 'Buying a put', 'Writing a naked call', 'Writing a covered call'],
      correctAnswer: 2,
      explanation: 'Writing (selling) a naked call has unlimited loss potential because the stock price can theoretically rise to infinity. The writer must deliver shares at the strike price regardless of how high the market price goes.',
      topic: 'options',
      difficulty: 'intermediate',
    },
    {
      id: 'o4',
      question: 'Put-call parity states that for European options with the same strike and expiration:',
      options: ['Call - Put = Stock price', 'Call + Strike (PV) = Put + Stock', 'Put = Call always', 'Call - Put = Strike price'],
      correctAnswer: 1,
      explanation: 'Put-call parity: C + PV(K) = P + S, where C = call price, PV(K) = present value of strike, P = put price, S = stock price. This prevents arbitrage between puts, calls, and the underlying stock.',
      topic: 'options',
      difficulty: 'advanced',
    },
  ],

  regulations: [
    {
      id: 'r1',
      question: 'Under Regulation T, the initial margin requirement for purchasing equity securities is:',
      options: ['25%', '50%', '75%', '100%'],
      correctAnswer: 1,
      explanation: 'Regulation T (Fed Reserve) sets the initial margin requirement at 50% for equity securities. This means an investor must deposit at least 50% of the purchase price when buying on margin.',
      topic: 'regulations',
      difficulty: 'basic',
    },
    {
      id: 'r2',
      question: 'Which self-regulatory organization (SRO) oversees broker-dealers in the U.S.?',
      options: ['SEC', 'FINRA', 'FDIC', 'OCC'],
      correctAnswer: 1,
      explanation: 'FINRA (Financial Industry Regulatory Authority) is the primary SRO regulating broker-dealers in the United States. The SEC oversees FINRA itself, but FINRA directly regulates member broker-dealers.',
      topic: 'regulations',
      difficulty: 'basic',
    },
    {
      id: 'r3',
      question: 'The Securities Exchange Act of 1934 primarily regulates:',
      options: ['New securities offerings', 'Secondary market trading', 'Mutual funds', 'Investment advisers'],
      correctAnswer: 1,
      explanation: 'The Securities Exchange Act of 1934 governs secondary market trading (after issuance). The Securities Act of 1933 governs primary market offerings. The Investment Company Act of 1940 covers mutual funds.',
      topic: 'regulations',
      difficulty: 'basic',
    },
    {
      id: 'r4',
      question: 'Under SEC Rule 10b-5, which activity is prohibited?',
      options: ['Short selling', 'Trading on material non-public information', 'Options trading', 'After-hours trading'],
      correctAnswer: 1,
      explanation: 'SEC Rule 10b-5 prohibits fraud and insider trading, including trading on material non-public information (MNPI). Trading on MNPI gives an unfair advantage and undermines market integrity.',
      topic: 'regulations',
      difficulty: 'intermediate',
    },
  ],

  ethics: [
    {
      id: 'e1',
      question: 'A registered representative receives a gift worth $150 from a client. Under FINRA rules, what must happen?',
      options: ['The gift must be reported and is acceptable', 'The gift must be rejected entirely', 'The gift is acceptable without any reporting requirement', 'The gift is acceptable only if under $100'],
      correctAnswer: 0,
      explanation: 'FINRA Rule 3220 limits gifts to $100 per person per year from clients or prospects. A $150 gift exceeds this limit. However, since the question asks what must happen - if it were $100 or less it must still be reported to the firm. The $150 gift violates the rule.',
      topic: 'ethics',
      difficulty: 'intermediate',
    },
    {
      id: 'e2',
      question: 'The suitability standard requires a broker to:',
      options: ['Act in the client\'s best interest at all times', 'Recommend investments that are suitable based on the client\'s profile', 'Charge the lowest possible commissions', 'Disclose all conflicts of interest'],
      correctAnswer: 1,
      explanation: 'Suitability (FINRA Rule 2111) requires brokers to have a reasonable basis to believe a recommendation is suitable for a customer based on their financial situation, investment objectives, and risk tolerance—not necessarily the "best" option.',
      topic: 'ethics',
      difficulty: 'basic',
    },
    {
      id: 'e3',
      question: 'Which standard imposes a higher duty of care on investment advisers than the suitability standard?',
      options: ['Prudent investor rule', 'Best interest standard (Reg BI)', 'Fiduciary duty', 'Know-your-customer rule'],
      correctAnswer: 2,
      explanation: 'The fiduciary duty—applicable to investment advisers under the Investment Advisers Act of 1940—requires acting in the client\'s best interest and putting client interests ahead of the adviser\'s own. This is a higher standard than suitability.',
      topic: 'ethics',
      difficulty: 'intermediate',
    },
  ],

  market_structure: [
    {
      id: 'm1',
      question: 'In a dealer market, trades occur:',
      options: ['Directly between buyers and sellers on an exchange floor', 'Through a dealer who buys and sells from their own inventory', 'Only during regular exchange hours', 'Through a central clearinghouse without intermediaries'],
      correctAnswer: 1,
      explanation: 'In a dealer market (like the OTC market/NASDAQ), dealers act as principals—they buy securities into their own inventory and sell from it. They profit from the bid-ask spread. In contrast, broker markets match buyers and sellers as agents.',
      topic: 'market_structure',
      difficulty: 'basic',
    },
    {
      id: 'm2',
      question: 'The primary market is where:',
      options: ['Most daily stock trading occurs', 'Investors trade securities among themselves', 'Issuers sell new securities to raise capital', 'Short selling takes place'],
      correctAnswer: 2,
      explanation: 'The primary market is where new securities are issued by companies or governments to raise capital (e.g., IPOs). After initial issuance, securities trade in the secondary market between investors.',
      topic: 'market_structure',
      difficulty: 'basic',
    },
    {
      id: 'm3',
      question: 'Which order type guarantees execution but not price?',
      options: ['Limit order', 'Stop-limit order', 'Market order', 'Good-till-cancelled order'],
      correctAnswer: 2,
      explanation: 'A market order executes immediately at the best available price, guaranteeing execution but not price. A limit order guarantees price but not execution—it only executes at the specified price or better.',
      topic: 'market_structure',
      difficulty: 'basic',
    },
  ],

  derivatives: [
    {
      id: 'd1',
      question: 'A futures contract differs from a forward contract primarily because futures contracts are:',
      options: ['Larger in size', 'Standardized and exchange-traded', 'Only available to institutional investors', 'Not subject to margin requirements'],
      correctAnswer: 1,
      explanation: 'Futures contracts are standardized (fixed contract sizes, delivery dates) and traded on exchanges with daily mark-to-market settlement. Forwards are customized, OTC contracts between two parties with no daily settlement.',
      topic: 'derivatives',
      difficulty: 'basic',
    },
    {
      id: 'd2',
      question: 'An investor holds 10,000 shares of XYZ stock and buys put options as protection. This strategy is called:',
      options: ['Covered call', 'Protective put', 'Collar strategy', 'Straddle'],
      correctAnswer: 1,
      explanation: 'A protective put involves buying put options on a stock you already own. The puts act as insurance—if the stock falls below the strike, the puts gain value, limiting downside loss while maintaining upside potential.',
      topic: 'derivatives',
      difficulty: 'intermediate',
    },
    {
      id: 'd3',
      question: 'Which party in a futures contract profits when the underlying asset price falls?',
      options: ['The long (buyer)', 'The short (seller)', 'The clearinghouse', 'Neither party profits'],
      correctAnswer: 1,
      explanation: 'The short (seller) in a futures contract profits when prices fall because they are obligated to sell at the contracted price, which is now above the current market price. The long loses in a falling market.',
      topic: 'derivatives',
      difficulty: 'basic',
    },
  ],
};
