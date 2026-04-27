import { create } from 'zustand';
import { useMetaStore } from './metaStore';
import { useSettingsStore } from './settingsStore';

export interface TutorialStep {
  text: string;
  /** Optional spotlight rectangle in 960x540 virtual coordinates. */
  spotlight?: { x: number; y: number; width: number; height: number };
  /** Spotlight rectangle in actual viewport pixels, anchored to a corner.
   *  Use this when the highlighted element is positioned in screen-coords
   *  outside the 960x540 design space (e.g. seed input, version label,
   *  viewport-anchored character tabs). Specify exactly one of left/right
   *  and one of top/bottom for the anchor edges. */
  viewportSpotlight?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    vCenter?: boolean;
    hCenter?: boolean;
    applyScale?: boolean;
    width: number;
    height: number;
  };
  /** Force tooltip placement direction. Auto-calculated if omitted.
   *  'center' anchors the dialog to the middle of the screen regardless of
   *  the spotlight position (useful for screen-wide intro steps). */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Show a "skip all tutorials" option on this step. */
  showSkip?: boolean;
}

export interface TutorialSequence {
  id: string;
  steps: TutorialStep[];
  /** Next tutorial to auto-start after this one completes. */
  nextTutorial?: TutorialSequence;
}

interface TutorialStore {
  activeSequence: TutorialSequence | null;
  stepIndex: number;
  startTutorial: (sequence: TutorialSequence) => void;
  advanceStep: () => void;
  dismissTutorial: () => void;
}

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  activeSequence: null,
  stepIndex: 0,

  startTutorial: (sequence) => {
    if (!useSettingsStore.getState().tutorialsEnabled) return;
    if (useMetaStore.getState().isTutorialComplete(sequence.id)) return;
    set({ activeSequence: sequence, stepIndex: 0 });
  },

  advanceStep: () => {
    const { activeSequence, stepIndex } = get();
    if (!activeSequence) return;
    const nextIndex = stepIndex + 1;
    if (nextIndex >= activeSequence.steps.length) {
      useMetaStore.getState().markTutorialComplete(activeSequence.id);
      const next = activeSequence.nextTutorial;
      set({ activeSequence: null, stepIndex: 0 });
      if (next) {
        setTimeout(() => get().startTutorial(next), 0);
      }
    } else {
      set({ stepIndex: nextIndex });
    }
  },

  dismissTutorial: () => {
    set({ activeSequence: null, stepIndex: 0 });
  },
}));
