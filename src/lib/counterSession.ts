/**
 * Counter Session Management
 * Allows multiple users/sessions to work on different counters simultaneously
 * Each browser tab/session can be assigned to a different counter
 */

const COUNTER_SESSION_KEY = 'billing_counter_session';

export interface CounterSession {
  counterId: string;
  counterName: string;
  sessionId: string;
  timestamp: number;
}

/**
 * Generate a unique session ID for this browser tab/window
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Set the active counter for the current session
 */
export const setCounterSession = (counterId: string, counterName: string): void => {
  const session: CounterSession = {
    counterId,
    counterName,
    sessionId: generateSessionId(),
    timestamp: Date.now(),
  };
  
  sessionStorage.setItem(COUNTER_SESSION_KEY, JSON.stringify(session));
};

/**
 * Get the active counter session
 */
export const getCounterSession = (): CounterSession | null => {
  const sessionData = sessionStorage.getItem(COUNTER_SESSION_KEY);
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData) as CounterSession;
  } catch {
    return null;
  }
};

/**
 * Clear the counter session
 */
export const clearCounterSession = (): void => {
  sessionStorage.removeItem(COUNTER_SESSION_KEY);
};

/**
 * Check if a counter session is active
 */
export const hasActiveCounterSession = (): boolean => {
  return getCounterSession() !== null;
};
