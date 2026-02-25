'use client';

import { useState } from 'react';
import styles from './Controls.module.css';

export default function Controls({
    toggleVideo, toggleAudio, leaveRoom,
    isVideoOn, isAudioOn, roomId,
    toggleChat, isChatOpen, unreadCount,
    onTimerToggle, onTodoToggle,
    onLoveReaction, onTruthOrDare, onWouldYouRather, onWatchTogether, onWhiteboard, onPictionary
}) {
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const closeAll = () => { setIsGameOpen(false); setIsMoreOpen(false); };

    return (
        <div className={styles.controlsBar}>

            {/* Far left — Room label */}
            <div className={styles.roomLabel} onClick={copyRoomId} title="Copy Room ID">
                <span className={styles.roomText}>{roomId?.slice(0, 8)}</span>
                {copied && <span className={styles.copiedTag}>Copied!</span>}
            </div>

            {/* Center area */}
            <div className={styles.centerArea}>

                {/* Pill 1: Mic & Camera */}
                <div className={styles.pill}>
                    <button
                        className={`${styles.pillBtn} ${!isAudioOn ? styles.pillBtnOff : ''}`}
                        onClick={toggleAudio}
                        title={isAudioOn ? 'Mute' : 'Unmute'}
                    >
                        {isAudioOn ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .67-.1 1.32-.27 1.93" />
                                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                    </button>

                    <button
                        className={`${styles.pillBtn} ${!isVideoOn ? styles.pillBtnOff : ''}`}
                        onClick={toggleVideo}
                        title={isVideoOn ? 'Camera off' : 'Camera on'}
                    >
                        {isVideoOn ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34" />
                                <line x1="23" y1="1" x2="1" y2="23" />
                                <polygon points="23 7 16 12 23 17 23 7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Pill 2: Features */}
                <div className={styles.pill}>
                    {/* Love */}
                    <button className={styles.pillBtn} onClick={() => { closeAll(); onLoveReaction?.(); }} title="Love Reactions">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>

                    {/* Games */}
                    <div className={styles.popupWrapper}>
                        <button className={styles.pillBtn} onClick={() => { setIsGameOpen(!isGameOpen); setIsMoreOpen(false); }} title="Games">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
                                <line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" />
                                <rect x="2" y="6" width="20" height="12" rx="2" />
                            </svg>
                        </button>
                        {isGameOpen && (
                            <div className={`${styles.popup} ${styles.menuPopup}`}>
                                <button className={styles.menuItem} onClick={() => { onTruthOrDare?.(); setIsGameOpen(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    <span>Truth or Dare</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onWouldYouRather?.(); setIsGameOpen(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
                                    <span>Would You Rather</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onPictionary?.(); setIsGameOpen(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
                                    <span>Draw & Guess</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Whiteboard */}
                    <button className={styles.pillBtn} onClick={() => { closeAll(); onWhiteboard?.(); }} title="Whiteboard">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            <path d="M2 2l7.586 7.586" />
                            <circle cx="11" cy="11" r="2" />
                        </svg>
                    </button>

                    {/* Watch Together */}
                    <button className={styles.pillBtn} onClick={() => { closeAll(); onWatchTogether?.(); }} title="Watch Together">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                    </button>

                    {/* More (timer, tasks, emoji, theme, goodnight) */}
                    <div className={styles.popupWrapper}>
                        <button className={styles.pillBtn} onClick={() => { setIsMoreOpen(!isMoreOpen); setIsGameOpen(false); }} title="More">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="19" cy="12" r="1.5" />
                                <circle cx="5" cy="12" r="1.5" />
                            </svg>
                        </button>
                        {isMoreOpen && (
                            <div className={`${styles.popup} ${styles.menuPopup}`}>
                                <button className={styles.menuItem} onClick={() => { onTimerToggle?.(); setIsMoreOpen(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                                    <span>Focus Timer</span>
                                </button>
                                <button className={styles.menuItem} onClick={() => { onTodoToggle?.(); setIsMoreOpen(false); }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                                    <span>Tasks</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>


                {/* Leave button — wide red rounded rectangle */}
                <button className={styles.leaveBtn} onClick={leaveRoom} title="Leave room">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                        <line x1="23" y1="1" x2="1" y2="23" />
                    </svg>
                </button>
            </div>

            {/* Right — Chat toggle */}
            <div className={styles.rightGroup}>
                <button
                    className={`${styles.chatBtn} ${isChatOpen ? styles.chatBtnActive : ''}`}
                    onClick={toggleChat}
                    title="Chat"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {unreadCount > 0 && !isChatOpen && (
                        <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
