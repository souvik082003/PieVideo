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

function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch { return false; }
}

export default function WatchTogether({ isOpen, onClose, socket, roomId, myStream, remoteUsers }) {
    const [urlInput, setUrlInput] = useState('');
    const [videoId, setVideoId] = useState(null);
    const [genericUrl, setGenericUrl] = useState(null); // For non-YouTube URLs
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isWatchParty, setIsWatchParty] = useState(false);
    const [liveReactions, setLiveReactions] = useState([]);
    const reactionIdRef = useRef(0);
    const iframeRef = useRef(null);

    const partyEmojis = ['🔥', '🎉', '👏', '⚽', '🏏', '😱', '❤️', '💪'];

    // Listen for partner's sync events
    useEffect(() => {
        if (!socket) return;

        const handleWatchSync = (data) => {
            if (data.type === 'load') {
                if (data.videoId) {
                    setVideoId(data.videoId);
                    setGenericUrl(null);
                } else if (data.genericUrl) {
                    setGenericUrl(data.genericUrl);
                    setVideoId(null);
                }
                setUrlInput('');
            } else if (data.type === 'stop') {
                setVideoId(null);
                setGenericUrl(null);
                setIsTheaterMode(false);
                setIsWatchParty(false);
            } else if (data.type === 'theater') {
                setIsTheaterMode(data.enabled);
            } else if (data.type === 'party') {
                setIsWatchParty(data.enabled);
            }
        };

        const handleWatchReaction = (data) => {
            spawnReaction(data.emoji, false);
        };

        socket.on('receive-watch', handleWatchSync);
        socket.on('receive-watch-reaction', handleWatchReaction);
        return () => {
            socket.off('receive-watch', handleWatchSync);
            socket.off('receive-watch-reaction', handleWatchReaction);
        };
    }, [socket]);

    // Spawn floating reaction
    const spawnReaction = useCallback((emoji, broadcast = true) => {
        const id = ++reactionIdRef.current;
        const left = 10 + Math.random() * 80; // random horizontal position
        setLiveReactions(prev => [...prev, { id, emoji, left }]);
        setTimeout(() => {
            setLiveReactions(prev => prev.filter(r => r.id !== id));
        }, 2500);

        if (broadcast && socket && roomId) {
            socket.emit('send-watch-reaction', { roomId, emoji });
        }
    }, [socket, roomId]);

    const loadVideo = useCallback(() => {
        const youtubeId = extractVideoId(urlInput);
        if (youtubeId) {
            setVideoId(youtubeId);
            setGenericUrl(null);
            setUrlInput('');
            if (socket && roomId) {
                socket.emit('send-watch', { roomId, type: 'load', videoId: youtubeId });
            }
        } else if (isValidUrl(urlInput)) {
            setGenericUrl(urlInput);
            setVideoId(null);
            setUrlInput('');
            if (socket && roomId) {
                socket.emit('send-watch', { roomId, type: 'load', genericUrl: urlInput });
            }
        }
    }, [urlInput, socket, roomId]);

    const stopVideo = () => {
        setVideoId(null);
        setGenericUrl(null);
        setIsTheaterMode(false);
        setIsWatchParty(false);
        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'stop' });
        }
    };

    const toggleTheater = () => {
        const next = !isTheaterMode;
        setIsTheaterMode(next);
        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'theater', enabled: next });
        }
    };

    const toggleWatchParty = () => {
        const next = !isWatchParty;
        setIsWatchParty(next);
        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'party', enabled: next });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') loadVideo();
    };

    const hasContent = videoId || genericUrl;
    const embedSrc = videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
        : genericUrl;

    if (!isOpen && !hasContent) return null;

    // === MINI PLAYER (when panel closed but content playing) ===
    if (!isOpen && hasContent && !isTheaterMode) {
        return (
            <div className={styles.miniPlayer}>
                <iframe
                    src={embedSrc}
                    className={styles.miniIframe}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                />
                <button className={styles.miniClose} onClick={stopVideo}>✕</button>
                <button className={styles.miniExpand} onClick={() => setIsTheaterMode(true)} title="Theater Mode">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                </button>
            </div>
        );
    }

    // === THEATER MODE (full-screen with participant sidebar) ===
    if (isTheaterMode && hasContent) {
        return (
            <div className={styles.theaterOverlay}>
                {/* Floating reactions */}
                {liveReactions.map(r => (
                    <div key={r.id} className={styles.floatingReaction} style={{ left: `${r.left}%` }}>
                        {r.emoji}
                    </div>
                ))}

                {/* Top bar */}
                <div className={styles.theaterTopBar}>
                    <div className={styles.theaterTopLeft}>
                        {isWatchParty && <span className={styles.liveBadge}>● LIVE</span>}
                        <span className={styles.theaterTitle}>Watch Together</span>
                    </div>
                    <div className={styles.theaterTopRight}>
                        <button className={`${styles.theaterBtn} ${isWatchParty ? styles.theaterBtnActive : ''}`} onClick={toggleWatchParty}>
                            🎉 Party
                        </button>
                        <button className={styles.theaterBtn} onClick={toggleTheater}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                            Exit
                        </button>
                        <button className={`${styles.theaterBtn} ${styles.theaterStopBtn}`} onClick={stopVideo}>
                            ⏹ Stop
                        </button>
                    </div>
                </div>

                {/* Main content area */}
                <div className={styles.theaterBody}>
                    <div className={styles.theaterMain}>
                        <iframe
                            ref={iframeRef}
                            src={embedSrc}
                            className={styles.theaterIframe}
                            allow="autoplay; encrypted-media; fullscreen"
                            allowFullScreen
                        />
                    </div>

                    {/* Participant sidebar */}
                    <div className={styles.theaterSidebar}>
                        {/* My video */}
                        {myStream && (
                            <div className={styles.theaterTile}>
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    ref={el => { if (el && myStream) el.srcObject = myStream; }}
                                    className={styles.theaterTileVideo}
                                />
                                <span className={styles.theaterTileLabel}>You</span>
                            </div>
                        )}
                        {/* Remote videos */}
                        {remoteUsers?.filter(u => u.stream).map(user => (
                            <div key={user.id} className={styles.theaterTile}>
                                <video
                                    autoPlay
                                    playsInline
                                    ref={el => { if (el && user.stream) el.srcObject = user.stream; }}
                                    className={styles.theaterTileVideo}
                                />
                                <span className={styles.theaterTileLabel}>{user.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Watch party reaction bar */}
                {isWatchParty && (
                    <div className={styles.reactionBar}>
                        {partyEmojis.map(emoji => (
                            <button key={emoji} className={styles.reactionBtn} onClick={() => spawnReaction(emoji)}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // === STANDARD PANEL ===
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.panel} ${hasContent ? styles.panelWide : ''}`} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <svg className={styles.headerIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className={styles.headerTitle}>Watch Together</span>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {!hasContent ? (
                    <div className={styles.inputArea}>
                        <p className={styles.hint}>Paste a YouTube link or any website URL to watch together! 🍿</p>
                        <div className={styles.urlRow}>
                            <input
                                type="text"
                                className={styles.urlInput}
                                placeholder="YouTube link, or any URL..."
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className={styles.loadBtn}
                                onClick={loadVideo}
                                disabled={!extractVideoId(urlInput) && !isValidUrl(urlInput)}
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
                                src={embedSrc}
                                className={styles.videoIframe}
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                            />
                        </div>
                        <div className={styles.videoControls}>
                            <button className={styles.stopBtn} onClick={stopVideo}>
                                ⏹ Stop
                            </button>
                            <button className={styles.theaterToggle} onClick={toggleTheater}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                                Theater
                            </button>
                            <button className={`${styles.partyToggle} ${isWatchParty ? styles.partyToggleActive : ''}`} onClick={toggleWatchParty}>
                                🎉 Party
                            </button>
                            <button className={styles.minimizeBtn} onClick={onClose}>
                                ↙ Minimize
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
