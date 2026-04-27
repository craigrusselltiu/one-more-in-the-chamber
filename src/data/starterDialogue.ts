import type { CharacterId, LastRunSummary } from '../types/game';

/**
 * NPC name for the pre-run starter encounter.
 * Changing this string retitles the character everywhere it's shown.
 */
export const NPC_NAME = 'Bones';

/** Character-specific greeting from the NPC (first line). */
export const CHARACTER_GREETINGS: Record<CharacterId, string> = {
  red_panda:
    "Well, I'll be. {{yellow:Rust}}. Thought you'd be halfway to the territory by now. Sit a spell before you ride out.",
  reno:
    "{{yellow:Reno}}. You got that look in your eye again -- the one that gets a man buried. Come 'ere.",
  rudy:
    "{{yellow:Rudy}}. You always were the stubborn sort. Watch your back out there.",
  reap:
    "{{yellow:Reap}}. Can't say I'm surprised to see you in these parts.",
  rita:
    "{{yellow:Rita}}. I thought I felt a chill in the air.",
  riff:
    "{{yellow:Riff}}. Play us a tune before you go, would ya?",
};

/** Shared second line that kicks off the offer. */
export const OFFER_INTRO =
  "I put aside a few things for ya. Ain't much, but you'll want 'em before you head out. {{red:Pick one}}.";

/** Line referencing the previous run's outcome. Shown after the greeting when available. */
export function buildLastRunLine(summary: LastRunSummary): string {
  if (summary.outcome === 'victory') {
    return "Heard you rode all the way through last time. Whole town's still talkin'. Don't let it go to your head.";
  }
  const where = `Act ${summary.actReached}`;
  if (summary.deathCause) {
    return `Heard about ${where}. ${summary.deathCause} got you, is what they said. Rough way to go.`;
  }
  return `Heard you didn't make it past ${where} last time. Shake it off.`;
}

/** Final send-off shown after a choice is applied. */
export const SENDOFF_LINE = "Go on. Don't look back. I'll keep a seat warm.";
