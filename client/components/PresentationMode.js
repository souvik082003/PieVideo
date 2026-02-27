'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './PresentationMode.module.css';

export default function PresentationMode({ isOpen, onClose, socket, roomId, peersRef }) {
    const [isPresenting, setIsPresenting] = useState(false);
    const [isViewer, setIsViewer] = useState(false);
    const [presenterName, setPresenterName] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    const videoRef = useRef(null);
    const roomIdRef = useRef(roomId);

    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

    // Get user name
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

    // ==========================================
    // START PRESENTING
    // ==========================================
    const startPresenting = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920, max: 2560 },
                    height: { ideal: 1080, max: 1440 },
                    frameRate: { ideal: 30, max: 60 },
                    cursor: 'always',
                    displaySurface: 'window',
                },
                audio: true,
                selfBrowserSurface: 'exclude',
                monitorTypeSurfaces: 'exclude',
                preferCurrentTab: false,
            });

            // Sharper text/slides
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                try { videoTrack.contentHint = 'detail'; } catch { }
            }

            setScreenStream(stream);
            setIsPresenting(true);
            setPresenterName(getUserName());

            // Notify room
            if (socket && roomIdRef.current) {
                socket.emit('send-presentation', {
                    roomId: roomIdRef.current,
                    type: 'start',
                    presenterName: getUserName(),
                });
            }

            // Replace tracks on peer connections + boost bitrate
            if (peersRef?.current) {
                const audioTrack = stream.getAudioTracks()[0];
                Object.values(peersRef.current).forEach(peer => {
                    try {
                        if (peer.peerObj && !peer.peerObj.destroyed) {
                            const senders = peer.peerObj._pc?.getSenders?.();
                            senders?.forEach(async (sender) => {
                                if (sender.track?.kind === 'video' && videoTrack) {
                                    await sender.replaceTrack(videoTrack);
                                    try {
                                        const params = sender.getParameters();
                                        if (!params.encodings) params.encodings = [{}];
                                        params.encodings[0].maxBitrate = 4_000_000;
                                        params.encodings[0].maxFramerate = 30;
                                        await sender.setParameters(params);
                                    } catch { }
                                }
                                if (sender.track?.kind === 'audio' && audioTrack) {
                                    await sender.replaceTrack(audioTrack);
                                }
                            });
                        }
                    } catch { }
                });
            }

            videoTrack.onended = () => stopPresenting();
        } catch (err) {
            console.warn('[Presentation] Screen share cancelled:', err);
        }
    }, [socket, peersRef, getUserName]);

    // ==========================================
    // STOP PRESENTING
    // ==========================================
    const stopPresenting = useCallback(() => {
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
        }
        setIsPresenting(false);
        setIsViewer(false);
        setPresenterName(null);
        setRemoteStream(null);

        if (socket && roomIdRef.current) {
            socket.emit('send-presentation', {
                roomId: roomIdRef.current,
                type: 'stop',
            });
        }
    }, [screenStream, socket]);

    // ==========================================
    // SOCKET LISTENERS
    // ==========================================
    useEffect(() => {
        if (!socket) return;

        const handlePresentation = (data) => {
            if (data.type === 'start') {
                setIsViewer(true);
                setPresenterName(data.presenterName || 'Presenter');
            } else if (data.type === 'stop') {
                setIsViewer(false);
                setIsPresenting(false);
                setPresenterName(null);
                setScreenStream(null);
                setRemoteStream(null);
            }
        };

        socket.on('receive-presentation', handlePresentation);
        return () => socket.off('receive-presentation', handlePresentation);
    }, [socket]);

    // Attach local screen stream to video
    useEffect(() => {
        if (videoRef.current && screenStream) {
            videoRef.current.srcObject = screenStream;
        }
    }, [screenStream]);

    // Listen for incoming remote streams (viewer)
    useEffect(() => {
        if (!peersRef?.current || !isViewer) return;

        const checkStreams = () => {
            Object.values(peersRef.current).forEach(peer => {
                if (peer.peerObj && !peer.peerObj.destroyed) {
                    const streams = peer.peerObj._pc?.getRemoteStreams?.();
                    if (streams?.[0]) {
                        setRemoteStream(streams[0]);
                    }
                }
            });
        };
        checkStreams();
        const interval = setInterval(checkStreams, 1000);
        return () => clearInterval(interval);
    }, [peersRef, isViewer]);

    // Attach remote stream to video
    useEffect(() => {
        if (videoRef.current && remoteStream && isViewer) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isViewer]);

    // ==========================================
    // RENDER
    // ==========================================

    if (!isOpen && !isPresenting && !isViewer) return null;

    // Landing panel
    if (isOpen && !isPresenting && !isViewer) {
        return (
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.panel} onClick={e => e.stopPropagation()}>
                    <div className={styles.header}>
                        <svg className={styles.headerIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <span className={styles.headerTitle}>Presentation Mode</span>
                        <button className={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>

                    <div className={styles.startArea}>
                        <p className={styles.hint} style={{ marginBottom: 16, color: '#aaa', fontSize: '0.85rem' }}>
                            Share your screen so your partner can see your PPT, PDF, browser, or any window.
                        </p>
                        <button className={styles.presentBtn} onClick={startPresenting}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <polyline points="9 10 12 7 15 10" />
                                <line x1="12" y1="7" x2="12" y2="14" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            Start Presenting
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Presenter: compact floating bar
    if (isPresenting) {
        return (
            <div className={styles.presenterBar}>
                <span className={styles.presenterLiveDot}>●</span>
                <span className={styles.presenterLabel}>📺 Presenting</span>
                <button className={styles.presenterStopBtn} onClick={stopPresenting}>
                    ⏹ Stop
                </button>
            </div>
        );
    }

    // Viewer: fullscreen video (no control panel)
    return (
        <div className={styles.presentationOverlay}>
            <div className={styles.topBar}>
                <div className={styles.topLeft}>
                    <span className={styles.liveBadge}>● LIVE</span>
                    <span className={styles.topTitle}>
                        📺 {presenterName || 'Partner'} is presenting
                    </span>
                </div>
                <div className={styles.topRight}>
                    <button className={styles.topBtn} onClick={() => {
                        setIsViewer(false);
                        setPresenterName(null);
                        setRemoteStream(null);
                        onClose?.();
                    }}>
                        ✕ Exit
                    </button>
                </div>
            </div>

            <div className={styles.videoContainer}>
                {remoteStream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={styles.video}
                    />
                ) : (
                    <div className={styles.noStream}>
                        <div className={styles.spinner} />
                        <p>Connecting to presentation stream...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
