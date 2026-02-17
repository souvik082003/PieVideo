import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Prevent duplicate sockets during Next.js HMR (Hot Module Replacement).
// Without this, each hot reload creates a new socket connection while the old
// one stays alive — causing duplicate users and broken signaling.
function getSocket() {
    if (typeof window === 'undefined') return null;

    if (!globalThis.__videoCallSocket) {
        globalThis.__videoCallSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        globalThis.__videoCallSocket.on('connect', () => {
            console.log('[Socket] Connected:', globalThis.__videoCallSocket.id);
        });

        globalThis.__videoCallSocket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        globalThis.__videoCallSocket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });
    }

    return globalThis.__videoCallSocket;
}

const socket = getSocket();
export default socket;
