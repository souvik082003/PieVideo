'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import socket from '../../../lib/socket';
import { db } from '../../../lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import VideoPlayer from '../../../components/VideoPlayer';
import Controls from '../../../components/Controls';
import ChatPanel from '../../../components/ChatPanel';
import FocusTimer from '../../../components/FocusTimer';
import TodoList from '../../../components/TodoList';

import LoveReactions, { LoveAnimationOverlay } from '../../../components/LoveReactions';
import TruthOrDare from '../../../components/TruthOrDare';
import WouldYouRather from '../../../components/WouldYouRather';
import WatchTogether from '../../../components/WatchTogether';
import SharedWhiteboard from '../../../components/SharedWhiteboard';
import GoodnightMode from '../../../components/GoodnightMode';
import Pictionary from '../../../components/Pictionary';
import PresentationMode from '../../../components/PresentationMode';
import styles from './page.module.css';
import timerStyles from '../../../components/FocusTimer.module.css';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId;

    const [users, setUsers] = useState([]);
    const [myStream, setMyStream] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [emojis, setEmojis] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isTodoOpen, setIsTodoOpen] = useState(false);
    const [timerState, setTimerState] = useState({ remaining: 0, isRunning: false, totalSeconds: 0 });

    // Lock global scroll when in a room to prevent double scrollbars
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = ''; // Resets to CSS default (now auto)
        };
    }, []);

    // Couple features state
    const [isLoveReactionsOpen, setIsLoveReactionsOpen] = useState(false);
    const [activeLoveReaction, setActiveLoveReaction] = useState(null);

    const [isTruthOrDareOpen, setIsTruthOrDareOpen] = useState(false);
    const [isWouldYouRatherOpen, setIsWouldYouRatherOpen] = useState(false);
    const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [isGoodnightMode, setIsGoodnightMode] = useState(false);
    const [isPictionaryOpen, setIsPictionaryOpen] = useState(false);
    const [isPresentationOpen, setIsPresentationOpen] = useState(false);

    // Stable userId
    const myUserIdRef = useRef(null);
    if (!myUserIdRef.current) {
        myUserIdRef.current = typeof window !== 'undefined'
            ? (sessionStorage.getItem('myUserId') || (() => {
                const id = uuidv4();
                sessionStorage.setItem('myUserId', id);
                return id;
            })())
            : uuidv4();
    }
    const myUserId = myUserIdRef.current;

    // Stable userName
    const userNameRef = useRef(null);
    if (!userNameRef.current) {
        if (typeof window !== 'undefined') {
            userNameRef.current =
                sessionStorage.getItem('userName') ||
                (() => {
                    try {
                        const authUser = localStorage.getItem('auth_user');
                        if (authUser) return JSON.parse(authUser).name;
                    } catch { }
                    return null;
                })() ||
                (() => {
                    const name = `Guest-${Math.floor(Math.random() * 9000) + 1000}`;
                    sessionStorage.setItem('userName', name);
                    return name;
                })();
        } else {
            userNameRef.current = 'Guest';
        }
    }
    const userName = userNameRef.current;

    const peersRef = useRef({});
    const streamRef = useRef(null);
    const joinedRef = useRef(false);

    const updateUsersList = useCallback(() => {
        const currentUsers = Object.values(peersRef.current)
            .filter(p => p.peerObj && !p.peerObj.destroyed)
            .map(p => ({ id: p.peerId, name: p.name || 'Unknown', stream: p.stream }));
        setUsers([...currentUsers]);
    }, []);

    const createPeer = useCallback((targetUserId, stream) => {
        const Peer = require('simple-peer');
        const peer = new Peer({
            initiator: true,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ]
            }
        });

        peer.on('signal', signal => {
            socket.emit('send-signal', { userId: myUserId, signal, to: targetUserId });
        });

        peer.on('stream', remoteStream => {
            if (peersRef.current[targetUserId]) {
                peersRef.current[targetUserId].stream = remoteStream;
            }
            updateUsersList();
        });

        peer.on('connect', () => {
            // Set max bitrate for better video quality
            try {
                const senders = peer._pc?.getSenders?.();
                senders?.forEach(sender => {
                    if (sender.track?.kind === 'video') {
                        const params = sender.getParameters();
                        if (!params.encodings) params.encodings = [{}];
                        params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
                        params.encodings[0].maxFramerate = 30;
                        sender.setParameters(params);
                    }
                });
            } catch { }
        });

        peer.on('error', err => console.warn(`[Peer] Error:`, err.message));
        return peer;
    }, [myUserId, updateUsersList]);

    const addPeer = useCallback((incomingSignal, callerId, stream) => {
        const Peer = require('simple-peer');
        const peer = new Peer({
            initiator: false,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ]
            }
        });

        peer.on('signal', signal => {
            socket.emit('send-signal', { userId: myUserId, signal, to: callerId });
        });

        peer.on('stream', remoteStream => {
            if (peersRef.current[callerId]) {
                peersRef.current[callerId].stream = remoteStream;
            }
            updateUsersList();
        });

        peer.on('connect', () => {
            try {
                const senders = peer._pc?.getSenders?.();
                senders?.forEach(sender => {
                    if (sender.track?.kind === 'video') {
                        const params = sender.getParameters();
                        if (!params.encodings) params.encodings = [{}];
                        params.encodings[0].maxBitrate = 2500000;
                        params.encodings[0].maxFramerate = 30;
                        sender.setParameters(params);
                    }
                });
            } catch { }
        });

        peer.on('error', err => console.warn(`[Peer] Error:`, err.message));

        try { peer.signal(incomingSignal); } catch (err) { console.error('[Peer] Signal fail:', err); }
        return peer;
    }, [myUserId, updateUsersList]);

    useEffect(() => {
        if (typeof window === 'undefined' || !socket) return;
        let cancelled = false;

        const requestMedia = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Request high-quality video
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920, min: 1280 },
                        height: { ideal: 1080, min: 720 },
                        frameRate: { ideal: 30, min: 24 },
                        facingMode: 'user',
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000,
                    }
                });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

                // Set content hint for smoother video
                stream.getVideoTracks().forEach(t => {
                    if ('contentHint' in t) t.contentHint = 'motion';
                });

                streamRef.current = stream;
                setMyStream(stream);
                setIsLoading(false);

                if (!joinedRef.current) {
                    joinedRef.current = true;
                    socket.emit('join-room', { roomId, userId: myUserId, userName });
                }
            } catch (err) {
                if (cancelled) return;
                // Fallback to lower quality
                if (err.name === 'OverconstrainedError' || err.name === 'NotReadableError') {
                    try {
                        const fallback = await navigator.mediaDevices.getUserMedia({
                            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
                            audio: true
                        });
                        if (cancelled) { fallback.getTracks().forEach(t => t.stop()); return; }
                        streamRef.current = fallback;
                        setMyStream(fallback);
                        setIsLoading(false);
                        if (!joinedRef.current) {
                            joinedRef.current = true;
                            socket.emit('join-room', { roomId, userId: myUserId, userName });
                        }
                        return;
                    } catch { }
                }
                setIsLoading(false);
                setError({
                    title: err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera Error',
                    message: err.name === 'NotAllowedError'
                        ? 'Camera/mic access denied. Allow access and refresh.'
                        : err.message || 'Could not access camera.'
                });
            }
        };

        requestMedia();

        const handleRoomUsers = (roomUsers) => {
            const s = streamRef.current;
            if (!s) return;
            roomUsers.filter(u => u.id !== myUserId).forEach(u => {
                if (!peersRef.current[u.id] || peersRef.current[u.id]?.peerObj?.destroyed) {
                    const p = createPeer(u.id, s);
                    peersRef.current[u.id] = { peerObj: p, peerId: u.id, name: u.name, stream: null };
                }
            });
            updateUsersList();
        };

        const handleUserConnected = ({ userId, userName: n }) => {
            if (!peersRef.current[userId]) {
                peersRef.current[userId] = { peerObj: null, peerId: userId, name: n, stream: null };
            } else {
                peersRef.current[userId].name = n;
            }
        };

        const handleUserSignal = ({ from, signal }) => {
            const s = streamRef.current;
            if (!s) return;
            const existing = peersRef.current[from];
            const isOffer = signal.type === 'offer';

            if (!existing || !existing.peerObj || existing.peerObj.destroyed) {
                const storedName = existing?.name || 'User';
                const p = addPeer(signal, from, s);
                peersRef.current[from] = { peerObj: p, peerId: from, name: storedName, stream: null };
                updateUsersList();
            } else if (isOffer) {
                existing.peerObj.destroy();
                const storedName = existing.name || 'User';
                const p = addPeer(signal, from, s);
                peersRef.current[from] = { peerObj: p, peerId: from, name: storedName, stream: null };
                updateUsersList();
            } else {
                try {
                    if (!existing.peerObj.destroyed) existing.peerObj.signal(signal);
                } catch { }
            }
        };

        const handleUserDisconnected = (userId) => {
            if (peersRef.current[userId]) {
                peersRef.current[userId].peerObj?.destroy();
                delete peersRef.current[userId];
                updateUsersList();
            }
        };

        const handleReceiveEmoji = ({ userId, emoji }) => {
            setEmojis(prev => ({ ...prev, [userId]: emoji }));
            setTimeout(() => setEmojis(prev => ({ ...prev, [userId]: null })), 2000);
        };

        const handleRoomFull = () => { alert('Room is full.'); router.push('/home'); };
        // Socket.IO receive-message for real-time (from other users in current session)
        const handleReceiveMessage = (m) => {
            // Don't add duplicates — Firestore onSnapshot will handle persistence
            setMessages(prev => {
                if (prev.some(existing => existing.id === m.id)) return prev;
                return [...prev, m];
            });
        };

        socket.on('room-users', handleRoomUsers);
        socket.on('user-connected', handleUserConnected);
        socket.on('user-signal', handleUserSignal);
        socket.on('user-disconnected', handleUserDisconnected);
        socket.on('receive-emoji', handleReceiveEmoji);
        socket.on('room-full', handleRoomFull);
        socket.on('receive-message', handleReceiveMessage);

        return () => {
            cancelled = true;
            joinedRef.current = false;
            socket.off('room-users', handleRoomUsers);
            socket.off('user-connected', handleUserConnected);
            socket.off('user-signal', handleUserSignal);
            socket.off('user-disconnected', handleUserDisconnected);
            socket.off('receive-emoji', handleReceiveEmoji);
            socket.off('room-full', handleRoomFull);
            socket.off('receive-message', handleReceiveMessage);
            Object.values(peersRef.current).forEach(p => {
                if (p.peerObj && !p.peerObj.destroyed) p.peerObj.destroy();
            });
            peersRef.current = {};
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, [roomId, myUserId, userName, router, updateUsersList, createPeer, addPeer]);

    // Load message history from Firestore
    useEffect(() => {
        if (!roomId) return;
        let unsubscribe;
        try {
            const q = query(
                collection(db, 'messages'),
                where('roomId', '==', roomId),
                orderBy('createdAt', 'asc')
            );
            unsubscribe = onSnapshot(q, (snapshot) => {
                const firestoreMessages = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.data().id || doc.id,
                }));
                // Merge with local messages (which may have fileData not in Firestore)
                setMessages(prev => {
                    const idMap = new Map();
                    // Firestore messages first (authoritative)
                    firestoreMessages.forEach(m => idMap.set(m.id, m));
                    // Keep local messages that have fileData (Firestore doesn't store it)
                    prev.forEach(m => {
                        if (m.fileData && idMap.has(m.id)) {
                            idMap.set(m.id, { ...idMap.get(m.id), fileData: m.fileData });
                        } else if (!idMap.has(m.id)) {
                            idMap.set(m.id, m);
                        }
                    });
                    return Array.from(idMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                });
            }, (err) => {
                console.warn('Firestore messages listener error:', err);
            });
        } catch (err) {
            console.warn('Firestore messages query failed:', err);
        }
        return () => unsubscribe?.();
    }, [roomId]);

    useEffect(() => {
        if (!isChatOpen && messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last.userId !== myUserId) setUnreadCount(prev => prev + 1);
        }
    }, [messages, isChatOpen, myUserId]);

    const toggleVideo = () => {
        if (myStream) {
            const t = myStream.getVideoTracks()[0];
            if (t) { t.enabled = !t.enabled; setIsVideoOn(t.enabled); }
        }
    };

    const toggleAudio = () => {
        if (myStream) {
            const t = myStream.getAudioTracks()[0];
            if (t) { t.enabled = !t.enabled; setIsAudioOn(t.enabled); }
        }
    };

    const leaveRoom = () => {
        myStream?.getTracks().forEach(t => t.stop());
        sessionStorage.removeItem('myUserId');
        window.location.href = '/home';
    };

    const sendEmoji = (emoji) => {
        setEmojis(prev => ({ ...prev, [myUserId]: emoji }));
        socket.emit('send-emoji', { userId: myUserId, emoji });
        setTimeout(() => setEmojis(prev => ({ ...prev, [myUserId]: null })), 2000);
    };

    const sendMessage = async ({ type, message, fileName, fileData, fileType, fileSize }) => {
        const msgId = uuidv4();
        const msgData = {
            id: msgId,
            roomId,
            userId: myUserId,
            userName,
            message: message || '',
            type: type || 'text',
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: fileSize || null,
            timestamp: Date.now(),
            status: 'sent',
        };

        // 1. Immediately add to local state
        setMessages(prev => [...prev, { ...msgData, fileData }]);

        // 2. Send via Socket.IO for real-time delivery to other users (include fileData)
        socket.emit('send-message', { ...msgData, fileData });

        // 3. Save to Firestore (without fileData base64 to save quota)
        try {
            await addDoc(collection(db, 'messages'), {
                ...msgData,
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            console.warn('Firestore message save failed (offline?):', err);
        }
    };

    const toggleChat = () => {
        setIsChatOpen(p => !p);
        if (!isChatOpen) setUnreadCount(0);
    };

    // Couple feature handlers
    const handleLoveReaction = (reaction) => {
        setActiveLoveReaction(reaction);
        if (socket) {
            socket.emit('send-love-reaction', { roomId, reaction });
        }
        setTimeout(() => setActiveLoveReaction(null), 5000);
    };



    // Listen for partner's love reactions and theme changes
    useEffect(() => {
        if (!socket) return;
        const handleReceiveReaction = (data) => {
            setActiveLoveReaction(data.reaction);
            setTimeout(() => setActiveLoveReaction(null), 5000);
        };
        socket.on('receive-love-reaction', handleReceiveReaction);

        // Auto-open Pictionary when partner starts it
        const handlePictionary = (data) => {
            if (data.type === 'start-round') {
                setIsPictionaryOpen(true);
            }
        };
        socket.on('receive-pictionary', handlePictionary);

        return () => {
            socket.off('receive-love-reaction', handleReceiveReaction);
            socket.off('receive-pictionary', handlePictionary);
        };
    }, []);

    if (isLoading) {
        return (
            <div className={styles.roomContainer}>
                <div className={styles.statusCard}>
                    <div className={styles.statusIcon}>📹</div>
                    <h2 className={styles.statusTitle}>Setting up your camera...</h2>
                    <p className={styles.statusText}>Please allow access when prompted</p>
                    <div className={styles.loadingDots}><span /><span /><span /></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.roomContainer}>
                <div className={`${styles.statusCard} ${styles.errorCard}`}>
                    <div className={styles.statusIcon}>⚠️</div>
                    <h2 className={styles.statusTitle}>{error.title}</h2>
                    <p className={styles.statusText}>{error.message}</p>
                    <div className={styles.statusActions}>
                        <button className={styles.retryBtn} onClick={() => window.location.reload()}>Try Again</button>
                        <button className={styles.backBtn} onClick={() => window.location.href = '/home'}>Go Back</button>
                    </div>
                </div>
            </div>
        );
    }

    const hasRemote = users.length > 0;

    return (
        <div className={styles.roomContainer}>
            <div className={`${styles.videoArea} ${isChatOpen ? styles.videoAreaShift : ''}`}>
                {hasRemote ? (
                    <>
                        <div className={styles.remoteVideos} data-count={users.length}>
                            {users.map(u => (
                                <VideoPlayer key={u.id} stream={u.stream} userName={u.name} muted={false} emoji={emojis[u.id]} isLarge />
                            ))}
                        </div>
                        <div className={`${styles.pipContainer} ${isChatOpen ? styles.pipShift : ''}`}>
                            <VideoPlayer stream={myStream} userName={`${userName} (You)`} muted emoji={emojis[myUserId]} isLocal />
                        </div>
                    </>
                ) : (
                    <div className={styles.soloView}>
                        <VideoPlayer stream={myStream} userName={`${userName} (You)`} muted emoji={emojis[myUserId]} isLarge isLocal />
                        <div className={styles.waitingOverlay}>
                            <p>Waiting for others to join...</p>
                            <p className={styles.roomIdDisplay}>Room: <span>{roomId}</span></p>
                        </div>
                    </div>
                )}
            </div>

            <ChatPanel isOpen={isChatOpen} messages={messages} onSend={sendMessage} currentUserId={myUserId} />
            <FocusTimer isOpen={isTimerOpen} onClose={() => setIsTimerOpen(false)} onTimerUpdate={setTimerState} />
            <TodoList isOpen={isTodoOpen} onClose={() => setIsTodoOpen(false)} roomId={roomId} />

            {/* Couple feature components */}

            <LoveReactions isOpen={isLoveReactionsOpen} onClose={() => setIsLoveReactionsOpen(false)} onSendReaction={handleLoveReaction} />
            <LoveAnimationOverlay activeReaction={activeLoveReaction} />
            <TruthOrDare isOpen={isTruthOrDareOpen} onClose={() => setIsTruthOrDareOpen(false)} socket={socket} roomId={roomId} onForceOpen={() => setIsTruthOrDareOpen(true)} />
            <WouldYouRather isOpen={isWouldYouRatherOpen} onClose={() => setIsWouldYouRatherOpen(false)} socket={socket} roomId={roomId} myUserId={myUserId} />
            <WatchTogether isOpen={isWatchTogetherOpen} onClose={() => setIsWatchTogetherOpen(false)} socket={socket} roomId={roomId} myStream={myStream} remoteUsers={users} peersRef={peersRef} messages={messages} onSend={sendMessage} currentUserId={myUserId} />
            <PresentationMode isOpen={isPresentationOpen} onClose={() => setIsPresentationOpen(false)} socket={socket} roomId={roomId} peersRef={peersRef} />
            <SharedWhiteboard isOpen={isWhiteboardOpen} onClose={() => setIsWhiteboardOpen(false)} socket={socket} roomId={roomId} />
            <GoodnightMode isActive={isGoodnightMode} onToggle={setIsGoodnightMode} socket={socket} roomId={roomId} />
            <Pictionary isOpen={isPictionaryOpen} onClose={() => setIsPictionaryOpen(false)} socket={socket} roomId={roomId} />

            {/* On-screen mini timer */}
            {(timerState.isRunning || (timerState.remaining === 0 && timerState.totalSeconds > 0)) && !isTimerOpen && (
                <div
                    className={`${timerStyles.miniTimer} ${timerState.remaining === 0 ? timerStyles.miniTimerDone : ''}`}
                    onClick={() => setIsTimerOpen(true)}
                    title="Click to open timer"
                >
                    <div className={`${timerStyles.miniDot} ${!timerState.isRunning ? timerStyles.miniDotPaused : ''}`} />
                    <span className={timerStyles.miniTime}>
                        {String(Math.floor(timerState.remaining / 60)).padStart(2, '0')}:{String(timerState.remaining % 60).padStart(2, '0')}
                    </span>
                    <span className={timerStyles.miniLabel}>
                        {timerState.remaining === 0 ? 'Done!' : timerState.isRunning ? 'Focus' : 'Paused'}
                    </span>
                </div>
            )}

            <Controls
                toggleVideo={toggleVideo}
                toggleAudio={toggleAudio}
                leaveRoom={leaveRoom}
                isVideoOn={isVideoOn}
                isAudioOn={isAudioOn}
                sendEmoji={sendEmoji}
                roomId={roomId}
                toggleChat={toggleChat}
                isChatOpen={isChatOpen}
                unreadCount={unreadCount}
                onTimerToggle={() => setIsTimerOpen(p => !p)}
                onTodoToggle={() => setIsTodoOpen(p => !p)}
                onPresentation={() => setIsPresentationOpen(p => !p)}

                onTruthOrDare={() => setIsTruthOrDareOpen(true)}
                onWouldYouRather={() => setIsWouldYouRatherOpen(true)}
                onWatchTogether={() => setIsWatchTogetherOpen(p => !p)}
                onWhiteboard={() => setIsWhiteboardOpen(p => !p)}
                onGoodnight={() => setIsGoodnightMode(p => !p)}
                onPictionary={() => setIsPictionaryOpen(true)}
            />
        </div>
    );
}
