import { memo } from 'react';

/**
 * EventScreen: narrative encounter with choices.
 */
export const EventScreen = memo(function EventScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e]/90">
      <h2 className="text-xl text-amber-400 font-mono mb-4">Event</h2>
      <p className="text-stone-400 font-mono text-sm">Events coming soon</p>
    </div>
  );
});
