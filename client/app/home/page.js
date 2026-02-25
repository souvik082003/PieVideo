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



export default function HomePage() {
    const [joinId, setJoinId] = useState('');
    const { user, loading, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    // Couple features state
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



    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    // Load user data from Firestore
    useEffect(() => {
        if (!user) return;
        const loadUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
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
                        <button className={`${styles.themeBtn} ${theme === 'light' ? styles.themeActive : ''}`} onClick={() => setTheme('light')} title="Light">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                        </button>
                        <button className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeActive : ''}`} onClick={() => setTheme('dark')} title="Dark">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        </button>
                        <button className={`${styles.themeBtn} ${theme === 'system' ? styles.themeActive : ''}`} onClick={() => setTheme('system')} title="System">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        </button>
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
                    {/* Hero with Quick Start */}
                    <div className={styles.hero}>
                        <h1>Welcome back, <span>{displayName.split(' ')[0]}</span> 👋</h1>
                        <p>Start a call, join a room, or hang out with friends</p>
                        <button className={styles.quickStartBtn} onClick={createRoom}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            Start Instant Call
                        </button>
                    </div>

                    {/* Activity Stats Row */}
                    <div className={styles.statsRow}>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statNumber}>{callHistory.length}</span>
                                <span className={styles.statLabel}>Total Calls</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statNumber}>{formatDuration(totalCallMinutes)}</span>
                                <span className={styles.statLabel}>Call Time</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <div className={styles.statInfo}>
                                <span className={styles.statNumber}>{friends.length}</span>
                                <span className={styles.statLabel}>Friends</span>
                            </div>
                        </div>
                    </div>

                    {/* Room Templates */}
                    <div className={styles.sectionHeader}>
                        <h2>Quick Rooms</h2>
                        <p>Jump into a preset experience</p>
                    </div>
                    <div className={styles.templateGrid}>
                        {[
                            { name: 'Study Session', emoji: '📚', desc: 'Focus timer & shared tasks', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
                            { name: 'Movie Night', emoji: '🎬', desc: 'Watch together & react', gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' },
                            { name: 'Game Night', emoji: '🎮', desc: 'Play games & have fun', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
                            { name: 'Casual Chat', emoji: '☕', desc: 'Just hang out & talk', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
                        ].map((tmpl, i) => (
                            <div
                                key={tmpl.name}
                                className={styles.templateCard}
                                style={{ '--tmpl-gradient': tmpl.gradient, animationDelay: `${i * 0.08}s` }}
                                onClick={() => {
                                    const id = uuidv4();
                                    sessionStorage.setItem('userName', displayName);
                                    sessionStorage.setItem('roomType', tmpl.name);
                                    window.location.href = `/room/${id}`;
                                }}
                            >
                                <div className={styles.templateEmoji}>{tmpl.emoji}</div>
                                <div className={styles.templateInfo}>
                                    <h4>{tmpl.name}</h4>
                                    <p>{tmpl.desc}</p>
                                </div>
                                <svg className={styles.templateArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                        ))}
                    </div>

                    {/* Create / Join Room */}
                    <div className={styles.sectionHeader}>
                        <h2>Custom Room</h2>
                        <p>Create or join with a room code</p>
                    </div>
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
                            <h3>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                Recent Activity
                            </h3>
                        </div>
                        <div className={styles.callList}>
                            {callHistory.length === 0 ? (
                                <p className={styles.emptyText}>No calls yet. Start a video call above! 📹</p>
                            ) : (
                                callHistory.slice(0, 10).map(call => (
                                    <div key={call.id} className={styles.callItem}>
                                        <div className={styles.callIcon}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                                        </div>
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


        </div>
    );
}
