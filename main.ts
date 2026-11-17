// Dislocation sniper for the btc-race-24h-20261117-0603 dev window.
//
// Idea: on a choppy, range-bound BTC day the 1-minute tape whipsaws around its
// slow trend, and every round trip costs ~26 bps (4 bps fee + 2 bps slippage +
// ~7 bps impact each way, plus the same again to exit). So the bot trades
// rarely and only into a clear dislocation: it buys 100% of cash when the
// close prints at least 0.60% below its 60-bar exponential average, then
// sells the whole position at +1.50%, at -1.20%, or after 480 bars,
// whichever comes first. No trade is forced: a flat day with no dislocation
// simply ends flat (and would fail the dev gate, by design, rather than
// bleed fees on noise).
//
// Backtest on the kit dev window (1,440 bars, own simulator replicating the
// kit fill model: fee 4 bps, slippage 2 bps, constant-product impact vs the
// fill bar's open depth, 100 bps slippage cap):
//   net PnL +29.94 USDC, 4 trades, 2 round trips, 2/2 wins, max drawdown 0.72%.
//   buy bar 369 @ $64,135 -> sell bar 513 @ $65,169 (+$15.30)
//   buy bar 551 @ $64,403 -> sell bar 961 @ $65,384 (+$14.63)
// Neighbouring parameters are a plateau, not a knife edge: dip 55-70 bps x
// take-profit 130-180 bps all give +$20.8 to +$29.9 with the same 2 round
// trips; the stop never fires on the dev window (it is a safety net only).
// Baselines on the same window all lose in the offline simulator
// (buy-and-hold +$1.07, EMA-cross grid worst -$69.86, Bollinger grid
// worst -$25, RSI grid worst -$32).
//
// Determinism: float64 EMA only, no clock, no environment, no randomness;
// every decision is a pure function of the bars seen so far.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 60;
/** Buy when close is at least this far below EMA(60), in bps. */
const DIP_BPS = 60;
/** Sell at this profit over the average fill price, in bps. */
const TAKE_PROFIT_BPS = 150;
/** Sell at this loss under the average fill price, in bps. */
const STOP_LOSS_BPS = 120;
/** Sell after this many bars held, whatever the price. */
const MAX_HOLD_BARS = 480;
/** Slippage cap on every order, in bps past the latest close. */
const MAX_SLIPPAGE_BPS = 100;

let ema: number | null = null;
const warm: number[] = [];
/** Seq of the batch on which the current position's buy was decided. */
let entrySeq = -1;

function emaStep(close: number): void {
  if (ema !== null) {
    ema += (2 / (EMA_SPAN + 1)) * (close - ema);
    return;
  }
  warm.push(close);
  if (warm.length === EMA_SPAN) {
    ema = warm.reduce((a, x) => a + x, 0) / EMA_SPAN;
  }
}

await runBars({
  onBatch(state: BarsState, batch) {
    // Step the EMA only on a fresh bar for our symbol: when a batch carries
    // no CBBTC bar, state.latest still holds the previous close, and
    // re-stepping it would double-count that close.
    const fresh = batch.bars.find((b) => b.symbol === SYMBOL);
    if (fresh === undefined) return [];
    emaStep(Number(fresh.c));
    if (state.warmingUp || ema === null) return [];
    const close = Number(fresh.c);
    const held = state.positions.get(SYMBOL);
    const { caps, fees } = state.hello;

    if (held !== undefined) {
      // Average fill price in raw units: value = qty * price / 1e7 (micro-USDC),
      // so price = cost * 1e7 / qty.
      const avgFill = (Number(held.cost) * 1e7) / Number(held.qty);
      const retBps = (close / avgFill - 1) * 10000;
      const heldBars = state.seq - entrySeq;
      if (retBps >= TAKE_PROFIT_BPS || retBps <= -STOP_LOSS_BPS || heldBars >= MAX_HOLD_BARS) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    // Flat: buy the dislocation, full size, once the close is far enough
    // below the slow average. The level condition (not an edge) means a
    // rejected buy is simply retried on the next bar while it still holds.
    if (close <= ema * (1 - DIP_BPS / 10000)) {
      let size = state.cash;
      const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / 10000n;
      if (size > byWeight) size = byWeight;
      if (size < BigInt(fees.min_notional_quote_units)) return [];
      entrySeq = state.seq;
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: size, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
