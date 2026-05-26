import { useEffect, useRef, useCallback } from 'react';
import { Vibration, AppState } from 'react-native';

const DAY_MAP = { 0: 'D', 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S' };

/**
 * Hook that checks active alarms every 30 seconds while the app is in the foreground.
 * When an alarm matches the current time (hour:minute + day of week), it:
 *  - Vibrates the device (pattern: 3 short bursts)
 *  - Calls `onAlarmTriggered(alerta)` so the UI can show a notification
 *
 * Each alarm only fires once per minute to avoid repeated triggers.
 *
 * @param {Array} alertas - Array of alert objects { id, titulo, hora, dias, activa }
 * @param {Function} onAlarmTriggered - Callback when an alarm fires
 */
export default function useAlarmChecker(alertas, onAlarmTriggered) {
  // Track which alarms have already fired this minute (keyed by "id-HH:MM")
  const firedRef = useRef(new Set());

  const checkAlarms = useCallback(() => {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentDay = DAY_MAP[now.getDay()]; // 0=Sunday → 'D'

    if (!alertas || alertas.length === 0) return;

    for (const alerta of alertas) {
      if (!alerta.activa) continue;

      // Check if this alarm matches the current time and day
      if (alerta.hora === currentTime && alerta.dias.includes(currentDay)) {
        const firedKey = `${alerta.id}-${currentTime}`;

        if (!firedRef.current.has(firedKey)) {
          firedRef.current.add(firedKey);

          // Notify UI first to ensure it shows up even if vibration fails
          if (onAlarmTriggered) {
            onAlarmTriggered(alerta);
          }

          // Vibrate: 3 bursts
          try {
            Vibration.vibrate([0, 400, 200, 400, 200, 400]);
          } catch (e) {
            console.warn('Vibration failed:', e);
          }
        }
      }
    }

    // Clean old keys (only keep keys from the current minute)
    const keysToDelete = [];
    for (const key of firedRef.current) {
      if (!key.endsWith(`-${currentTime}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => firedRef.current.delete(k));
  }, [alertas, onAlarmTriggered]);

  useEffect(() => {
    // Check immediately on mount
    checkAlarms();

    // Set up interval: check every 10 seconds
    const intervalId = setInterval(checkAlarms, 10000);

    // Also check when the app comes back to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAlarms();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [checkAlarms]);
}
