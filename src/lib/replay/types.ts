/** Market Replay — trade a mystery chart bar-by-bar, blind to the future. */

export interface ReplayGame {
  /** normalized closes (indexed to 100 at the window start) for the whole window */
  series: number[];
  /** how many bars are revealed before the user starts deciding */
  startIndex: number;
  /** the answer — UI must keep this hidden until the game ends */
  reveal: { ticker: string; name: string; fromDate: string; toDate: string };
  isMock: boolean;
}

/** stance held during the move from bar i → i+1 */
export type Stance = "in" | "out";

export interface ReplayResult {
  /** final equity of the user's choices, indexed to 1.0 at startIndex */
  you: number;
  /** final equity of staying fully invested from startIndex */
  buyHold: number;
  /** fraction of decided steps the user was invested */
  timeInMarket: number;
  steps: number;
}
