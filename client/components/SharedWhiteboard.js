'use client';

import dynamic from 'next/dynamic';
import styles from './SharedWhiteboard.module.css';

// Dynamically import the ExcalidrawWrapper with SSR disabled
// This is required because Excalidraw does not support server-side rendering
const ExcalidrawBoard = dynamic(
    () => import('./ExcalidrawWrapper'),
    {
        ssr: false,
        loading: () => (
            <div className={styles.overlay}>
                <div className={styles.container}>
                    <div className={styles.loading}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading whiteboard...</p>
                    </div>
                </div>
            </div>
        ),
    }
);

export default function SharedWhiteboard({ isOpen, onClose, socket, roomId }) {
    if (!isOpen) return null;
    return <ExcalidrawBoard isOpen={isOpen} onClose={onClose} socket={socket} roomId={roomId} />;
}
