import { memo } from 'react';
import { EventBus, GameEvent } from '../../game/EventBus';
import { useSettingsStore } from '../../store/settingsStore';
import type { Screen } from '../../App';

const MENU_FONT = 'monospace';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3 px-4 bg-transparent border-none outline-none text-left group"
      style={{ fontFamily: MENU_FONT, cursor: 'pointer' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-stone-200">{label}</span>
        <span className="text-xs text-stone-500">{description}</span>
      </div>
      <div
        className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ml-4"
        style={{
          backgroundColor: checked ? '#b45309' : '#44403c',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: checked ? '#fbbf24' : '#78716c',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  );
}

export const SettingsScreen = memo(function SettingsScreen() {
  const screenShakeEnabled = useSettingsStore((s) => s.screenShakeEnabled);
  const juiceAnimationsEnabled = useSettingsStore((s) => s.juiceAnimationsEnabled);
  const setScreenShake = useSettingsStore((s) => s.setScreenShake);
  const setJuiceAnimations = useSettingsStore((s) => s.setJuiceAnimations);

  const handleBack = () => {
    EventBus.emit(GameEvent.SCREEN_CHANGE, 'main-menu' satisfies Screen);
  };

  return (
    <div className="flex flex-col items-center h-full bg-[#1a1a2e]/95">
      {/* Header */}
      <div className="mt-6 mb-4 text-center">
        <h2
          className="text-xl text-amber-400"
          style={{ fontFamily: MENU_FONT, letterSpacing: '1px' }}
        >
          Settings
        </h2>
      </div>

      {/* Settings list */}
      <div className="w-full max-w-[400px] px-4">
        <div className="border border-stone-700 bg-stone-800/30 divide-y divide-stone-700/50">
          <Toggle
            label="Screen Shake"
            description="Camera shake on big hits and cascades"
            checked={screenShakeEnabled}
            onChange={setScreenShake}
          />
          <Toggle
            label="Juice Animations"
            description="Tile pop, bounce, particles, and flash effects"
            checked={juiceAnimationsEnabled}
            onChange={setJuiceAnimations}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back button */}
      <div className="py-3">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-stone-700/50 text-stone-300 font-mono text-sm border border-stone-600 hover:bg-stone-600/50"
          style={{ fontFamily: MENU_FONT, cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
    </div>
  );
});
