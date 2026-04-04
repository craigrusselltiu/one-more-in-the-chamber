# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v0.1.0

### Added

- Deadeye ability bar: 10-segment meter spanning full board width (RED when charging, YELLOW with pulsing glow when ready, gold dots for active shots)
- Deadeye shot VFX: enhanced particle explosion (tile color + white mix), bullet hole fade effect, light screen shake per shot
- Gunshot SFX infrastructure for Deadeye shots (requires `gunshot.wav` in `public/assets/audio/sfx/`)
- Deadeye + Explosive interaction: shooting an explosive tile detonates its 3x3 area
- Deadeye + Bounty interaction spec (pending Bounty tile implementation)
- `deadeyeMaxShots` plumbed through CombatState, combatStore, and AbilityMeter for dynamic shot count display
