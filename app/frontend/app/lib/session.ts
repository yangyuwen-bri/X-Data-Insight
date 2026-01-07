import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'x_data_insight_session_id';

export const getSessionId = (): string => {
    if (typeof window === 'undefined') return ''; // Server-side check

    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
};
