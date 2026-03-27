---
name: context
description: engineering context
---

## Product context: Shinjo

Shinjo is a **crypto-native prize-linked savings (PLS)** protocol that turns idle ETH and BTC into a savings game people actually want to play. Website: shinjo.app.

**What PLS is:** User deposits are invested, yield is pooled, and randomly distributed as prizes to participants. The principal is never touched. Scale is critical: more AUM → more yield → bigger prizes → more savers.

**Market:** ~$200bn invested in TradFi PLS schemes globally. The UK's Premium Bonds alone hold ~$130bn AUM. Traditional PLS hit predictable ceilings: gambling regulation, lottery monopolies, and a decade of low interest rates compressing available yield.

**Two user personas:**
1. *Lottery substituters* — people (often in emerging markets) who replace lottery spend with PLS, and only start saving because of PLS.
2. *Responsible savers / hodl'ers* — people who already accumulate wealth but value additional upside and fun. Premium Bonds' ~$130bn AUM proves this persona dominates at scale, yet research overlooks it. In crypto, long-term ETH/BTC holders are the direct analogue.

**Macro backdrop — the broken ladder:** Traditional paths to wealth (house, kids, retirement) are inaccessible or broken. The rational response is seeking asymmetric upside — memecoin trenches, 30x leverage on Hyperliquid, etc. Simultaneously, attention is increasingly contested: products compete via entertainment, dopamine-driven reward loops, and community. Finance becomes a meme. When "getting ahead" becomes a game, the winning product offers asymmetric upside, makes playing survivable, and adds a social/entertainment layer. Shinjo is that product.

**Core thesis:** Hundreds of billions in crypto sit idle. PLS reframes saving as financial entertainment — gamified activities, large potential upside, shared community — nudging people into positive outcomes instead of extractive zero-sum games. At a time when people need principal-preserving, asymmetric upside more than ever.

**Why crypto-native PLS:**
- DeFi yields far exceed T-bill rates → larger prize pools
- A single borderless pool scales beyond fragmented national schemes
- Yield generation is transparent and automated by default

**Why ETH/BTC, not stablecoins:** Stablecoins on blue-chip markets may yield similarly to T-bills, but incentive campaigns push the real opportunity cost of stables much higher. ETH/BTC holders already expect long-term appreciation — they're not sacrificing yield, they're adding optionality. This fundamentally changes the value proposition. Stablecoin deposits are *allowed* for risk-averse users, but not the focus.

**Key differentiator vs PoolTogether:** PT proved crypto-native PLS is technically viable but is largely forgotten today. Best explained by path dependency: once TVL dropped, prizes shrank, and marginal benefit for new users vanished. People want to win life-changing money — $15k prizes aren't enough. PT is a protocol, not a consumer-facing product. Shinjo pairs reflexive tokenomics that fuel a growth loop, a real consumer-facing UX, and headline-sized prizes to create a flywheel PT never had.

**Tokenomics & GTM direction:** Reflexive tokenomics that create demand as the pool grows. Integrator-first distribution with builder codes and rev-sharing. Entertainment-first UX. Focus on headline prizes large enough to break through attention noise.

---

My engineering preferences (use these to guide your recommendations):
- DRY is important—flag repetition aggressively.
- Well-tested code is non-negotiable; I'd rather have too many tests than too few.
- I want code that's "engineered enough" — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity).
- I err on the side of handling more edge cases, not fewer; thoughtfulness > speed.
- Bias toward explicit over clever.

## 1. Architecture review
Evaluate:
- Overall system design and component boundaries.
- Dependency graph and coupling concerns.
- Data flow patterns and potential bottlenecks.
- Scaling characteristics and single points of failure.
- Security architecture (auth, data access, API boundaries).

## 2. Code quality review
Evaluate:
- Code organization and module structure.
- DRY violations—be aggressive here.
- Error handling patterns and missing edge cases (call these out explicitly).
- Technical debt hotspots.
- Areas that are over-engineered or under-engineered relative to my preferences.

## 3. Test review
Evaluate:
- Test coverage gaps (unit, integration, e2e).
- Test quality and assertion strength.
- Missing edge case coverage—be thorough.
- Untested failure modes and error paths.

## 4. Performance review
Evaluate:
- N+1 queries and database access patterns.
- Memory-usage concerns.
- Caching opportunities.
- Slow or high-complexity code paths.

**For each issue you find**

For every specific issue (bug, smell, design concern, or risk):
- Describe the problem concretely, with file and line references.
- Present 2–3 options, including "do nothing" where that's reasonable.
- For each option, specify: implementation effort, risk, impact on other code, and maintenance burden.
- Give me your recommended option and why, mapped to my preferences above.
- Then explicitly ask whether I agree or want to choose a different direction before proceeding.

**Workflow and interaction**
- Do not assume my priorities on timeline or scale.
- After each section, pause and ask for my feedback before moving on.

---

BEFORE YOU START:
Ask if I want one of two options:
1/ BIG CHANGE: Work through this interactively, one section at a time (Architecture → Code Quality → Tests → Performance) with at most 4 top issues in each section.
2/ SMALL CHANGE: Work through interactively ONE question per review section

FOR EACH STAGE OF REVIEW: output the explanation and pros and cons of each stage's questions AND your opinionated recommendation and why, and then use AskUserQuestion. Also NUMBER issues and then give LETTERS for options and when using AskUserQuestion make sure each option clearly labels the issue NUMBER and option LETTER so the user doesn't get confused. Make the recommended option always the 1st option.