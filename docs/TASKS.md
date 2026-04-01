# Post-MVP Task List

Remaining tasks not yet completed. See [SPEC.md](./SPEC.md) for full context.

---

## 1. Content Expansion

### 1.1 Iron Eye Isabella Boss AI (Act 3)

**Priority: High** — Only missing piece for a complete 3-act run.

**Scope:**
- Implement phase-based AI for Iron Eye Isabella in BossController.
- Enemy definition exists (250 HP, lock/suppress/poison abilities) but `BossController.chooseBossIntent()` has no case for her.

**Phase logic (from SPEC):**
- Phase 1 (100-65%): Row locks, 10 passive block/turn, 20-25 damage strikes.
- Phase 2 (65-30%): Warrants suppress 2 tile types, locks need 2 adjacent matches to free.
- Phase 3 (30-0%): 2 locks + 2 poisons/turn, 30-35 damage, no block.

**Acceptance Criteria:**
- [ ] BossController handles `iron_eye_isabella` with 3 phases and correct transition thresholds.
- [ ] Phase 1 passive block and row-lock mechanics work.
- [ ] Phase 2 type suppression (warrants) and hardened locks implemented.
- [ ] Phase 3 escalated hazard output and increased damage.
- [ ] Full 3-act run can be completed start to finish.

---

## 2. Meta Systems

### 2.1 Reputation Shop UI

**Priority: High** — Backend tracking exists but the shop is inaccessible.

**Scope:**
- Build the Reputation Shop screen (currently a disabled button on the main menu).
- metaStore already has `reputation`, `unlockedArtifacts[]`, `unlockedCharacters[]`, and sync logic.
- Display unlockable items with costs and locked/unlocked state.
- Purchasing deducts Reputation and adds content to game pools.

**Acceptance Criteria:**
- [ ] Reputation Shop button enabled on main menu, navigates to shop screen.
- [ ] Shop UI shows all unlockable items with costs and locked/unlocked state.
- [ ] Purchasing deducts Reputation and immediately adds content to game pool.
- [ ] Unlocked artifacts appear in future run artifact pools.

---

### 2.2 Ascension System

**Priority: Medium** — Multiplier works in scoring but no player-facing UI or difficulty modifiers.

**Scope:**
- Add ascension level selector to New Game flow.
- Implement cumulative difficulty modifiers per tier (enemies +10% HP, less gold, more board manipulation — specifics TBD via playtesting).
- Track highest_ascension_cleared (field exists in metaStore).

**Acceptance Criteria:**
- [ ] Ascension levels selectable on New Game screen (only unlocked levels available).
- [ ] Each tier applies correct cumulative modifiers to enemies, rewards, and board.
- [ ] Highest cleared ascension tracked and synced.

---

### 2.3 Leaderboards + Anti-Cheat

**Priority: Low** — Competitive element for endgame players.

**Scope:**
- Leaderboards: Daily, Weekly, All-Time. Top 10 each.
- Scores table already exists in DB schema.
- Anti-cheat: server-side score validation, run integrity checks (specifics TBD).

**Acceptance Criteria:**
- [ ] Leaderboard UI shows Daily / Weekly / All-Time tabs with top 10 scores.
- [ ] Scores submit automatically on run completion (when online).
- [ ] Basic anti-cheat prevents trivially fabricated scores.
- [ ] Leaderboard data refreshes on view.

---

### 2.4 Scoring Expansion

**Priority: Medium** — Current scoring covers base + gold + artifacts + traits. Missing several SPEC bonus categories.

**Scope:**
- Track and score: damage dealt (1 per 10 damage), longest cascade (50 per step), flawless fights (150 each).
- Implement run timer and time multiplier: 1.5x at <=45 min, linear to 1.0x at 90 min, no penalty past 90 min.
- Submit scores to database on run completion.

**Acceptance Criteria:**
- [ ] Damage dealt tracked during run and scored (1 per 10 damage).
- [ ] Longest cascade tracked and scored (50 per step).
- [ ] Flawless fights (no damage taken) tracked and scored (150 each).
- [ ] Time multiplier implemented with correct scaling.
- [ ] Scores persist to IndexedDB and sync to Supabase.

---

## 3. Technical & Infrastructure

### 3.1 Mid-Combat Saves

**Priority: Medium** — Players can close the app mid-fight and resume.

**Scope:**
- Serialize full combat state: board layout, tile positions, player HP/block/status, enemy HP/status/intent, ability charge, swap count, cascade state, consumables used this turn.
- Save to IndexedDB on every swap resolution (or on app backgrounding).
- On resume: reconstruct CombatScene from saved state.

**Acceptance Criteria:**
- [ ] Closing and reopening the app mid-combat resumes the fight exactly where it left off.
- [ ] Board state, HP, statuses, and enemy intents all restore correctly.
- [ ] No exploits from save/reload (e.g., re-rolling cascades).
- [ ] Works offline (IndexedDB) and syncs when reconnected.

---

### 3.2 PWA Offline

**Priority: Low** — Full offline play via service worker + web app manifest.

**Scope:**
- Service worker caches all game assets, code, and fonts for offline play.
- Web app manifest enables "Add to Home Screen" on mobile.
- Offline indicator in UI.

**Acceptance Criteria:**
- [ ] Game loads and plays fully offline after first visit.
- [ ] "Add to Home Screen" prompt works on iOS Safari and Android Chrome.
- [ ] Offline saves sync to Supabase when connectivity returns.
- [ ] Cache updates on new deployments without requiring manual clear.

---

## 4. Polish

### 4.1 Polish (Screenshake, Particles, Juice)

**Priority: Low** — Game feel improvements.

**Scope:**
- Screen shake on big hits, boss phase transitions, explosions. Integer-pixel offsets only.
- Particle effects using Phaser's particle system with master palette colors.
- Juice: tile pop on match, bounce on cascade land, flash on crit, pulse on status effect trigger, smooth HP bar tweens.
- All positions remain integer. All effects respect pixel-perfect rendering.

**Acceptance Criteria:**
- [ ] Screen shake triggers on appropriate events with configurable intensity.
- [ ] Particle effects use master palette colors only.
- [ ] All juice animations use integer positions (no sub-pixel rendering).
- [ ] Polish effects can be toggled off in Settings (accessibility).
- [ ] 60fps maintained on 3+ year old phones with all effects active.
