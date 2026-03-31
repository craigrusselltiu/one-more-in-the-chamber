# Asset Pipeline

**Status: Post-MVP.** The MVP uses placeholder graphics (colored rectangles + text labels). This pipeline replaces those placeholders with AI-generated pixel art.

## Philosophy

**One command. No manual intervention. Game-ready output.**

Define what you need in a manifest. Run `python assets/generate.py`. Get sprite sheets that Phaser can load directly. No Blender, no Aseprite, no cherry-picking from outputs.

Visual cohesion is enforced by **constraints** (locked palette, fixed resolution, consistent prompting, aggressive post-processing), not by manual cleanup.

---

## Pixel Grid

Every sprite in the game must sit on the same pixel grid. If a character is rendered at a different "native pixel size" than the board tiles, or if anything lands at a fractional coordinate, the pixel art illusion breaks (blurry edges, inconsistent pixel sizes, shimmer during animation).

**The fix is simple: one internal resolution, integer math, no exceptions.**

### Internal Resolution

The game renders at **480x270** (landscape, 16:9). This is the grid. Every asset is authored to fit this grid. The canvas is then integer-scaled (2x, 3x, 4x) to fill the display, with letterboxing for any remainder.

### Asset Sizes (all on-grid)

Every asset dimension is a multiple of 2 and divides cleanly into the 480x270 grid:

| Asset | Size | Grid fit |
|---|---|---|
| Board tile | 32x32 | 8x8 board = 256x256. Centered in 480px width, ~112px each side for characters. |
| Player sprite | 64x64 | Fits in left character area. 2x2 tiles. |
| Enemy sprite | 64x64 | Fits in right character area. Up to 3 stacked. |
| Boss sprite | 96x96 | Larger enemy. 3x3 tiles. |
| Status icon | 16x16 | Half a tile. Aligns to half-tile grid. |
| UI icon | 16x16 | Same. |
| Background | 480x270 | Exact internal resolution. Fills screen. |
| Cutscene frame | 480x270 | Same. |

**All sizes in the manifest must match these.** The post-processing step enforces exact dimensions (nearest-neighbor resize + center if needed).

### Why This Matters for the Pipeline

The pipeline generates at the exact target size specified in the manifest. No upscaling, no downscaling after generation. A 32x32 tile is generated as 32x32 pixels. A 64x64 character is generated as 64x64 pixels. The palette snap and outline passes operate at this native size.

If we generated at higher resolution and downscaled, we'd lose control of individual pixels. By generating at native size, every pixel is intentional.

---

## Pipeline Overview

```
assets/manifest.json                (you define what you need)
    |
    v
[1] Reference Generation           (one hero image per character, via AI API)
    |
    v
[2] Frame Generation                (reference + pose template --> animation frames)
    |
    v
[3] Post-Processing                 (palette snap, outline, cleanup -- fully automated)
    |
    v
[4] Sprite Sheet Packing            (grid atlas + JSON metadata for Phaser)
    |
    v
public/assets/sprites/              (game-ready output, load directly in Phaser)
```

Every step is scripted. The only human input is the manifest.

---

## Prerequisites

| Tool | Purpose | Required |
|---|---|---|
| Python 3.10+ | Pipeline orchestrator | Yes |
| Pillow (PIL) | Image post-processing | Yes |
| `huggingface_hub` | AI image generation (free) | Yes |

**AI API: Hugging Face Inference API (free tier)**

| | |
|---|---|
| **Models** | SDXL, ControlNet, IP-Adapter -- all hosted on the Hub |
| **Cost** | Free. No credit card. Rate-limited but fine for batch asset generation. |
| **Auth** | Free HF account + API token |
| **SDK** | `huggingface_hub` Python package |
| **Fallback** | ComfyUI (local, free, needs GPU 8GB+ VRAM) for unlimited generation |

The free tier is sufficient for the full game asset set (~500-800 images). Rate limits add latency but the pipeline handles retries and batching automatically.

---

## The Manifest

`assets/manifest.json` defines every asset the game needs. The pipeline reads this and generates everything.

```json
{
  "palette": "assets/palette.png",
  "output_dir": "public/assets/sprites",

  "characters": [
    {
      "id": "red_panda",
      "description": "small red panda wearing a cowboy hat, poncho, and boots. scrappy and expressive. side view.",
      "size": [64, 64],
      "type": "humanoid",
      "animations": {
        "idle":    { "frames": 6, "loop": true },
        "attack":  { "frames": 6, "loop": false },
        "block":   { "frames": 3, "loop": false },
        "heal":    { "frames": 4, "loop": false },
        "hit":     { "frames": 4, "loop": false },
        "death":   { "frames": 6, "loop": false },
        "ability": { "frames": 6, "loop": false },
        "match":   { "frames": 3, "loop": false }
      }
    }
  ],

  "enemies": [
    {
      "id": "coyote",
      "description": "scraggly coyote standing upright, bandit vest, mean grin. side view facing left.",
      "size": [64, 64],
      "type": "humanoid",
      "animations": {
        "idle":    { "frames": 4, "loop": true },
        "attack":  { "frames": 4, "loop": false },
        "block":   { "frames": 2, "loop": false },
        "hit":     { "frames": 3, "loop": false },
        "death":   { "frames": 4, "loop": false },
        "ability": { "frames": 4, "loop": false }
      }
    },
    {
      "id": "rattlesnake",
      "description": "coiled rattlesnake with fangs bared, dusty desert coloring. side view facing left.",
      "size": [64, 64],
      "type": "creature",
      "animations": {
        "idle":    { "frames": 4, "loop": true },
        "attack":  { "frames": 4, "loop": false },
        "block":   { "frames": 2, "loop": false },
        "hit":     { "frames": 3, "loop": false },
        "death":   { "frames": 4, "loop": false },
        "ability": { "frames": 4, "loop": false }
      }
    }
  ],

  "tiles": [
    { "id": "bullet",    "description": "brass bullet cartridge",         "size": [32, 32] },
    { "id": "iron",      "description": "iron shield with rivets",        "size": [32, 32] },
    { "id": "gold",      "description": "gold coin with star stamp",      "size": [32, 32] },
    { "id": "ricochet",  "description": "bullet with motion lines bouncing", "size": [32, 32] },
    { "id": "smoke",     "description": "wispy smoke cloud",              "size": [32, 32] },
    { "id": "dynamite",  "description": "stick of dynamite with lit fuse","size": [32, 32] },
    { "id": "stampede",  "description": "horseshoe with dust cloud trail","size": [32, 32] },
    { "id": "whiskey",   "description": "whiskey bottle with cork",       "size": [32, 32] },
    { "id": "buckshot",  "description": "shotgun shell, red casing",      "size": [32, 32] },
    { "id": "ace",       "description": "ace of spades playing card",     "size": [32, 32] },
    { "id": "venom",     "description": "green venom droplet with fang",  "size": [32, 32] },
    { "id": "ember",     "description": "glowing ember with small flame", "size": [32, 32] },
    { "id": "horseshoe", "description": "lucky horseshoe, golden",        "size": [32, 32] }
  ],

  "ui": [
    { "id": "status_block",      "description": "small shield icon",           "size": [16, 16] },
    { "id": "status_dodge",      "description": "small mist/smoke icon",       "size": [16, 16] },
    { "id": "status_ace",        "description": "small playing card icon",     "size": [16, 16] },
    { "id": "status_crit",       "description": "small crosshair icon",       "size": [16, 16] },
    { "id": "status_thorns",     "description": "small barbed wire icon",     "size": [16, 16] },
    { "id": "status_venom",      "description": "small poison drop icon",     "size": [16, 16] },
    { "id": "status_vulnerable", "description": "small cracked shield icon",  "size": [16, 16] }
  ],

  "backgrounds": [
    { "id": "act1_combat", "description": "dusty desert trail at sunset, cacti, distant mesas", "size": [480, 270] },
    { "id": "act2_combat", "description": "dark canyon interior, mine cart tracks, lantern glow", "size": [480, 270] },
    { "id": "act3_combat", "description": "old western town main street, saloon, water tower",   "size": [480, 270] }
  ],

  "cutscenes": [
    {
      "id": "boss_dusty",
      "frames": [
        "ridge at sunset, coyote silhouettes on horizon, dramatic lighting",
        "close-up of large coyote with tattered bandana, arms crossed, smirking",
        "text card: DUSTY DAN McGRAW, bold western font, dark background"
      ],
      "size": [480, 270]
    }
  ]
}
```

Add new assets by adding entries to the manifest. Regenerate by running the pipeline again.

---

## Master Palette

The single most important consistency tool. Every pixel in the game maps to one of these colors. Defined once in `assets/palette.png` (a 1-pixel-tall image with one pixel per color).

**32 colors, western-themed:**

| Category | Colors | Hex examples |
|---|---|---|
| Skin/fur (4) | Red panda orange-browns | `#D2775A` `#A85535` `#7A3522` `#4A1E14` |
| Earth (5) | Dust, wood, leather, sand | `#E8C170` `#C49A48` `#8B6830` `#5C4020` `#3A2510` |
| Green (3) | Cactus, sage, poison | `#6B8C42` `#4A6B28` `#2D4A1A` |
| Blue (4) | Sky, steel, smoke, night | `#87CEEB` `#5A8FA8` `#3D6478` `#1A2C3D` |
| Warm (4) | Gold, fire, sunset, ember | `#FFD700` `#E8A020` `#D05030` `#A02020` |
| Dark (3) | Outlines, deep shadow, black | `#3A3040` `#201820` `#0A0808` |
| Light (3) | Highlights, flash, bone | `#FFFBE6` `#E0D8C8` `#B8AFA0` |
| Accent (3) | Red damage, green heal, purple | `#FF4040` `#40D840` `#9060C0` |
| UI (3) | Pure white, mid gray, UI dark | `#FFFFFF` `#808080` `#404040` |

This palette is tunable. Change it, re-run the pipeline, and every asset updates.

---

## Generation Strategies

### Characters and Enemies (animated)

The hardest problem: **frame-to-frame consistency**. Solved with a two-pass approach.

**Pass 1 — Reference image.**

Generate a single high-quality image of the character in a neutral standing pose. This image becomes the visual anchor for all frames.

```
Prompt: "pixel art, [character description], standing neutral pose,
         side view, [palette colors], clean lines, game sprite,
         transparent background, 32-color pixel art"
```

The pipeline generates 4 candidates and auto-selects the one with the best palette match (lowest color distance to the master palette after snapping).

**Pass 2 — Animation frames.**

For each frame of each animation, generate using:

- **IP-Adapter / character reference**: The reference image from Pass 1. This locks the character's appearance (proportions, colors, clothing, features).
- **ControlNet pose**: A pre-defined pose skeleton for this specific animation frame. Stored as stick-figure PNGs in `assets/poses/`.
- **Prompt**: Same base prompt + animation-specific action text.

```
Prompt: "pixel art, [character description], [action: e.g. 'swinging sword overhead'],
         side view, [palette colors], clean lines, game sprite,
         transparent background, 32-color pixel art"

Reference: assets/refs/red_panda.png    (IP-Adapter input)
Pose:      assets/poses/humanoid/attack_03.png  (ControlNet input)
```

The combination of IP-Adapter (locks appearance) + ControlNet (locks pose) + consistent prompt (locks style) produces frames that are consistent enough for pixel art. Post-processing handles the rest.

### Pre-defined Pose Templates

Stored in `assets/poses/`. One set per body type. Reused for every character of that type.

```
assets/poses/
├── humanoid/              # Red panda, bandits, deputies, bosses
│   ├── idle_01.png ... idle_06.png
│   ├── attack_01.png ... attack_06.png
│   ├── block_01.png ... block_03.png
│   ├── hit_01.png ... hit_04.png
│   ├── death_01.png ... death_06.png
│   ├── ability_01.png ... ability_06.png
│   ├── heal_01.png ... heal_04.png
│   └── match_01.png ... match_03.png
├── creature_snake/        # Rattlesnake, Copperhead
│   ├── idle_01.png ... idle_04.png
│   └── ...
├── creature_flying/       # Vulture, Cave Bats
│   ├── idle_01.png ... idle_04.png
│   └── ...
└── creature_quadruped/    # Coyote
    ├── idle_01.png ... idle_04.png
    └── ...
```

These pose templates are simple stick-figure images (OpenPose format: colored lines connecting keypoints). Created once by the pipeline's init command (AI-generated from pose descriptions, or hand-drawn — they're just stick figures).

### Tiles (static)

Single image generation per tile. No animation, no reference needed.

```
Prompt: "pixel art icon, [tile description], 32x32, [palette colors],
         clean lines, game item sprite, transparent background"
```

Generate 4 candidates, auto-select best palette match. One image per tile.

### UI Icons (static)

Same as tiles but at 16x16. Simpler shapes, fewer details.

### Backgrounds

Generated at target resolution (480x270). Higher detail than sprites but still pixel art styled.

```
Prompt: "pixel art background, [scene description], [palette colors],
         horizontal composition, no characters, game background"
```

Single generation per background. Post-processed with palette snap.

### Boss Cutscene Frames

Full-scene illustrations. Generated at 480x270. Each cutscene has 2-3 key frames defined in the manifest.

```
Prompt: "pixel art cinematic scene, [frame description], dramatic lighting,
         [palette colors], widescreen composition, western"
```

### Effects

**Not generated by the pipeline.** Effects (explosions, muzzle flash, cascades, particles) are handled by Phaser's particle system at runtime using the master palette colors. This looks better than static sprites and requires zero asset generation.

---

## Post-Processing

Fully automated. Applied to every generated image.

### Step 1: Palette Snap

Every pixel in the image is mapped to the nearest color in the master palette (Euclidean distance in RGB space). This is the primary consistency enforcer — even if AI outputs vary in color, they all converge to the same 32 colors.

### Step 2: Outline Enforcement

Detect edges (adjacent pixels with high contrast). Replace edge pixels with the darkest palette color. Produces consistent 1px outlines on all sprites.

### Step 3: Transparency Cleanup

Threshold the background to pure transparent. Remove stray semi-transparent pixels. Ensure clean sprite boundaries.

### Step 4: Size Enforcement

Resize to exact target dimensions (nearest-neighbor scaling, no anti-aliasing). Center the sprite in the frame if needed.

### Step 5: Consistency Pass (animated sprites only)

Compare all frames of an animation sequence. If any frame is an outlier (color histogram deviates >30% from the median), regenerate that specific frame. This catches rare AI failures automatically.

---

## Sprite Sheet Packing

After post-processing, frames are packed into grid-based sprite sheets with JSON metadata for Phaser.

**Output per animated entity:**

```
public/assets/sprites/characters/red_panda.png     # Grid sprite sheet
public/assets/sprites/characters/red_panda.json    # Frame metadata
```

**Sprite sheet layout:** all frames in a single row per animation, animations stacked vertically.

```
[ idle_01 ][ idle_02 ][ idle_03 ][ idle_04 ][ idle_05 ][ idle_06 ]
[ attack_01 ][ attack_02 ][ attack_03 ][ attack_04 ][ attack_05 ][ attack_06 ]
[ block_01 ][ block_02 ][ block_03 ]
[ hit_01 ][ hit_02 ][ hit_03 ][ hit_04 ]
[ death_01 ][ death_02 ][ death_03 ][ death_04 ][ death_05 ][ death_06 ]
...
```

**JSON metadata format (Phaser-compatible):**

```json
{
  "id": "red_panda",
  "frameWidth": 64,
  "frameHeight": 64,
  "animations": {
    "idle":    { "start": 0,  "end": 5,  "frameRate": 8,  "loop": true },
    "attack":  { "start": 6,  "end": 11, "frameRate": 12, "loop": false },
    "block":   { "start": 12, "end": 14, "frameRate": 10, "loop": false },
    "hit":     { "start": 15, "end": 18, "frameRate": 10, "loop": false },
    "death":   { "start": 19, "end": 24, "frameRate": 8,  "loop": false },
    "ability": { "start": 25, "end": 30, "frameRate": 10, "loop": false },
    "heal":    { "start": 31, "end": 34, "frameRate": 8,  "loop": false },
    "match":   { "start": 35, "end": 37, "frameRate": 10, "loop": false }
  }
}
```

**Output for static assets (tiles, icons):** individual PNGs, no sprite sheet needed.

```
public/assets/sprites/tiles/bullet.png
public/assets/sprites/tiles/iron.png
public/assets/sprites/ui/status_block.png
...
```

---

## Directory Structure

```
assets/
├── generate.py              # Main entry point
├── manifest.json            # Asset manifest
├── palette.png              # Master palette (32 colors)
├── config.py                # HF token, generation params
├── steps/
│   ├── reference.py         # Pass 1: generate reference images
│   ├── frames.py            # Pass 2: generate animation frames
│   ├── static.py            # Generate tiles, icons, backgrounds, cutscenes
│   ├── postprocess.py       # Palette snap, outline, cleanup
│   └── pack.py              # Sprite sheet assembly + JSON metadata
├── poses/                   # Pre-defined pose templates (ControlNet input)
│   ├── humanoid/
│   ├── creature_snake/
│   ├── creature_flying/
│   └── creature_quadruped/
├── refs/                    # Generated reference images (cached)
│   ├── red_panda.png
│   ├── coyote.png
│   └── ...
└── temp/                    # Intermediate files (auto-cleaned)
```

---

## Running

```bash
# Generate everything defined in the manifest
python assets/generate.py

# Generate only a specific category
python assets/generate.py --only characters
python assets/generate.py --only tiles
python assets/generate.py --only enemies

# Regenerate a specific asset (by id)
python assets/generate.py --regenerate red_panda
python assets/generate.py --regenerate bullet

# Regenerate a specific animation of a specific character
python assets/generate.py --regenerate red_panda:attack

# Regenerate only the reference image (forces all frames to regenerate too)
python assets/generate.py --regenerate red_panda --new-reference

# Dry run: show what would be generated without calling the API
python assets/generate.py --dry-run
```

### First Run

```bash
# 1. Install dependencies
pip install pillow huggingface_hub

# 2. Set API token (free -- sign up at huggingface.co)
export HF_TOKEN=hf_your_token_here

# 3. Generate all assets
python assets/generate.py
```

First full generation takes ~20-40 minutes (free tier rate limits). Subsequent runs skip cached assets and only generate new/changed entries.

---

## Caching and Iteration

- **Reference images** are cached in `assets/refs/`. They persist across runs. Only regenerated with `--new-reference`.
- **Generated frames** are cached by content hash of (prompt + reference + pose). If the manifest description hasn't changed, frames aren't regenerated.
- **Post-processed outputs** are re-run every time (fast, <1 second per asset).
- To iterate on a character's look: update the `description` in the manifest, run with `--regenerate [id] --new-reference`. New reference = new look, all frames regenerate to match.

---

## Quality Controls

| Problem | Automated solution |
|---|---|
| Color drift between frames | Palette snap forces all frames to same 32 colors. |
| Proportion drift between frames | IP-Adapter reference locks body shape. ControlNet locks pose. |
| Inconsistent outlines | Post-process outline enforcement pass. |
| Bad generation (rare) | Consistency pass auto-detects and regenerates outlier frames. |
| Wrong pose | Pre-defined pose templates are reused per body type. |
| Background bleed | Transparency cleanup removes all non-sprite pixels. |

At 32-64px with a 32-color palette, these automated controls produce results that look hand-crafted. The low resolution is an asset — it hides the kinds of inconsistencies that would be visible at higher resolutions.

---

## Integration with Phaser

Loading generated assets in the game:

```typescript
// In BootScene.ts -- load sprite sheets
this.load.spritesheet('red_panda',
  'assets/sprites/characters/red_panda.png',
  { frameWidth: 64, frameHeight: 64 }
);

// Load the JSON metadata
this.load.json('red_panda_data', 'assets/sprites/characters/red_panda.json');

// In CombatScene.ts -- create animations from metadata
const data = this.cache.json.get('red_panda_data');
for (const [key, anim] of Object.entries(data.animations)) {
  this.anims.create({
    key: `red_panda_${key}`,
    frames: this.anims.generateFrameNumbers('red_panda', {
      start: anim.start,
      end: anim.end
    }),
    frameRate: anim.frameRate,
    repeat: anim.loop ? -1 : 0
  });
}

// Play an animation
sprite.play('red_panda_idle');
```

Tiles and UI icons are loaded as individual images:

```typescript
this.load.image('tile_bullet', 'assets/sprites/tiles/bullet.png');
this.load.image('status_block', 'assets/sprites/ui/status_block.png');
```
