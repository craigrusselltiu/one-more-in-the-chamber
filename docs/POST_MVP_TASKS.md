# Post-MVP Task List

Refined from the Post-MVP section of [SPEC.md](./SPEC.md). Each task includes scope, acceptance criteria, and relevant spec references. Tasks are grouped by domain and ordered by suggested priority within each group.

---

## 1. Content Expansion

### 1.1 Acts 2-3: The Canyon & The Town

**Priority: High** — Unlocks full game loop (3-act run structure).

**Scope:**
- Implement Act 2 ("The Canyon") and Act 3 ("The Town") with full enemy rosters, bosses, and map generation.
- Between-act tile selection: after each boss, offer 1 of 3 tiles from the additional pool (already-chosen tiles excluded).
- Tile count progression: 4 (Act 1) → 5 (Act 2) → 6 (Act 3). Board distribution stays equal per tile type.

**Act 2 — The Canyon:**
- Enemies: Prospector Gone Mad (55 HP, bombs), Dynamite Outlaw (80 HP, barricades), Cave Bat Swarm (3x 15 HP, bury tiles), Mine Cart (timed encounter, 6 turns, 50 damage on failure).
- Enemy damage range: 12-25.
- Boss: "Copperhead" Cassidy (200 HP). Phase 1: poison 4 tiles, alternating brew/strike. Transition at 50%: fool's gold tiles appear. Phase 2: poison + fool's gold, 20-25 damage strikes.

**Act 3 — The Town:**
- Enemies: Corrupt Deputy (65 HP, locks + type suppression), Saloon Brawler (100 HP, pure damage), Train Guard elite (75 HP, barricades + bombs).
- Enemy damage range: 18-35.
- Boss: "Iron Eye" Isabella (250 HP). Phase 1: row locks, 10 passive block/turn, 20-25 damage. Phase 2 at 65%: warrants suppress 2 tile types, locks need 2 adjacent matches. Phase 3 at 30%: 2 locks + 2 poisons/turn, 30-35 damage, no block.

**Acceptance Criteria:**
- [ ] Act 2 and Act 3 maps generate with ~12-15 nodes each, branching paths, guaranteed treasure mid-act, campfire pre-boss.
- [ ] All Act 2 and Act 3 enemies implemented with correct HP, damage, AI, and board manipulation.
- [ ] Both bosses implemented with phase transitions and unique mechanics (fool's gold tiles, type suppression/warrants).
- [ ] Between-act tile selection UI works correctly (excludes already-chosen tiles).
- [ ] Board tile distribution adjusts correctly for 5 and 6 tile types.
- [ ] Full 3-act run can be completed start to finish.

---

### 1.2 Additional Tiles (Whiskey, Buckshot, Ace, Venom, Ember, Horseshoe)

**Priority: High** — Required for Acts 2-3 tile selection to have meaningful choices.

**Scope:**
Implement all 6 tiles from the additional pool. These are gained between acts or swapped at shops.

| Tile | Per-tile | Key Mechanic |
|---|---|---|
| Whiskey | 2 HP | Heals player. |
| Buckshot | 5 damage | Raw single-target damage. |
| Ace | +0.25x multiplier | Stacking multiplier consumed on next non-Ace match. Resets between fights. No cap. Not affected by match bonuses. |
| Venom | 1 venom stack | Applied to targeted enemy. Ticks at enemy turn start (damage = stack count), then stacks -1. |
| Ember | 4 damage | 25% chance per cleared tile to convert 1 adjacent non-Ember tile into Ember after cascade. |
| Horseshoe | +5% crit chance | Feeds into global crit system. Resets between fights. |

- Implement tile upgrade values for each (see SPEC.md Tile Upgrades table).
- Implement shop tile-swap mechanic: non-core, non-starter tiles can be swapped for a different additional pool tile (50-75 gold).

**Acceptance Criteria:**
- [ ] All 6 tiles generate resources correctly per spec.
- [ ] Ace multiplier displays as player status effect, stacks across matches, consumed correctly.
- [ ] Venom stacks display on enemies, tick damage works, stacks decrease by 1 each turn.
- [ ] Ember conversion triggers after cascade resolution with correct 25% probability.
- [ ] Horseshoe integrates with existing crit system.
- [ ] All 6 tiles can be upgraded at rest sites with correct per-upgrade values.
- [ ] Shop tile-swap works (only non-core, non-starter tiles swappable).

---

### 1.3 Full Artifact Set (60-80 Artifacts)

**Priority: Medium** — MVP has ~20. Expanding to 60-80 adds replayability and trait depth.

**Scope:**
- Design and implement 40-60 additional artifacts across all 7 traits.
- Maintain trait tag balance so all 7 traits have viable artifact counts to hit breakpoints.
- Each artifact must pass the "sauce test" — the effect tells a micro-story tied to the western theme.
- Artifacts found at: elite combat (pick 1 of 3), shops (100-175 gold), treasure nodes, events.

**Acceptance Criteria:**
- [ ] 60-80 total artifacts in the pool, each with name, effect, 0-2 trait tags, and flavour text.
- [ ] All trait breakpoints are reachable with reasonable artifact distributions.
- [ ] Artifacts render correctly in the artifact bar UI.
- [ ] New artifacts integrate with existing systems (combat, board manipulation, resource generation).
- [ ] No duplicate or near-duplicate effects.

---

### 1.4 Full Event Pool (15-20 Events)

**Priority: Medium** — MVP has ~4-6. Events add narrative variety to runs.

**Scope:**
- Design and implement 9-14 additional events beyond the MVP set.
- MVP events: The Card Game, The Wanted Board, The Snake Charmer, The Abandoned Mine, The Broken Cart, The Old Well, The Dynamite Stash.
- Each event needs: flavour text, 2-3 choices with clear risk/reward tradeoffs, mechanical effects.
- Events should interact with existing systems (gold, HP, artifacts, consumables, shop pricing, tile types).
- Some events should be unlockable via the Reputation Shop.

**Acceptance Criteria:**
- [ ] 15-20 total events in the pool.
- [ ] Each event has flavour text, meaningful choices, and correct mechanical effects.
- [ ] Events appear correctly on the map and are rendered via EventScreen.
- [ ] Unlockable events are gated behind Reputation Shop purchases.
- [ ] No event can softlock the run or create invalid game state.

---

### 1.5 Additional Characters

**Priority: Low** — MVP ships with Red Panda only. New characters add long-term replayability.

**Scope:**
- Design 2-3 additional playable characters, each with a unique ability (different from Deadeye) and charge rate.
- Each character needs: pixel art sprite set (idle, attack, block, heal, hit, death, ability, match), an exclusive artifact, and flavour/personality.
- Characters unlocked via Reputation Shop.
- Characters should encourage different playstyles and trait builds.

**Acceptance Criteria:**
- [ ] Each character has a unique ability with distinct charge mechanic.
- [ ] Each character has an exclusive artifact.
- [ ] Character selection works on the New Game screen.
- [ ] Characters are unlockable via Reputation Shop.
- [ ] All existing combat systems work with new characters (status effects, targeting, animations).

---

## 2. Art & Audio

### 2.1 Asset Pipeline (AI-Generated Pixel Art)

**Priority: High** — Replaces all placeholder graphics with real pixel art.

**Scope:**
- Implement the full pipeline described in [ASSET_PIPELINE.md](./ASSET_PIPELINE.md).
- Pipeline steps: manifest definition → reference generation (IP-Adapter) → frame generation (ControlNet poses) → post-processing (palette snap, outline, transparency, size enforcement, consistency pass) → sprite sheet packing (grid atlas + JSON for Phaser).
- Master palette: 32 colors, western-themed (see ASSET_PIPELINE.md for hex values).
- All assets at native pixel sizes (tiles 32x32, characters 64x64, bosses 96x96, icons 16x16, backgrounds 480x270).
- Tools: Python 3.10+, Pillow, huggingface_hub (free tier). Fallback: ComfyUI local.

**Acceptance Criteria:**
- [ ] `python assets/generate.py` produces all game assets from the manifest with no manual intervention.
- [ ] All generated sprites pass palette snap (32 colors only).
- [ ] Animated sprites have frame-to-frame consistency (IP-Adapter + ControlNet).
- [ ] Sprite sheets load correctly in Phaser with JSON metadata.
- [ ] Placeholder rendering abstraction layer swaps cleanly to sprite-based rendering.
- [ ] Caching works (unchanged assets skip regeneration).
- [ ] `--regenerate`, `--only`, `--dry-run` CLI flags work as documented.

---

### 2.2 Boss Cutscene Animations

**Priority: Medium** — Cinematic pixel art intros for each boss encounter.

**Scope:**
- 3 boss cutscenes (Dusty Dan McGraw, Copperhead Cassidy, Iron Eye Isabella).
- Each cutscene: 2-3 key frames at 480x270, generated via asset pipeline.
- Cutscene playback in CutsceneScene.ts with timed transitions, text reveals, and dramatic pacing.
- Assets pre-loaded when player enters the boss node on the map.

**Acceptance Criteria:**
- [ ] Each boss has a multi-frame pixel art intro cutscene.
- [ ] Cutscenes play automatically before boss combat begins.
- [ ] Text reveals are timed and dramatic (boss name slam).
- [ ] Cutscene assets are pre-loaded (no loading stutter).
- [ ] Player can skip cutscenes.

---

### 2.3 Character & Enemy Sprite Animations

**Priority: Medium** — Replace placeholder state rectangles with animated pixel art sprites.

**Scope:**
- Implement AnimationStateMachine.ts with priority system: Death > Hit/Flinch > Ability > Attack > Block > Heal > Match > Idle.
- Player animations: idle (6f loop), attack (6f), block (3f), heal (4f), hit (4f), death (6f), ability (6f), match (3f).
- Enemy animations: idle (4f loop), attack (4f), block (2f), hit (3f), death (4f), ability (4f).
- One animation at a time. Effects apply mechanically regardless of animation state.
- Pose templates per body type: humanoid, creature_snake, creature_flying, creature_quadruped.

**Acceptance Criteria:**
- [ ] Priority state machine correctly resolves animation conflicts.
- [ ] All player and enemy animations play at correct frame rates and loop settings.
- [ ] Animations trigger on the correct game events (taking damage → hit, dealing damage → attack, etc.).
- [ ] Smooth transitions between animation states (no pops or frame glitches).
- [ ] Sprites render at integer positions on the pixel grid.

---

### 2.4 SFX

**Priority: Low** — Sound effects for combat, UI, and events.

**Scope:**
- Source or generate SFX for: tile matches, cascades, explosions (4-match), Showdown clears, Deadeye shots, enemy attacks, player hit/block, boss phase transitions, UI interactions (menu, shop, map), consumable use, status effect triggers.
- Audio loading and playback via Phaser's audio system.
- Volume controls in Settings.

**Acceptance Criteria:**
- [ ] All major game actions have associated SFX.
- [ ] SFX volume is adjustable in settings (independent of music).
- [ ] SFX do not overlap or clip during rapid cascades.
- [ ] Mute option works correctly.

---

## 3. Meta Systems

### 3.1 Meta Progression (Reputation Shop)

**Priority: High** — Core long-term engagement loop.

**Scope:**
- Reputation earned per run based on score formula: `(Base + Bonus) x Ascension x Time`.
- Reputation Shop (main menu): spend Reputation to unlock content.
- Unlockable categories: new artifacts added to the pool, starting loadouts, cosmetics, events, characters.
- NOT power creep — unlocks expand the option space, not player strength.
- Exact unlock costs TBD via playtesting.
- Reputation and unlocks persist in meta_progression (IndexedDB + Supabase sync).

**Acceptance Criteria:**
- [ ] Reputation awarded at end of each run based on score.
- [ ] Reputation Shop UI shows all unlockable items with costs and locked/unlocked state.
- [ ] Purchasing an unlock deducts Reputation and immediately adds the content to the game pool.
- [ ] Unlocked artifacts appear in future run artifact pools.
- [ ] Unlocked characters appear on character select.
- [ ] Unlocked events appear in event pools.
- [ ] Meta progression syncs correctly between local and remote (additive merge, union of unlocked arrays, max of reputation).

---

### 3.2 Ascension System

**Priority: Medium** — Difficulty scaling for repeat players.

**Scope:**
- Unlocked after first successful run completion.
- Cumulative difficulty modifiers that stack per tier (e.g., enemies +10% HP, less gold, more board manipulation).
- Specific tier modifiers TBD via playtesting.
- Ascension level selected at New Game screen.
- Ascension multiplier affects score: `1.0 + 0.2 x level`.
- highest_ascension_cleared tracked in meta_progression.

**Acceptance Criteria:**
- [ ] Ascension levels selectable on New Game screen (only unlocked levels available).
- [ ] Each tier applies correct cumulative modifiers to enemies, rewards, and board.
- [ ] Ascension multiplier correctly affects end-of-run score.
- [ ] Highest cleared ascension tracked and synced.

---

### 3.3 Leaderboards + Anti-Cheat

**Priority: Low** — Competitive element for endgame players.

**Scope:**
- Leaderboards: Daily, Weekly, All-Time. Top 10 each.
- Scores table already exists in DB schema (scores table with final_score, indexes on score and date).
- Anti-cheat measures: server-side score validation, run integrity checks, replay verification (specifics TBD).
- Display in main menu or dedicated screen.

**Acceptance Criteria:**
- [ ] Leaderboard UI shows Daily / Weekly / All-Time tabs with top 10 scores.
- [ ] Scores submit automatically on run completion (when online).
- [ ] Basic anti-cheat prevents trivially fabricated scores.
- [ ] Leaderboard data refreshes on view.

---

### 3.4 Scoring

**Priority: Medium** — End-of-run feedback and Reputation calculation.

**Scope:**
- Score formula: `Final = (Base + Bonus) x Ascension x Time`.
- Base: Combat 100, Elite 200, Boss 500, Run complete 1000.
- Bonus: Gold earned (1 per gold), Damage dealt (1 per 10 damage), Longest cascade (50 per step), Trait breakpoints (100 each), Flawless fights (150 each).
- Time multiplier: 1.5x at <=45 min, linear to 1.0x at 90 min, no penalty past 90 min.
- ScoreScreen.tsx displays breakdown.

**Acceptance Criteria:**
- [ ] All score components tracked during run.
- [ ] ScoreScreen shows detailed breakdown (base, each bonus category, multipliers, final).
- [ ] Score feeds into Reputation calculation.
- [ ] Scores persist to IndexedDB and sync to Supabase.

---

## 4. Technical & Infrastructure

### 4.1 Mid-Combat Saves

**Priority: Medium** — Players can close the app mid-fight and resume.

**Scope:**
- Serialize full combat state: board layout, tile positions, player HP/block/status, enemy HP/status/intent, ability charge, swap count, cascade state, consumables used this turn.
- Save to IndexedDB on every swap resolution (or on app backgrounding).
- On resume: reconstruct CombatScene from saved state, resume at correct point in turn sequence.
- Sync mid-combat state to Supabase if online.

**Acceptance Criteria:**
- [ ] Closing and reopening the app mid-combat resumes the fight exactly where it left off.
- [ ] Board state, HP, statuses, and enemy intents all restore correctly.
- [ ] No exploits from save/reload (e.g., re-rolling cascades).
- [ ] Works offline (IndexedDB) and syncs when reconnected.

---

### 4.2 PWA Offline

**Priority: Low** — Full offline play via service worker + web app manifest.

**Scope:**
- Service worker caches all game assets, code, and fonts for offline play.
- Web app manifest enables "Add to Home Screen" on mobile.
- Offline indicator in UI.
- All game features work without network (except auth, sync, leaderboards).

**Acceptance Criteria:**
- [ ] Game loads and plays fully offline after first visit.
- [ ] "Add to Home Screen" prompt works on iOS Safari and Android Chrome.
- [ ] Offline saves sync to Supabase when connectivity returns.
- [ ] Cache updates on new deployments without requiring manual clear.

---

### 4.3 Cloudflare Pages Deploy

**Priority: High** — Get the game live.

**Scope:**
- GitHub repo auto-deploys to Cloudflare Pages on push.
- Vite build output served as static site.
- Environment variables for Supabase URL/key configured in Cloudflare dashboard.
- Custom domain setup (if desired).

**Acceptance Criteria:**
- [ ] Push to main triggers automatic build and deploy.
- [ ] Game loads correctly on the deployed URL.
- [ ] Supabase connection works in production.
- [ ] Build size < 2MB initial bundle.

---

## 5. Polish

### 5.1 Cosmetics

**Priority: Low** — Visual customization unlocked via Reputation Shop.

**Scope:**
- Cosmetic options: character skins, tile themes, board frames, background variants.
- Purely visual — no gameplay effect.
- Unlocked and purchased via Reputation Shop.
- Selected in Settings or character select.

**Acceptance Criteria:**
- [ ] At least 1 cosmetic category implemented with multiple options.
- [ ] Cosmetics apply correctly in-game.
- [ ] Cosmetics persist across sessions.
- [ ] Cosmetics sync via meta_progression.

---

### 5.2 Polish (Screenshake, Particles, Juice)

**Priority: Low** — Game feel improvements.

**Scope:**
- Screen shake on big hits, boss phase transitions, explosions. Integer-pixel offsets only (camera position rounded).
- Particle effects using Phaser's particle system with master palette colors (no generated assets needed).
- Juice: tile pop animations on match, bounce on cascade land, flash on crit, pulse on status effect trigger, smooth tweens on HP bar changes.
- All positions remain integer. All effects respect pixel-perfect rendering rules.

**Acceptance Criteria:**
- [ ] Screen shake triggers on appropriate events with configurable intensity.
- [ ] Particle effects use master palette colors only.
- [ ] All juice animations use integer positions (no sub-pixel rendering).
- [ ] Polish effects can be toggled off in Settings (accessibility).
- [ ] 60fps maintained on 3+ year old phones with all effects active.
