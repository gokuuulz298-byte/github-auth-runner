/**
 * Counter Session Management
 * Allows multiple users/sessions to work on different counters simultaneously
 * Each browser tab/window gets a unique TAB_ID stored in sessionStorage.
 * The counter session key is namespaced by TAB_ID so that opening the same
 * URL in multiple tabs results in completely independent sessions with no
 * cross-tab conflicts.
 */

// Each tab gets a unique ID so concurrent tabs have isolated sessions
const getTabId = (): string => {
  let tabId = sessionStorage.getItem('billing_tab_id');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('billing_tab_id', tabId);
  }
  return tabId;
};

const getCounterSessionKey = (): string => {
  return `billing_counter_session_${getTabId()}`;
};

export interface CounterSession {
  counterId: string;
  counterName: string;
  sessionId: string;
  tabId: string;
  timestamp: number;
}

/**
 * Generate a unique session ID for this browser tab/window
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Set the active counter for the current session (tab-isolated)
 */
export const setCounterSession = (counterId: string, counterName: string): void => {
  const tabId = getTabId();
  const session: CounterSession = {
    counterId,
    counterName,
    sessionId: generateSessionId(),
    tabId,
    timestamp: Date.now(),
  };
  
  sessionStorage.setItem(getCounterSessionKey(), JSON.stringify(session));
};

/**
 * Get the active counter session (tab-isolated)
 */
export const getCounterSession = (): CounterSession | null => {
  const sessionData = sessionStorage.getItem(getCounterSessionKey());
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData) as CounterSession;
  } catch {
    return null;
  }
};

/**
 * Clear the counter session for the current tab
 */
export const clearCounterSession = (): void => {
  sessionStorage.removeItem(getCounterSessionKey());
};

/**
 * Check if a counter session is active for the current tab
 */
export const hasActiveCounterSession = (): boolean => {
  return getCounterSession() !== null;
};

/**
 * Get the current tab's unique identifier
 */
export const getTabSessionId = (): string => {
  return getTabId();
};
