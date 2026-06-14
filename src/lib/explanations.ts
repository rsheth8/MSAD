/**
 * Beginner-friendly explainer content for every metric, plus the price and
 * chart. Seeded from the definitions in reference/Proposal.pdf and rewritten
 * for someone brand new to the market. Used by the expandable "?" cards.
 */

export interface ExplainerContent {
  /** short title shown on the card */
  title: string;
  /** plain-English "what is this" */
  what: string;
  /** what a higher vs. lower value tends to signal */
  meaning: string;
  /** the catch — what a beginner should be careful about */
  watch: string;
}

export const METRIC_EXPLAINERS: Record<string, ExplainerContent> = {
  pe: {
    title: "P/E Ratio",
    what: "How many dollars investors pay for each $1 the company earns in profit. A P/E of 25 means you pay $25 for $1 of yearly earnings.",
    meaning:
      "A higher P/E usually means the market expects strong future growth. A lower P/E can mean the stock is cheaper — or that growth is weak.",
    watch:
      "A high P/E only pays off if earnings actually grow. If they don't, the price can fall hard.",
  },
  evEbitda: {
    title: "EV / EBITDA",
    what: "Compares the company's total value (including its debt) to its core operating earnings. It's like P/E but it doesn't ignore debt.",
    meaning:
      "A lower number can mean the company is cheaper relative to what it actually earns. A higher number means it's more expensive.",
    watch:
      "A low number is only attractive if the business is healthy and not shrinking.",
  },
  roe: {
    title: "Return on Equity (ROE)",
    what: "How much profit the company squeezes out of the money shareholders have put in. Higher = more efficient with investors' money.",
    meaning:
      "Consistently high ROE is usually a good sign of a strong, profitable business.",
    watch:
      "Very high ROE can sometimes be caused by heavy borrowing rather than real strength — worth a closer look.",
  },
  opRevenue: {
    title: "Operating / Revenue Ratio",
    what: "How much of the company's total sales come from its actual core business (rather than one-off events or side income).",
    meaning:
      "A higher ratio is usually better — it means revenue is coming from the real, repeatable business.",
    watch:
      "A falling ratio can hint that profits are leaning on one-time items that won't repeat.",
  },
  cashFlowChange: {
    title: "Change in Cash Flow",
    what: "Whether the actual cash the business generates is growing or shrinking compared to before.",
    meaning:
      "Rising cash flow is one of the strongest positive signs — cash gives a company flexibility to grow, pay debt, or return money to investors.",
    watch:
      "Falling cash flow can be a red flag even when reported 'earnings' still look fine.",
  },
  divYield: {
    title: "Dividend Yield",
    what: "The cash a company pays out to shareholders each year, as a percentage of the share price. A 3% yield pays $3/year on a $100 share.",
    meaning:
      "A dividend is direct income for owning the stock. Many growth companies pay none and reinvest instead — that's normal.",
    watch:
      "A very high yield can be a warning: it sometimes means the price has dropped sharply, or the payout may be cut.",
  },
  assetLiability: {
    title: "Asset / Liability Ratio",
    what: "Compares what the company owns to what it owes. Above 1 means it owns more than it owes.",
    meaning:
      "A higher ratio means a stronger balance sheet that can better handle debt and tough times.",
    watch:
      "Extremely high can also mean the company isn't using debt efficiently to grow.",
  },
};

export const PRICE_EXPLAINER: ExplainerContent = {
  title: "Price & Recent Change",
  what: "The current share price, and how much it has moved over the past week, month, and year.",
  meaning:
    "Short-term moves (a week) are mostly noise. The 1-year change tells you more about the real trend.",
  watch:
    "A rising price isn't the same as a good business — always check the fundamentals too.",
};

export const CHART_EXPLAINER: ExplainerContent = {
  title: "Interactive Performance Chart",
  what: "Compare this stock's price against a benchmark (sector ETF, S&P 500, or a peer) over different time ranges. Lines start at 100 so you can see relative performance. Switch to Scatter mode to plot two fundamentals (like P/E vs ROE) for this company and its peers.",
  meaning:
    "In Compare mode, if the stock line stays above the benchmark, it outperformed over that period. Max drawdown shows the worst peak-to-trough drop. Volume bars (optional) show trading activity.",
  watch:
    "Past performance doesn't predict the future. Scatter plots are a snapshot — one good metric doesn't guarantee a good investment.",
};

export const SCATTER_EXPLAINER: ExplainerContent = {
  title: "Fundamental Scatter Plot",
  what: "Each dot is a company — the highlighted dot is this stock, grey dots are industry peers. Pick any two metrics for the X and Y axes to see how this company stacks up.",
  meaning:
    "Dots in the 'good' corner depend on which metrics you pick — e.g. low P/E + high ROE can mean cheaper quality. Clusters show what's normal for the industry.",
  watch:
    "Missing data hides some peers. Outliers can distort the picture — always read the actual numbers on the report card too.",
};

export const OPTION_EXPLAINER: ExplainerContent = {
  title: "What is an option?",
  what: "An option is a contract that gives you the right — but not the obligation — to buy or sell 100 shares of a stock at a set price, before a set date. You pay a fee (the 'premium') for that right.",
  meaning:
    "Options let you bet on a stock's direction with less money up front than buying shares, or protect shares you already own.",
  watch:
    "Options can expire worthless — you can lose 100% of the premium you paid. They're advanced and risky for beginners.",
};

export const CALL_EXPLAINER: ExplainerContent = {
  title: "Call option",
  what: "A call gives you the right to BUY 100 shares at the strike price before expiration. You'd consider one if you think the stock will go UP.",
  meaning:
    "If the stock rises well above the strike, the call gains value. Your most you can lose is the premium you paid.",
  watch:
    "If the stock doesn't rise above your break-even (strike + premium) by expiration, you lose money.",
};

export const PUT_EXPLAINER: ExplainerContent = {
  title: "Put option",
  what: "A put gives you the right to SELL 100 shares at the strike price before expiration. You'd consider one if you think the stock will go DOWN (or to protect shares you own).",
  meaning:
    "If the stock falls well below the strike, the put gains value. Again, the most you can lose is the premium.",
  watch:
    "If the stock doesn't fall below your break-even (strike − premium), you lose the premium.",
};

export const IV_EXPLAINER: ExplainerContent = {
  title: "Implied Volatility (IV)",
  what: "The market's estimate of how much the stock might move over the next year, shown as a percentage. It's baked into every option's price.",
  meaning:
    "Higher IV means bigger expected swings — and more expensive options. Lower IV means calmer expectations and cheaper options.",
  watch:
    "Buying when IV is very high means you're paying up; if IV falls, your option can lose value even if the stock barely moves.",
};

export const DELTA_EXPLAINER: ExplainerContent = {
  title: "Delta (Δ)",
  what: "Delta estimates how much an option's price moves when the stock moves $1. A call with Δ +0.50 gains about $0.50 per $1 the stock rises; a put with Δ −0.50 gains about $0.50 per $1 the stock falls.",
  meaning:
    "At-the-money options near expiration often sit around ±0.50. Deep in-the-money options behave more like owning the stock; far out-of-the-money options have delta near zero.",
  watch:
    "Delta changes as the stock moves and time passes — it's a snapshot, not a fixed rule.",
};

export const STRIKE_PREMIUM_EXPLAINER: ExplainerContent = {
  title: "Strike, Premium & Expiry",
  what: "Strike = the locked-in price you can buy/sell at. Premium = the per-share price you pay for the contract (×100 for one contract). Expiry = the deadline.",
  meaning:
    "Break-even is the price the stock must reach for you to start making money: strike + premium for a call, strike − premium for a put.",
  watch:
    "Time works against option buyers — as expiration nears, an option with no value decays toward zero.",
};

export const GRADE_EXPLAINER: ExplainerContent = {
  title: "Overall Grade",
  what: "A single beginner-friendly grade summarizing how this company's key numbers stack up against others in its industry.",
  meaning:
    "It's a quick gut-check, not a verdict — a starting point for asking better questions.",
  watch:
    "A grade can't see the future, news, or your own goals. Never buy or sell on a letter alone.",
};
