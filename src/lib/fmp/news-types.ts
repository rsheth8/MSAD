/** Partial FMP shapes for news & sentiment endpoints. */

export interface FmpStockNewsRow {
  symbol?: string;
  publishedDate?: string;
  title?: string;
  text?: string;
  url?: string;
  site?: string;
  image?: string;
}

export interface FmpGradesConsensusRow {
  symbol?: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  consensus?: string;
}

export interface FmpGradeRow {
  symbol?: string;
  date?: string;
  gradingCompany?: string;
  previousGrade?: string;
  newGrade?: string;
  action?: string;
}

export interface FmpSocialSentimentRow {
  symbol?: string;
  date?: string;
  stocktwitsPosts?: number;
  twitterPosts?: number;
  stocktwitsSentiment?: number;
  twitterSentiment?: number;
}
