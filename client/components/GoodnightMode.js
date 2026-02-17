'use client';

import { useState, useEffect } from 'react';
import styles from './GoodnightMode.module.css';

const AMBIENT_SOUNDS = [
    { id: 'rain', label: '🌧️ Rain', url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_711e377e0d.mp3' },
    { id: 'ocean', label: '🌊 Ocean', url: 'https://cdn.pixabay.com/audio/2024/11/04/audio_4956b4edd1.mp3' },
    { id: 'fire', label: '🔥 Fireplace', url: 'https://cdn.pixabay.com/audio/2024/06/11/audio_4abab22e43.mp3' },
];

export default function GoodnightMode({ isActive, onToggle, socket, roomId }) {
    const [activeSound, setActiveSound] = useState(null);
    const [audioEl, setAudioEl] = useState(null);
    const [autoTimer, setAutoTimer] = useState(null); // minutes remaining
    const [showTimerPicker, setShowTimerPicker] = useState(false);

    // Sync with partner
    useEffect(() => {
        if (!socket) return;
        const handleGoodnight = (data) => {
            if (data.action === 'enter' && !isActive) {
                onToggle(true);
            } else if (data.action === 'exit' && isActive) {
                onToggle(false);
            }
        };
        socket.on('receive-goodnight', handleGoodnight);
        return () => socket.off('receive-goodnight', handleGoodnight);
    }, [socket, isActive, onToggle]);

    // Auto disconnect timer
    useEffect(() => {
        if (!autoTimer || !isActive) return;
        const interval = setInterval(() => {
            setAutoTimer(prev => {
                if (prev <= 1) {
                    handleExit();
                    return null;
                }
                return prev - 1;
            });
        }, 60000); // every minute
        return () => clearInterval(interval);
    }, [autoTimer, isActive]);

    // Cleanup audio on unmount or deactivate
    useEffect(() => {
        if (!isActive && audioEl) {
            audioEl.pause();
            setAudioEl(null);
            setActiveSound(null);
        }
    }, [isActive]);

    const handleEnter = () => {
        onToggle(true);
        if (socket && roomId) {
            socket.emit('send-goodnight', { roomId, action: 'enter' });
        }
    };

    const handleExit = () => {
        onToggle(false);
        if (audioEl) {
            audioEl.pause();
            setAudioEl(null);
        }
        setActiveSound(null);
        setAutoTimer(null);
        if (socket && roomId) {
            socket.emit('send-goodnight', { roomId, action: 'exit' });
        }
    };

    const toggleSound = (sound) => {
        if (activeSound === sound.id) {
            audioEl?.pause();
            setAudioEl(null);
            setActiveSound(null);
        } else {
            if (audioEl) audioEl.pause();
            const audio = new Audio(sound.url);
            audio.loop = true;
            audio.volume = 0.3;
            audio.play().catch(() => { });
            setAudioEl(audio);
            setActiveSound(sound.id);
        }
    };

    if (!isActive) return null;

    return (
        <div className={styles.overlay}>
            {/* Stars */}
            <div className={styles.stars}>
                {Array.from({ length: 60 }).map((_, i) => (
                    <div
                        key={i}
                        className={styles.star}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                            width: `${2 + Math.random() * 3}px`,
                            height: `${2 + Math.random() * 3}px`,
                        }}
                    />
                ))}
            </div>

            {/* Moon */}
            <div className={styles.moon}>🌙</div>

            {/* Center content */}
            <div className={styles.content}>
                <h2 className={styles.title}>Goodnight 💤</h2>
                <p className={styles.subtitle}>Sweet dreams together...</p>

                {/* Ambient sounds */}
                <div className={styles.soundsRow}>
                    {AMBIENT_SOUNDS.map(s => (
                        <button
                            key={s.id}
                            className={`${styles.soundBtn} ${activeSound === s.id ? styles.soundActive : ''}`}
                            onClick={() => toggleSound(s)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Auto timer */}
                <div className={styles.timerSection}>
                    {autoTimer ? (
                        <p className={styles.timerText}>
                            Auto-disconnect in {autoTimer} min ⏰
                            <button className={styles.cancelTimer} onClick={() => setAutoTimer(null)}>✕</button>
                        </p>
                    ) : (
                        <div className={styles.timerRow}>
                            <span className={styles.timerLabel}>Sleep timer:</span>
                            {[15, 30, 60].map(m => (
                                <button
                                    key={m}
                                    className={styles.timerOption}
                                    onClick={() => setAutoTimer(m)}
                                >
                                    {m}m
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Wake up */}
                <button className={styles.wakeBtn} onClick={handleExit}>
                    ☀️ Wake Up
                </button>
            </div>
        </div>
    );
}
