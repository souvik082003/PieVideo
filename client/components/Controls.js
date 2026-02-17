'use client';

import { useState } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';
import styles from './Controls.module.css';

export default function Controls({
    toggleVideo, toggleAudio, leaveRoom,
    isVideoOn, isAudioOn, sendEmoji, roomId,
    toggleChat, isChatOpen, unreadCount,
    onTimerToggle, onTodoToggle,
    onLoveReaction, onTruthOrDare, onWouldYouRather, onWatchTogether, onWhiteboard, onGoodnight, onPictionary
}) {
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { theme, setTheme } = useTheme();

    const reactionEmojis = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😮', '🙏'];

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const closePopups = () => { setIsEmojiOpen(false); setIsThemeOpen(false); setIsGameOpen(false); };

    return (
        <div className={styles.controlsBar}>
            {/* Left: Room ID + Productivity + Couple */}
            <div className={styles.leftGroup}>
                <button className={styles.roomIdBtn} onClick={copyRoomId} title="Copy Room ID">
                    <span className={styles.roomIdText}>{roomId?.slice(0, 8)}…</span>
                    <span className={styles.copyIcon}>{copied ? '✓' : '📋'}</span>
                </button>

                <button className={styles.toolBtn} onClick={() => { closePopups(); onTimerToggle?.(); }} title="Focus Timer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                    </svg>
                </button>

                <button className={styles.toolBtn} onClick={() => { closePopups(); onTodoToggle?.(); }} title="Tasks">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                </button>

                <div className={styles.divider} />

                {/* Love Reactions */}
                <button className={`${styles.toolBtn} ${styles.coupleBtn}`} onClick={() => { closePopups(); onLoveReaction?.(); }} title="Love Reactions 💕">
                    <span style={{ fontSize: '20px' }}>💕</span>
                </button>

                {/* Games dropdown */}
                <div className={styles.popupWrapper}>
                    <button className={`${styles.toolBtn} ${styles.coupleBtn}`} onClick={() => { setIsGameOpen(!isGameOpen); setIsEmojiOpen(false); setIsThemeOpen(false); }} title="Games">
                        <span style={{ fontSize: '20px' }}>🎮</span>
                    </button>
                    {isGameOpen && (
                        <div className={`${styles.popup} ${styles.gamePopup}`}>
                            <button className={styles.gameOption} onClick={() => { onTruthOrDare?.(); setIsGameOpen(false); }}>
                                <span>🎯</span><span>Truth or Dare</span>
                            </button>
                            <button className={styles.gameOption} onClick={() => { onWouldYouRather?.(); setIsGameOpen(false); }}>
                                <span>🤔</span><span>Would You Rather</span>
                            </button>
                            <button className={styles.gameOption} onClick={() => { onPictionary?.(); setIsGameOpen(false); }}>
                                <span>🖌️</span><span>Draw & Guess</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Watch Together */}
                <button className={`${styles.toolBtn} ${styles.coupleBtn}`} onClick={() => { closePopups(); onWatchTogether?.(); }} title="Watch Together 📺">
                    <span style={{ fontSize: '20px' }}>📺</span>
                </button>

                {/* Whiteboard */}
                <button className={`${styles.toolBtn} ${styles.coupleBtn}`} onClick={() => { closePopups(); onWhiteboard?.(); }} title="Draw Together 🎨">
                    <span style={{ fontSize: '20px' }}>🎨</span>
                </button>

                {/* Goodnight Mode */}
                <button className={`${styles.toolBtn} ${styles.coupleBtn}`} onClick={() => { closePopups(); onGoodnight?.(); }} title="Goodnight Mode 🌙">
                    <span style={{ fontSize: '20px' }}>🌙</span>
                </button>

            </div>

            {/* Center: Main controls */}
            <div className={styles.centerGroup}>
                {/* Mic */}
                <button
                    className={`${styles.controlBtn} ${!isAudioOn ? styles.controlOff : ''}`}
                    onClick={toggleAudio}
                    title={isAudioOn ? 'Mute' : 'Unmute'}
                >
                    {isAudioOn ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .67-.1 1.32-.27 1.93" />
                            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    )}
                </button>

                {/* Camera */}
                <button
                    className={`${styles.controlBtn} ${!isVideoOn ? styles.controlOff : ''}`}
                    onClick={toggleVideo}
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isVideoOn ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34" />
                            <line x1="23" y1="1" x2="1" y2="23" />
                            <polygon points="23 7 16 12 23 17 23 7" />
                        </svg>
                    )}
                </button>

                {/* Hang up */}
                <button
                    className={`${styles.controlBtn} ${styles.leaveBtn}`}
                    onClick={leaveRoom}
                    title="Leave room"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                        <line x1="23" y1="1" x2="1" y2="23" />
                    </svg>
                </button>

                {/* Emoji reactions */}
                <div className={styles.popupWrapper}>
                    <button
                        className={styles.controlBtn}
                        onClick={() => { setIsEmojiOpen(!isEmojiOpen); setIsThemeOpen(false); setIsGameOpen(false); }}
                        title="Reactions"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                    </button>
                    {isEmojiOpen && (
                        <div className={styles.popup}>
                            {reactionEmojis.map(e => (
                                <button key={e} className={styles.emojiOption} onClick={() => { sendEmoji(e); setIsEmojiOpen(false); }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Theme */}
                <div className={styles.popupWrapper}>
                    <button
                        className={styles.controlBtn}
                        onClick={() => { setIsThemeOpen(!isThemeOpen); setIsEmojiOpen(false); setIsGameOpen(false); }}
                        title="Change theme"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </button>
                    {isThemeOpen && (
                        <div className={`${styles.popup} ${styles.themePopup}`}>
                            {Object.entries(THEMES).map(([key, t]) => (
                                <button
                                    key={key}
                                    className={`${styles.themeOption} ${theme === key ? styles.themeActive : ''}`}
                                    onClick={() => { setTheme(key); setIsThemeOpen(false); }}
                                >
                                    <span>{t.icon}</span>
                                    <span>{t.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Chat toggle */}
            <div className={styles.rightGroup}>
                <button
                    className={`${styles.controlBtn} ${isChatOpen ? styles.chatActive : ''}`}
                    onClick={toggleChat}
                    title="Toggle chat"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {unreadCount > 0 && !isChatOpen && (
                        <span className={styles.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
