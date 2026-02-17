'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './WatchTogether.module.css';

function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
        const match = url.match(p);
        if (match) return match[1];
    }
    return null;
}

export default function WatchTogether({ isOpen, onClose, socket, roomId }) {
    const [urlInput, setUrlInput] = useState('');
    const [videoId, setVideoId] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const playerRef = useRef(null);
    const iframeRef = useRef(null);

    // Listen for partner's sync events
    useEffect(() => {
        if (!socket) return;

        const handleWatchSync = (data) => {
            if (data.type === 'load') {
                setVideoId(data.videoId);
                setUrlInput('');
            } else if (data.type === 'stop') {
                setVideoId(null);
            }
        };

        socket.on('receive-watch', handleWatchSync);
        return () => socket.off('receive-watch', handleWatchSync);
    }, [socket]);

    const loadVideo = useCallback(() => {
        const id = extractVideoId(urlInput);
        if (!id) return;
        setVideoId(id);
        setUrlInput('');

        // Sync with partner
        if (socket && roomId) {
            socket.emit('send-watch', {
                roomId,
                type: 'load',
                videoId: id,
            });
        }
    }, [urlInput, socket, roomId]);

    const stopVideo = () => {
        setVideoId(null);
        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'stop' });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') loadVideo();
    };

    if (!isOpen && !videoId) return null;

    // Minimized player (when main panel is closed but video is playing)
    if (!isOpen && videoId) {
        return (
            <div className={styles.miniPlayer}>
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    className={styles.miniIframe}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                />
                <button className={styles.miniClose} onClick={stopVideo}>✕</button>
            </div>
        );
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.panel} ${videoId ? styles.panelWide : ''}`} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span className={styles.headerIcon}>📺</span>
                    <span className={styles.headerTitle}>Watch Together</span>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {!videoId ? (
                    <div className={styles.inputArea}>
                        <p className={styles.hint}>Paste a YouTube link to watch together! 🍿</p>
                        <div className={styles.urlRow}>
                            <input
                                type="text"
                                className={styles.urlInput}
                                placeholder="https://youtube.com/watch?v=..."
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className={styles.loadBtn}
                                onClick={loadVideo}
                                disabled={!extractVideoId(urlInput)}
                            >
                                ▶ Play
                            </button>
                        </div>
                        <div className={styles.suggestions}>
                            <p className={styles.suggestTitle}>Quick picks:</p>
                            <div className={styles.suggestBtns}>
                                {[
                                    { label: '🎵 Lo-fi Music', id: 'jfKfPfyJRdk' },
                                    { label: '🌅 Relaxing', id: '5qap5aO4i9A' },
                                    { label: '🌧️ Rain Sounds', id: 'mPZkdNFkNps' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        className={styles.suggestBtn}
                                        onClick={() => { setUrlInput(s.id); }}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.videoArea}>
                        <div className={styles.videoWrapper}>
                            <iframe
                                ref={iframeRef}
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                className={styles.videoIframe}
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                            />
                        </div>
                        <div className={styles.videoControls}>
                            <button className={styles.stopBtn} onClick={stopVideo}>
                                ⏹ Stop Watching
                            </button>
                            <button className={styles.minimizeBtn} onClick={() => { setIsMinimized(true); onClose(); }}>
                                ↙ Minimize
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
