'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import {
    doc, getDoc, setDoc, updateDoc, limit,
    collection, addDoc, query, where, orderBy, onSnapshot, getDocs, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import Image from 'next/image';
import styles from './page.module.css';

const MOODS = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😍', label: 'In Love' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '😴', label: 'Tired' },
    { emoji: '🥰', label: 'Missing You' },
];

const MILESTONES = [50, 100, 150, 200, 250, 300, 365, 500, 730, 1000];

export default function HomePage() {
    const [joinId, setJoinId] = useState('');
    const { user, loading, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    // Couple features state
    const [anniversaryDate, setAnniversaryDate] = useState(null);
    const [daysCount, setDaysCount] = useState(0);
    const [currentMood, setCurrentMood] = useState(null);
    const [callHistory, setCallHistory] = useState([]);
    const [totalCallMinutes, setTotalCallMinutes] = useState(0);

    // Friends state
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendEmail, setFriendEmail] = useState('');
    const [requestStatus, setRequestStatus] = useState('');

    // Messaging state
    const [activeChatFriend, setActiveChatFriend] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef(null);

    // Anniversary popup
    const [showAnniversary, setShowAnniversary] = useState(false);
    const [milestoneDay, setMilestoneDay] = useState(0);

    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    // Load user data from Firestore
    useEffect(() => {
        if (!user) return;
        const loadUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.anniversaryDate) {
                        setAnniversaryDate(data.anniversaryDate);
                        const start = new Date(data.anniversaryDate);
                        const now = new Date();
                        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                        setDaysCount(days);
                        // Check milestone
                        const dismissed = data.dismissedMilestones || [];
                        const milestone = MILESTONES.find(m => m === days && !dismissed.includes(m));
                        if (milestone) {
                            setMilestoneDay(milestone);
                            setShowAnniversary(true);
                        }
                    }
                    if (data.currentMood) setCurrentMood(data.currentMood);
                } else {
                    // Create user doc
                    await setDoc(doc(db, 'users', user.uid), {
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0],
                        createdAt: serverTimestamp(),
                    });
                }
            } catch (err) {
                console.warn('Firestore user load failed:', err);
            }
        };
        loadUserData();
    }, [user]);

    // Load call history
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'callHistory'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            const calls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCallHistory(calls);
            const total = calls.reduce((sum, c) => sum + (c.durationMinutes || 0), 0);
            setTotalCallMinutes(total);
        }, (err) => console.warn('Call history error:', err));
        return () => unsub();
    }, [user]);

    // Load friends
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'friends'),
            where('userId', '==', user.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn('Friends error:', err));
        return () => unsub();
    }, [user]);

    // Load friend requests
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'friendRequests'),
            where('toEmail', '==', user.email),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setFriendRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.warn('Requests error:', err));
        return () => unsub();
    }, [user]);

    // Load messages when active chat changes
    useEffect(() => {
        if (!user || !activeChatFriend) {
            setChatMessages([]);
            return;
        }
        const ids = [user.uid, activeChatFriend.friendUid].sort();
        const chatId = ids.join('_');
        const q = query(
            collection(db, 'directMessages'),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'asc'),
            limit(50)
        );
        const unsub = onSnapshot(q, (snap) => {
            setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }, (err) => console.warn('Chat error:', err));
        return () => unsub();
    }, [user, activeChatFriend]);

    if (loading || !user) {
        return <div className={styles.page}><div className={styles.bgOrbs}><div className={styles.orb} /><div className={styles.orb} /></div></div>;
    }

    const displayName = user.displayName || user.email?.split('@')[0] || 'User';

    const createRoom = () => {
        const id = uuidv4();
        sessionStorage.setItem('userName', displayName);
        window.location.href = `/room/${id}`;
    };

    const joinRoom = () => {
        const id = joinId.trim();
        if (!id) return;
        sessionStorage.setItem('userName', displayName);
        window.location.href = `/room/${id}`;
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    // Set anniversary date
    const handleSetDate = async (dateStr) => {
        setAnniversaryDate(dateStr);
        const start = new Date(dateStr);
        const now = new Date();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        setDaysCount(days);
        try {
            await setDoc(doc(db, 'users', user.uid), { anniversaryDate: dateStr }, { merge: true });
        } catch (err) { console.warn('Save date failed:', err); }
    };

    // Set mood
    const handleSetMood = async (mood) => {
        setCurrentMood(mood);
        try {
            await setDoc(doc(db, 'users', user.uid), { currentMood: mood }, { merge: true });
        } catch (err) { console.warn('Save mood failed:', err); }
    };

    // Send friend request
    const sendFriendRequest = async () => {
        const email = friendEmail.trim().toLowerCase();
        if (!email || email === user.email.toLowerCase()) {
            setRequestStatus('Cannot add yourself');
            return;
        }
        try {
            // Check if already friends
            const existingQ = query(
                collection(db, 'friends'),
                where('userId', '==', user.uid),
                where('friendEmail', '==', email)
            );
            const existingDocs = await getDocs(existingQ);
            if (!existingDocs.empty) {
                setRequestStatus('Already friends!');
                setTimeout(() => setRequestStatus(''), 2000);
                return;
            }

            await addDoc(collection(db, 'friendRequests'), {
                fromUid: user.uid,
                fromEmail: user.email,
                fromName: displayName,
                toEmail: email,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            setFriendEmail('');
            setRequestStatus('Request sent! ✓');
            setTimeout(() => setRequestStatus(''), 2000);
        } catch (err) {
            console.warn('Send request failed:', err);
            setRequestStatus('Failed to send');
        }
    };

    // Accept friend request
    const acceptRequest = async (request) => {
        try {
            // Add both directions
            await addDoc(collection(db, 'friends'), {
                userId: user.uid,
                friendEmail: request.fromEmail,
                friendName: request.fromName,
                friendUid: request.fromUid,
                addedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'friends'), {
                userId: request.fromUid,
                friendEmail: user.email,
                friendName: displayName,
                friendUid: user.uid,
                addedAt: serverTimestamp(),
            });
            await deleteDoc(doc(db, 'friendRequests', request.id));
        } catch (err) {
            console.warn('Accept failed:', err);
        }
    };

    // Decline friend request
    const declineRequest = async (request) => {
        try {
            await deleteDoc(doc(db, 'friendRequests', request.id));
        } catch (err) { console.warn('Decline failed:', err); }
    };

    // Dismiss milestone
    const dismissMilestone = async () => {
        setShowAnniversary(false);
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const dismissed = userDoc.data()?.dismissedMilestones || [];
            await setDoc(doc(db, 'users', user.uid), {
                dismissedMilestones: [...dismissed, milestoneDay]
            }, { merge: true });
        } catch (err) { console.warn('Dismiss milestone failed:', err); }
    };

    // Call a friend
    const callFriend = (friend) => {
        const id = uuidv4();
        sessionStorage.setItem('userName', displayName);
        router.push(`/room/${id}`);
    };

    const formatDuration = (mins) => {
        const hrs = Math.floor(mins / 60);
        const m = mins % 60;
        if (hrs > 0) return `${hrs}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className={styles.page}>
            <div className={styles.bgOrbs}>
                <div className={styles.orb} />
                <div className={styles.orb} />
            </div>

            {/* Top bar */}
            <header className={styles.topBar}>
                <div className={styles.logoGroup}>
                    <Image src="/pie_logo.svg" alt="PieVideo" width={34} height={34} />
                    <span className={styles.brandName}>Pie<span>Video</span></span>
                </div>

                <div className={styles.topRight}>
                    <div className={styles.themeRow}>
                        {Object.entries(THEMES).map(([key, t]) => (
                            <button
                                key={key}
                                className={`${styles.themeBtn} ${theme === key ? styles.themeActive : ''}`}
                                onClick={() => setTheme(key)}
                                title={t.name}
                            >
                                {t.icon}
                            </button>
                        ))}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
                        <span className={styles.userName}>{displayName}</span>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
                </div>
            </header>

            {/* Body: Sidebar + Main */}
            <div className={styles.bodyLayout}>
                {/* LEFT SIDEBAR */}
                <aside className={styles.sidebar}>
                    {/* Add Friend */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.sidebarTitle}>Add Friend</div>
                        <div className={styles.addFriendRow}>
                            <input
                                type="email"
                                value={friendEmail}
                                onChange={e => setFriendEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendFriendRequest()}
                                placeholder="Enter email..."
                                className={styles.addFriendInput}
                            />
                            <button
                                className={styles.addFriendBtn}
                                onClick={sendFriendRequest}
                                disabled={!friendEmail.trim()}
                            >
                                Add
                            </button>
                        </div>
                        {requestStatus && (
                            <p style={{ fontSize: '0.78rem', color: requestStatus.includes('✓') ? '#22c55e' : '#f87171', marginTop: 4 }}>
                                {requestStatus}
                            </p>
                        )}
                    </div>

                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                        <div className={styles.sidebarSection}>
                            <div className={styles.sidebarTitle}>Friend Requests ({friendRequests.length})</div>
                            {friendRequests.map(req => (
                                <div key={req.id} className={styles.requestItem}>
                                    <div className={styles.requestInfo}>
                                        <div className={styles.requestAvatar}>
                                            {req.fromName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div className={styles.requestName}>{req.fromName}</div>
                                            <div className={styles.requestEmail}>{req.fromEmail}</div>
                                        </div>
                                    </div>
                                    <div className={styles.requestActions}>
                                        <button className={styles.acceptBtn} onClick={() => acceptRequest(req)} title="Accept">✓</button>
                                        <button className={styles.declineBtn} onClick={() => declineRequest(req)} title="Decline">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Friends List */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.sidebarTitle}>Friends ({friends.length})</div>
                        {friends.length === 0 ? (
                            <p className={styles.emptyText}>No friends yet. Add someone above! 💕</p>
                        ) : (
                            friends.map(f => (
                                <div key={f.id} className={`${styles.friendItem} ${activeChatFriend?.id === f.id ? styles.friendItemActive : ''}`}
                                    onClick={() => setActiveChatFriend(activeChatFriend?.id === f.id ? null : f)}>
                                    <div className={styles.friendAvatar}>
                                        {f.friendName?.charAt(0).toUpperCase() || '?'}
                                        <div className={styles.onlineDot} />
                                    </div>
                                    <div className={styles.friendInfo}>
                                        <div className={styles.friendName}>{f.friendName}</div>
                                        <div className={styles.friendStatus}>{f.friendEmail}</div>
                                    </div>
                                    <button className={styles.callFriendBtn} onClick={(e) => { e.stopPropagation(); callFriend(f); }} title="Call">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <polygon points="23 7 16 12 23 17 23 7" />
                                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Inline Chat Panel */}
                    {activeChatFriend && (
                        <div className={styles.chatPanel}>
                            <div className={styles.chatHeader}>
                                <span>💬 {activeChatFriend.friendName}</span>
                                <button className={styles.chatClose} onClick={() => setActiveChatFriend(null)}>✕</button>
                            </div>
                            <div className={styles.chatMessages}>
                                {chatMessages.length === 0 && (
                                    <p className={styles.chatEmpty}>Say hi! 👋</p>
                                )}
                                {chatMessages.map(msg => (
                                    <div key={msg.id} className={`${styles.chatBubble} ${msg.senderUid === user.uid ? styles.chatBubbleMine : styles.chatBubbleTheirs}`}>
                                        <span>{msg.text}</span>
                                        <span className={styles.chatTime}>
                                            {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                                        </span>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className={styles.chatInputRow}>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && chatInput.trim()) {
                                            const ids = [user.uid, activeChatFriend.friendUid].sort();
                                            addDoc(collection(db, 'directMessages'), {
                                                chatId: ids.join('_'),
                                                senderUid: user.uid,
                                                senderName: displayName,
                                                text: chatInput.trim(),
                                                createdAt: serverTimestamp(),
                                            });
                                            setChatInput('');
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    className={styles.chatInputField}
                                />
                                <button
                                    className={styles.chatSendBtn}
                                    onClick={() => {
                                        if (!chatInput.trim()) return;
                                        const ids = [user.uid, activeChatFriend.friendUid].sort();
                                        addDoc(collection(db, 'directMessages'), {
                                            chatId: ids.join('_'),
                                            senderUid: user.uid,
                                            senderName: displayName,
                                            text: chatInput.trim(),
                                            createdAt: serverTimestamp(),
                                        });
                                        setChatInput('');
                                    }}
                                    disabled={!chatInput.trim()}
                                >➤</button>
                            </div>
                        </div>
                    )}
                </aside>

                {/* RIGHT MAIN AREA */}
                <main className={styles.main}>
                    <div className={styles.hero}>
                        <h1>Welcome back, <span>{displayName.split(' ')[0]}</span> 👋</h1>
                        <p>Your couple dashboard & video calls</p>
                    </div>

                    {/* Days Counter + Mood Check-in */}
                    <div className={styles.coupleRow}>
                        {/* Days Together */}
                        <div className={styles.daysCard}>
                            <div className={styles.daysHeart}>❤️</div>
                            {anniversaryDate ? (
                                <div className={styles.daysInfo}>
                                    <h2>Together for <span>{daysCount}</span> days</h2>
                                    <p>Since {new Date(anniversaryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            ) : (
                                <div className={styles.daysSetup}>
                                    <p>When did your journey begin? 💕</p>
                                    <input
                                        type="date"
                                        className={styles.dateInput}
                                        onChange={e => handleSetDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Mood Check-in */}
                        <div className={styles.moodCard}>
                            <h3>How are you feeling? 💭</h3>
                            <div className={styles.moodGrid}>
                                {MOODS.map(m => (
                                    <button
                                        key={m.label}
                                        className={`${styles.moodBtn} ${currentMood === m.label ? styles.moodBtnActive : ''}`}
                                        onClick={() => handleSetMood(m.label)}
                                    >
                                        <span className={styles.moodEmoji}>{m.emoji}</span>
                                        <span className={styles.moodLabel}>{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Create / Join Room */}
                    <div className={styles.actions}>
                        <div className={styles.actionCard} onClick={createRoom}>
                            <div className={styles.cardIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polygon points="23 7 16 12 23 17 23 7" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </div>
                            <h3>New Room</h3>
                            <p>Create a private video room and invite others</p>
                        </div>

                        <div className={styles.actionCard}>
                            <div className={styles.cardIcon}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                            </div>
                            <h3>Join Room</h3>
                            <p>Enter a room ID to join an existing session</p>
                            <div className={styles.joinRow} onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={joinId}
                                    onChange={e => setJoinId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                                    placeholder="Paste room ID..."
                                    className={styles.joinInput}
                                />
                                <button className={styles.joinBtn} onClick={joinRoom} disabled={!joinId.trim()}>
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Call History */}
                    <div className={styles.callHistoryCard}>
                        <div className={styles.callHistoryHeader}>
                            <h3>📞 Call History</h3>
                            <span className={styles.totalHours}>
                                ❤️ {formatDuration(totalCallMinutes)} together
                            </span>
                        </div>
                        <div className={styles.callList}>
                            {callHistory.length === 0 ? (
                                <p className={styles.emptyText}>No calls yet. Start a video call above! 📹</p>
                            ) : (
                                callHistory.slice(0, 10).map(call => (
                                    <div key={call.id} className={styles.callItem}>
                                        <div className={styles.callIcon}>📞</div>
                                        <div className={styles.callDetails}>
                                            <div className={styles.callPartner}>{call.partnerName || 'Video Call'}</div>
                                            <div className={styles.callDate}>
                                                {call.date?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Recent'}
                                            </div>
                                        </div>
                                        <div className={styles.callDuration}>{formatDuration(call.durationMinutes || 0)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Anniversary Popup */}
            {showAnniversary && (
                <div className={styles.anniversaryOverlay} onClick={dismissMilestone}>
                    <div className={styles.anniversaryCard} onClick={e => e.stopPropagation()}>
                        <div className={styles.anniversaryEmoji}>🎉</div>
                        <h2>Happy <span>{milestoneDay} Days</span> Together!</h2>
                        <p>Every day with you is a celebration. Here's to many more beautiful moments together! 💕</p>
                        <button className={styles.anniversaryDismiss} onClick={dismissMilestone}>
                            Thank You! ❤️
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
