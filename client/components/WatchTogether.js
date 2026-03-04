'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './WatchTogether.module.css';
import ChatPanel from './ChatPanel';

// ===== HELPERS =====

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

/**
 * Allowlist of trusted domains that may be embedded in an iframe.
 * Users can always use Screen Share for any other site.
 */
const ALLOWED_EMBED_HOSTS = [
    'www.youtube.com',
    'youtube.com',
    'youtu.be',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'vimeo.com',
    'www.dailymotion.com',
    'open.spotify.com',
    'w.soundcloud.com',
    'soundcloud.com',
    'www.twitch.tv',
    'clips.twitch.tv',
    'player.twitch.tv',
    'codepen.io',
    'codesandbox.io',
];

/**
 * Sanitize a user-provided URL for use as an iframe src.
 * Only allows http(s) URLs from ALLOWED_EMBED_HOSTS.
 * Returns a safe, reconstructed URL string or null.
 */
function sanitizeEmbedUrl(raw) {
    if (!raw) return null;
    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        // Domain allowlist — CodeQL recognizes this as a sanitization barrier
        if (!ALLOWED_EMBED_HOSTS.includes(parsed.hostname.toLowerCase())) return null;
        // Reconstruct from parsed parts, drop fragments
        return parsed.protocol + '//' + parsed.host + parsed.pathname + parsed.search;
    } catch {
        return null;
    }
}

/** Strict pattern for YouTube video IDs (exactly 11 URL-safe chars). */
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Build a safe embed src from a validated YouTube ID or a sanitized generic URL.
 * Both branches produce a fully reconstructed string — no raw user input reaches the sink.
 */
function buildSafeEmbedSrc(vid, genericUrl) {
    if (vid && YT_ID_RE.test(vid)) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return 'https://www.youtube.com/embed/' + encodeURIComponent(vid)
            + '?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=' + encodeURIComponent(origin);
    }
    if (genericUrl) {
        return sanitizeEmbedUrl(genericUrl);
    }
    return null;
}

// YouTube Player States
const YT_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

// ===== YouTube IFrame API Loader =====

function loadYouTubeApi() {
    return new Promise((resolve) => {
        if (window.YT?.Player) { resolve(); return; }

        if (!document.getElementById('yt-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'yt-iframe-api';
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }

        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (prev) prev();
            resolve();
        };

        // Poll as safety net
        const check = setInterval(() => {
            if (window.YT?.Player) { clearInterval(check); resolve(); }
        }, 200);
        setTimeout(() => clearInterval(check), 15000);
    });
}

// ===== QUALITY LABELS =====
const QUALITY_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 'small', label: '240p' },
    { value: 'medium', label: '360p' },
    { value: 'large', label: '480p' },
    { value: 'hd720', label: '720p' },
    { value: 'hd1080', label: '1080p' },
    { value: 'highres', label: '4K+' },
];

// ===== SYNC CONSTANTS =====
const HEARTBEAT_INTERVAL = 2000;
const DRIFT_THRESHOLD = 0.8;
const SYNC_COOLDOWN = 400;

export default function WatchTogether({ isOpen, onClose, socket, roomId, myStream, remoteUsers, peersRef, messages, onSend, currentUserId }) {
    // ----- Core state -----
    const [urlInput, setUrlInput] = useState('');
    const [videoId, setVideoId] = useState(null);
    const [genericUrl, setGenericUrl] = useState(null);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isWatchParty, setIsWatchParty] = useState(false);
    const [liveReactions, setLiveReactions] = useState([]);
    const reactionIdRef = useRef(0);

    // ----- Screen share state -----
    const [screenStream, setScreenStream] = useState(null);
    const screenVideoRef = useRef(null);

    // ----- Theater chat state -----
    const [isTheaterChatOpen, setIsTheaterChatOpen] = useState(false);

    // ----- Sync state -----
    const [isLeader, setIsLeader] = useState(false);
    const [leaderName, setLeaderName] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [selectedQuality, setSelectedQuality] = useState('auto');
    const [peerBuffering, setPeerBuffering] = useState(false);
    const [apiReady, setApiReady] = useState(false);

    // ----- Refs -----
    const playerRef = useRef(null);         // YT.Player instance (sync control only)
    const iframeRef = useRef(null);
    const heartbeatRef = useRef(null);
    const syncCooldownRef = useRef(false);
    const isLeaderRef = useRef(false);
    const videoIdRef = useRef(null);
    const roomIdRef = useRef(roomId);

    // Keep refs in sync
    useEffect(() => { isLeaderRef.current = isLeader; }, [isLeader]);
    useEffect(() => { videoIdRef.current = videoId; }, [videoId]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

    const partyEmojis = ['🔥', '🎉', '👏', '⚽', '🏏', '😱', '❤️', '💪'];

    // ==========================================
    // P2P DATA CHANNEL MESSAGING
    // ==========================================

    const broadcastViaPeers = useCallback((type, data) => {
        if (!peersRef?.current) return;
        const message = JSON.stringify({ _watchSync: true, type, ...data });
        Object.values(peersRef.current).forEach(peer => {
            try {
                if (peer.peerObj && !peer.peerObj.destroyed && peer.peerObj._channel?.readyState === 'open') {
                    peer.peerObj.send(message);
                }
            } catch { /* peer channel not ready */ }
        });
    }, [peersRef]);

    const broadcastSync = useCallback((type, data) => {
        broadcastViaPeers(type, data);
        if (socket && roomIdRef.current) {
            socket.emit('send-watch-sync', { roomId: roomIdRef.current, type, ...data });
        }
    }, [socket, broadcastViaPeers]);

    // ==========================================
    // ATTACH YT API TO EXISTING IFRAME (hybrid)
    // ==========================================
    // The iframe always renders (just like old code).
    // We then ATTACH the YT.Player API to it for sync control.
    // If the API fails, the video still plays normally.

    const attachYTApi = useCallback((iframeElement) => {
        if (!iframeElement || !window.YT?.Player) return;

        // Destroy old player reference
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch { }
            playerRef.current = null;
        }

        try {
            // Attach to existing iframe element directly
            playerRef.current = new window.YT.Player(iframeElement, {
                events: {
                    onReady: () => {
                        setApiReady(true);
                        setSyncStatus('synced');
                    },
                    onStateChange: (event) => {
                        if (syncCooldownRef.current) return;
                        if (!isLeaderRef.current) return;

                        const state = event.data;
                        const currentTime = event.target.getCurrentTime?.() || 0;

                        if (state === YT_STATES.PLAYING) {
                            broadcastSync('play', { time: currentTime, timestamp: Date.now() });
                            setSyncStatus('synced');
                            if (socket && roomIdRef.current) {
                                socket.emit('send-watch-buffer', { roomId: roomIdRef.current, buffering: false, timestamp: Date.now() });
                            }
                        } else if (state === YT_STATES.PAUSED) {
                            broadcastSync('pause', { time: currentTime, timestamp: Date.now() });
                            setSyncStatus('synced');
                        } else if (state === YT_STATES.BUFFERING) {
                            setSyncStatus('buffering');
                            if (socket && roomIdRef.current) {
                                socket.emit('send-watch-buffer', { roomId: roomIdRef.current, buffering: true, timestamp: Date.now() });
                            }
                        }
                    },
                    onError: (event) => {
                        console.warn('[WatchTogether] YT Player error:', event.data);
                    },
                },
            });
        } catch (err) {
            console.warn('[WatchTogether] Failed to attach YT API:', err);
        }
    }, [broadcastSync, socket]);

    // Load YT API and attach to iframe whenever videoId changes
    useEffect(() => {
        if (!videoId) {
            playerRef.current = null;
            setApiReady(false);
            return;
        }

        let cancelled = false;

        loadYouTubeApi().then(() => {
            if (cancelled) return;
            // Wait for iframe to be in DOM
            const tryAttach = (attempts = 0) => {
                if (cancelled || attempts > 30) return;
                const iframe = iframeRef.current;
                if (iframe) {
                    attachYTApi(iframe);
                } else {
                    setTimeout(() => tryAttach(attempts + 1), 200);
                }
            };
            // Give the iframe time to render first
            setTimeout(() => tryAttach(), 500);
        });

        return () => {
            cancelled = true;
            playerRef.current = null;
            setApiReady(false);
        };
    }, [videoId, isTheaterMode, attachYTApi]);

    // ==========================================
    // HEARTBEAT — Leader broadcasts position every 2s
    // ==========================================

    useEffect(() => {
        if (!isLeader || !videoId || !apiReady) {
            clearInterval(heartbeatRef.current);
            return;
        }

        heartbeatRef.current = setInterval(() => {
            const player = playerRef.current;
            if (!player?.getCurrentTime) return;
            try {
                const currentTime = player.getCurrentTime();
                const state = player.getPlayerState();
                if (state === YT_STATES.PLAYING || state === YT_STATES.PAUSED) {
                    if (socket && roomIdRef.current) {
                        socket.emit('send-watch-heartbeat', {
                            roomId: roomIdRef.current,
                            time: currentTime,
                            state: state,
                            timestamp: Date.now()
                        });
                    }
                    broadcastViaPeers('heartbeat', { time: currentTime, state, timestamp: Date.now() });
                }
            } catch { }
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(heartbeatRef.current);
    }, [isLeader, videoId, apiReady, socket, broadcastViaPeers]);

    // ==========================================
    // SYNC COMMAND APPLICATORS
    // ==========================================

    const applySyncCommand = useCallback((data) => {
        const player = playerRef.current;
        if (!player?.seekTo) return;

        syncCooldownRef.current = true;
        setTimeout(() => { syncCooldownRef.current = false; }, SYNC_COOLDOWN);

        try {
            if (data.type === 'play') {
                player.seekTo(data.time, true);
                player.playVideo();
                setSyncStatus('synced');
            } else if (data.type === 'pause') {
                player.seekTo(data.time, true);
                player.pauseVideo();
                setSyncStatus('synced');
            } else if (data.type === 'seek') {
                player.seekTo(data.time, true);
                setSyncStatus('syncing');
                setTimeout(() => setSyncStatus('synced'), 500);
            } else if (data.type === 'quality' && data.quality) {
                player.setPlaybackQuality(data.quality);
            }
        } catch (err) {
            console.warn('[WatchTogether] Sync apply error:', err);
        }
    }, []);

    const applyDriftCorrection = useCallback((data) => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;

        try {
            const myTime = player.getCurrentTime();
            const drift = Math.abs(myTime - data.time);

            if (drift > DRIFT_THRESHOLD) {
                syncCooldownRef.current = true;
                setTimeout(() => { syncCooldownRef.current = false; }, SYNC_COOLDOWN);
                player.seekTo(data.time, true);
                setSyncStatus('syncing');
                setTimeout(() => setSyncStatus('synced'), 500);
            } else {
                setSyncStatus('synced');
            }

            const myState = player.getPlayerState();
            if (data.state === YT_STATES.PLAYING && myState !== YT_STATES.PLAYING) {
                player.playVideo();
            } else if (data.state === YT_STATES.PAUSED && myState !== YT_STATES.PAUSED) {
                player.pauseVideo();
            }
        } catch { }
    }, []);

    // ==========================================
    // RECEIVE SYNC EVENTS (Socket.io)
    // ==========================================

    useEffect(() => {
        if (!socket) return;

        const handleWatchSync = (data) => {
            if (data.type === 'load') {
                if (data.videoId) {
                    setVideoId(data.videoId);
                    setGenericUrl(null);
                    setIsLeader(false);
                    setLeaderName(data.leaderName || 'Partner');
                } else if (data.genericUrl) {
                    const safeUrl = sanitizeEmbedUrl(data.genericUrl);
                    if (!safeUrl) return;
                    setGenericUrl(safeUrl);
                    setVideoId(null);
                }
                setUrlInput('');
                setSyncStatus('syncing');
            } else if (data.type === 'stop') {
                setVideoId(null);
                setGenericUrl(null);
                setIsTheaterMode(false);
                setIsWatchParty(false);
                setIsLeader(false);
                setLeaderName(null);
                setSyncStatus('idle');
            } else if (data.type === 'theater') {
                setIsTheaterMode(data.enabled);
            } else if (data.type === 'party') {
                setIsWatchParty(data.enabled);
            }
        };

        const handleWatchReaction = (data) => {
            spawnReaction(data.emoji, false);
        };

        const handleSyncCommand = (data) => {
            if (isLeaderRef.current) return;
            applySyncCommand(data);
        };

        const handleHeartbeat = (data) => {
            if (isLeaderRef.current) return;
            applyDriftCorrection(data);
        };

        const handleBuffer = (data) => {
            if (data.buffering) {
                setPeerBuffering(true);
                setSyncStatus('buffering');
                try { playerRef.current?.pauseVideo?.(); } catch { }
            } else {
                setPeerBuffering(false);
                setSyncStatus('synced');
                try { playerRef.current?.playVideo?.(); } catch { }
            }
        };

        socket.on('receive-watch', handleWatchSync);
        socket.on('receive-watch-reaction', handleWatchReaction);
        socket.on('receive-watch-sync', handleSyncCommand);
        socket.on('receive-watch-heartbeat', handleHeartbeat);
        socket.on('receive-watch-buffer', handleBuffer);

        return () => {
            socket.off('receive-watch', handleWatchSync);
            socket.off('receive-watch-reaction', handleWatchReaction);
            socket.off('receive-watch-sync', handleSyncCommand);
            socket.off('receive-watch-heartbeat', handleHeartbeat);
            socket.off('receive-watch-buffer', handleBuffer);
        };
    }, [socket]);

    // ==========================================
    // RECEIVE SYNC VIA P2P DATA CHANNELS
    // ==========================================

    useEffect(() => {
        if (!peersRef?.current) return;

        const handler = (rawData) => {
            try {
                const str = typeof rawData === 'string' ? rawData : new TextDecoder().decode(rawData);
                const data = JSON.parse(str);
                if (!data._watchSync) return;
                if (isLeaderRef.current) return;

                if (data.type === 'play' || data.type === 'pause' || data.type === 'seek' || data.type === 'quality') {
                    applySyncCommand(data);
                } else if (data.type === 'heartbeat') {
                    applyDriftCorrection(data);
                }
            } catch { }
        };

        const attachListeners = () => {
            Object.values(peersRef.current).forEach(peer => {
                if (peer.peerObj && !peer.peerObj.destroyed) {
                    peer.peerObj.off('data', handler);
                    peer.peerObj.on('data', handler);
                }
            });
        };

        attachListeners();
        const interval = setInterval(attachListeners, 3000);

        return () => {
            clearInterval(interval);
            try {
                Object.values(peersRef.current).forEach(peer => {
                    if (peer.peerObj && !peer.peerObj.destroyed) {
                        peer.peerObj.off('data', handler);
                    }
                });
            } catch { }
        };
    }, [peersRef, videoId]);

    // ==========================================
    // ACTIONS
    // ==========================================

    const spawnReaction = useCallback((emoji, broadcast = true) => {
        const id = ++reactionIdRef.current;
        const left = 10 + Math.random() * 80;
        setLiveReactions(prev => [...prev, { id, emoji, left }]);
        setTimeout(() => {
            setLiveReactions(prev => prev.filter(r => r.id !== id));
        }, 2500);
        if (broadcast && socket && roomId) {
            socket.emit('send-watch-reaction', { roomId, emoji });
        }
    }, [socket, roomId]);

    const getUserName = useCallback(() => {
        if (typeof window !== 'undefined') {
            try {
                const authUser = localStorage.getItem('auth_user');
                if (authUser) return JSON.parse(authUser).name;
            } catch { }
            return sessionStorage.getItem('userName') || 'You';
        }
        return 'You';
    }, []);

    const loadVideo = useCallback(() => {
        const youtubeId = extractVideoId(urlInput);
        if (youtubeId) {
            setVideoId(youtubeId);
            setGenericUrl(null);
            setUrlInput('');
            setIsLeader(true);
            setLeaderName(getUserName());
            setSyncStatus('syncing');
            if (socket && roomId) {
                socket.emit('send-watch', { roomId, type: 'load', videoId: youtubeId, leaderName: getUserName() });
            }
        } else if (isValidUrl(urlInput)) {
            const safeUrl = sanitizeEmbedUrl(urlInput);
            if (!safeUrl) return;
            setGenericUrl(safeUrl);
            setVideoId(null);
            setUrlInput('');
            if (socket && roomId) {
                socket.emit('send-watch', { roomId, type: 'load', genericUrl: safeUrl });
            }
        }
    }, [urlInput, socket, roomId, getUserName]);

    const stopVideo = () => {
        playerRef.current = null;
        setVideoId(null);
        setGenericUrl(null);
        setIsTheaterMode(false);
        setIsWatchParty(false);
        setIsLeader(false);
        setLeaderName(null);
        setSyncStatus('idle');
        setApiReady(false);
        clearInterval(heartbeatRef.current);
        // Stop screen share if active
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
        }
        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'stop' });
        }
    };

    // ==========================================
    // SCREEN / TAB SHARE (for JioHotstar, Netflix, etc.)
    // ==========================================

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920, max: 2560 },
                    height: { ideal: 1080, max: 1440 },
                    frameRate: { ideal: 30, max: 60 },
                    cursor: 'always',
                    displaySurface: 'window',
                },
                audio: true, // Capture tab audio for live matches!
                selfBrowserSurface: 'exclude',
                monitorTypeSurfaces: 'exclude',
                preferCurrentTab: false,
            });

            // Set content hint for sharper rendering
            const vt = stream.getVideoTracks()[0];
            if (vt) { try { vt.contentHint = 'detail'; } catch { } }

            setScreenStream(stream);
            setVideoId(null);
            setGenericUrl(null);
            setIsLeader(true);
            setLeaderName(getUserName());
            setSyncStatus('synced');

            // Broadcast to peers that screen share started
            if (socket && roomId) {
                socket.emit('send-watch', {
                    roomId,
                    type: 'load',
                    screenShare: true,
                    leaderName: getUserName()
                });
            }

            // Replace tracks on all peer connections
            if (peersRef?.current) {
                const videoTrack = stream.getVideoTracks()[0];
                const audioTrack = stream.getAudioTracks()[0];
                Object.values(peersRef.current).forEach(peer => {
                    try {
                        if (peer.peerObj && !peer.peerObj.destroyed) {
                            const senders = peer.peerObj._pc?.getSenders?.();
                            senders?.forEach(sender => {
                                if (sender.track?.kind === 'video' && videoTrack) {
                                    sender.replaceTrack(videoTrack);
                                }
                                // Add audio track if available
                                if (sender.track?.kind === 'audio' && audioTrack) {
                                    sender.replaceTrack(audioTrack);
                                }
                            });
                        }
                    } catch { }
                });
            }

            // Handle user stopping share via browser UI
            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (err) {
            console.warn('[WatchTogether] Screen share cancelled or failed:', err);
        }
    }, [socket, roomId, peersRef, getUserName]);

    const stopScreenShare = useCallback(() => {
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
        }

        // Restore original camera tracks on peer connections
        if (peersRef?.current && myStream) {
            const videoTrack = myStream.getVideoTracks()[0];
            const audioTrack = myStream.getAudioTracks()[0];
            Object.values(peersRef.current).forEach(peer => {
                try {
                    if (peer.peerObj && !peer.peerObj.destroyed) {
                        const senders = peer.peerObj._pc?.getSenders?.();
                        senders?.forEach(sender => {
                            if (sender.track?.kind === 'video' && videoTrack) {
                                sender.replaceTrack(videoTrack);
                            }
                            if (sender.track?.kind === 'audio' && audioTrack) {
                                sender.replaceTrack(audioTrack);
                            }
                        });
                    }
                } catch { }
            });
        }

        setIsLeader(false);
        setLeaderName(null);
        setSyncStatus('idle');

        if (socket && roomId) {
            socket.emit('send-watch', { roomId, type: 'stop' });
        }
    }, [screenStream, peersRef, myStream, socket, roomId]);

    // Attach screen stream to video element
    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
        }
    }, [screenStream, isTheaterMode]);

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

    const handleSeek = useCallback((seconds) => {
        const player = playerRef.current;
        if (!player?.seekTo || !isLeader) return;
        const newTime = (player.getCurrentTime?.() || 0) + seconds;
        player.seekTo(Math.max(0, newTime), true);
        broadcastSync('seek', { time: Math.max(0, newTime), timestamp: Date.now() });
    }, [isLeader, broadcastSync]);

    const handleQualityChange = useCallback((quality) => {
        setSelectedQuality(quality);
        if (quality !== 'auto' && playerRef.current?.setPlaybackQuality) {
            playerRef.current.setPlaybackQuality(quality);
        }
        if (isLeader) {
            broadcastSync('quality', { quality, timestamp: Date.now() });
        }
    }, [isLeader, broadcastSync]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') loadVideo();
    };

    // ==========================================
    // COMPUTED VALUES
    // ==========================================

    const hasContent = videoId || genericUrl || screenStream;
    const isYouTube = !!videoId;
    const isScreenShare = !!screenStream;
    // Build the embed URL — always use iframe, but ensure it is safely constructed.
    const embedSrc = buildSafeEmbedSrc(videoId, genericUrl);

    if (!isOpen && !hasContent) return null;

    // ==========================================
    // SHARED SUB-COMPONENTS
    // ==========================================

    const SyncStatusBadge = () => {
        if (!isYouTube && !isScreenShare) return null;
        const statusConfig = {
            idle: { dot: styles.syncDotIdle, label: '' },
            synced: { dot: styles.syncDotSynced, label: isScreenShare ? 'Live' : 'Synced' },
            syncing: { dot: styles.syncDotSyncing, label: 'Syncing...' },
            buffering: { dot: styles.syncDotBuffering, label: 'Buffering...' },
        };
        const cfg = statusConfig[syncStatus] || statusConfig.idle;
        if (!cfg.label) return null;
        return (
            <div className={styles.syncBadge}>
                <span className={`${styles.syncDot} ${cfg.dot}`} />
                <span className={styles.syncLabel}>{cfg.label}</span>
            </div>
        );
    };

    const LeaderBadge = () => {
        if (!isYouTube && !isScreenShare) return null;
        return (
            <span className={styles.leaderBadge}>
                {isLeader ? (isScreenShare ? '📺 You share' : '👑 You lead') : `👁 ${leaderName || 'Partner'} ${isScreenShare ? 'shares' : 'leads'}`}
            </span>
        );
    };

    const QualitySelector = () => {
        if (!isYouTube || !apiReady) return null;
        return (
            <select
                className={styles.qualitySelect}
                value={selectedQuality}
                onChange={(e) => handleQualityChange(e.target.value)}
                title="Video Quality"
            >
                {QUALITY_OPTIONS.map(q => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                ))}
            </select>
        );
    };

    const BufferingOverlay = () => {
        if (!peerBuffering) return null;
        return (
            <div className={styles.bufferingOverlay}>
                <div className={styles.bufferingContent}>
                    <div className={styles.bufferingSpinner} />
                    <p>Waiting for everyone to load...</p>
                </div>
            </div>
        );
    };

    const SyncControls = () => {
        if (!isYouTube || !isLeader || !apiReady) return null;
        return (
            <div className={styles.syncControls}>
                <button className={styles.syncControlBtn} onClick={() => handleSeek(-10)} title="Back 10s">
                    ⏪ 10s
                </button>
                <button className={styles.syncControlBtn} onClick={() => handleSeek(10)} title="Forward 10s">
                    10s ⏩
                </button>
            </div>
        );
    };

    // ==========================================
    // MINI PLAYER (when panel closed but content playing)
    // ==========================================

    if (!isOpen && hasContent && !isTheaterMode) {
        return (
            <div className={styles.miniPlayer}>
                {isScreenShare ? (
                    <video ref={screenVideoRef} autoPlay playsInline muted className={styles.miniIframe} />
                ) : (
                    embedSrc && (
                        <iframe
                            src={embedSrc}
                            className={styles.miniIframe}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    )
                )}
                <button className={styles.miniClose} onClick={isScreenShare ? stopScreenShare : stopVideo}>✕</button>
                <button className={styles.miniExpand} onClick={() => setIsTheaterMode(true)} title="Theater Mode">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                </button>
                <SyncStatusBadge />
            </div>
        );
    }

    // ==========================================
    // THEATER MODE
    // ==========================================

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
                        {(isWatchParty || isScreenShare) && <span className={styles.liveBadge}>● LIVE</span>}
                        <span className={styles.theaterTitle}>Watch Together</span>
                        <SyncStatusBadge />
                        <LeaderBadge />
                    </div>
                    <div className={styles.theaterTopRight}>
                        <QualitySelector />
                        <SyncControls />
                        {/* Chat toggle */}
                        <button
                            className={`${styles.theaterBtn} ${isTheaterChatOpen ? styles.theaterBtnActive : ''}`}
                            onClick={() => setIsTheaterChatOpen(p => !p)}
                        >
                            💬 Chat
                        </button>
                        <button className={`${styles.theaterBtn} ${isWatchParty ? styles.theaterBtnActive : ''}`} onClick={toggleWatchParty}>
                            🎉 Party
                        </button>
                        <button className={styles.theaterBtn} onClick={toggleTheater}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                            Exit
                        </button>
                        <button className={`${styles.theaterBtn} ${styles.theaterStopBtn}`} onClick={isScreenShare ? stopScreenShare : stopVideo}>
                            ⏹ Stop
                        </button>
                    </div>
                </div>

                {/* Main content area */}
                <div className={styles.theaterBody}>
                    <div className={styles.theaterMain}>
                        {isScreenShare ? (
                            <video
                                ref={screenVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={styles.theaterIframe}
                            />
                        ) : (
                            embedSrc && (
                                <iframe
                                    ref={iframeRef}
                                    src={embedSrc}
                                    className={styles.theaterIframe}
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowFullScreen
                                />
                            )
                        )}
                        <BufferingOverlay />
                    </div>

                    {/* Right side: Participants + Chat */}
                    <div className={styles.theaterRightPanel}>
                        {/* Participant sidebar */}
                        <div className={styles.theaterSidebar}>
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

                        {/* Theater Chat */}
                        {isTheaterChatOpen && (
                            <div className={styles.theaterChat}>
                                <ChatPanel
                                    isOpen={true}
                                    messages={messages || []}
                                    onSend={onSend}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        )}
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

    // ==========================================
    // STANDARD PANEL
    // ==========================================

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
                    <SyncStatusBadge />
                    <LeaderBadge />
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {!hasContent ? (
                    <div className={styles.inputArea}>
                        <p className={styles.hint}>Paste a YouTube link, URL, or share your screen to watch together! 🍿</p>
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

                        {/* Screen Share Button */}
                        <div className={styles.screenShareSection}>
                            <button className={styles.screenShareBtn} onClick={startScreenShare}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                    <polyline points="9 10 12 7 15 10" />
                                    <line x1="12" y1="7" x2="12" y2="14" />
                                </svg>
                                Share Screen / Tab
                            </button>
                            <p className={styles.screenShareHint}>Stream JioHotstar, Netflix, or any app — watch live cricket, movies &amp; more!</p>
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
                            {embedSrc && (
                                <iframe
                                    ref={iframeRef}
                                    src={embedSrc}
                                    className={styles.videoIframe}
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowFullScreen
                                />
                            )}
                            <BufferingOverlay />
                        </div>
                        <div className={styles.videoControls}>
                            <button className={styles.stopBtn} onClick={stopVideo}>
                                ⏹ Stop
                            </button>
                            <QualitySelector />
                            <SyncControls />
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
