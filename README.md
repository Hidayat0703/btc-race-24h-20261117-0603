# btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/Hidayat0703/btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/Hidayat0703/btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Dislocation sniper: a BTC trading bot that races cbBTC/USDC live for 24 hours. It buys 100% of cash only when the close prints at least 0.60% below its 60-bar exponential average, then sells at +1.50%, at -1.20%, or after 480 bars. On the kit dev window it makes +29.93 USDC over 4 trades (2/2 winning round trips, max drawdown 0.72%), beating every kit baseline (best baseline: momentum +$2.45).

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout (see `vendor/makefun-bars.ts`, the kit SDK shim, copied byte-identical). Node 22, standard library only, no network, deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=takanome&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
