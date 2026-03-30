import { useEffect } from 'react';
import { EventBus } from '../../game/EventBus';

type Listener = (...args: unknown[]) => void;

/**
 * Subscribe to an EventBus event for the lifetime of a component.
 * Automatically cleans up on unmount.
 */
export function useEventBus(event: string, handler: Listener): void {
  useEffect(() => {
    EventBus.on(event, handler);
    return () => {
      EventBus.off(event, handler);
    };
  }, [event, handler]);
}
