'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FocusTimer.module.css';

const PRESETS = [
    { label: '25 min', seconds: 25 * 60 },
    { label: '15 min', seconds: 15 * 60 },
    { label: '5 min', seconds: 5 * 60 },
    { label: '50 min', seconds: 50 * 60 },
];

export default function FocusTimer({ isOpen, onClose, onTimerUpdate }) {
    const [totalSeconds, setTotalSeconds] = useState(25 * 60);
    const [remaining, setRemaining] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [customMin, setCustomMin] = useState('');
    const [customSec, setCustomSec] = useState('');
    const intervalRef = useRef(null);
    const audioCtxRef = useRef(null);

    // Broadcast timer state to parent for on-screen display
    useEffect(() => {
        if (onTimerUpdate) {
            onTimerUpdate({ remaining, isRunning, totalSeconds });
        }
    }, [remaining, isRunning, totalSeconds, onTimerUpdate]);

    const playAlarm = useCallback(() => {
        try {
            const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = ctx;

            // 3 escalating beeps
            const beeps = [
                { freq: 700, delay: 0 },
                { freq: 900, delay: 0.35 },
                { freq: 1100, delay: 0.7 },
                { freq: 700, delay: 1.1 },
                { freq: 900, delay: 1.45 },
                { freq: 1100, delay: 1.8 },
            ];

            beeps.forEach(({ freq, delay }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.25);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.25);
            });
        } catch (e) {
            console.warn('Audio alarm failed:', e);
        }
    }, []);

    useEffect(() => {
        if (isRunning && remaining > 0) {
            intervalRef.current = setInterval(() => {
                setRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        setIsRunning(false);
                        playAlarm();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning, remaining, playAlarm]);

    const selectPreset = (idx) => {
        setSelectedPreset(idx);
        setTotalSeconds(PRESETS[idx].seconds);
        setRemaining(PRESETS[idx].seconds);
        setIsRunning(false);
        setCustomMin('');
        setCustomSec('');
    };

    const applyCustom = () => {
        const m = parseInt(customMin) || 0;
        const s = parseInt(customSec) || 0;
        const total = m * 60 + s;
        if (total <= 0) return;
        setTotalSeconds(total);
        setRemaining(total);
        setIsRunning(false);
        setSelectedPreset(-1);
        // Clear inputs so user can type new values next time
        setCustomMin('');
        setCustomSec('');
    };

    const toggleTimer = () => {
        // Resume AudioContext if suspended (browser autoplay policy)
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        if (remaining === 0) {
            setRemaining(totalSeconds);
        }
        setIsRunning(prev => !prev);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setRemaining(totalSeconds);
        // Clear custom inputs so user can enter new values
        setCustomMin('');
        setCustomSec('');
    };

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.panel}>
                <div className={styles.header}>
                    <h3>⏱️ Focus Timer</h3>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.timerRing}>
                    <svg viewBox="0 0 160 160" className={styles.svg}>
                        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
                        <circle
                            cx="80" cy="80" r={radius}
                            fill="none"
                            stroke="url(#timerGrad)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 80 80)"
                            className={styles.progressRing}
                        />
                        <defs>
                            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className={styles.timeDisplay}>
                        <span className={styles.timeDigits}>
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </span>
                        <span className={styles.timeLabel}>
                            {remaining === 0 ? '🎉 Done!' : isRunning ? 'Focusing...' : 'Ready'}
                        </span>
                    </div>
                </div>

                {/* Presets */}
                <div className={styles.presets}>
                    {PRESETS.map((p, i) => (
                        <button
                            key={i}
                            className={`${styles.presetBtn} ${selectedPreset === i ? styles.presetActive : ''}`}
                            onClick={() => selectPreset(i)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Custom timer */}
                <div className={styles.customRow}>
                    <input
                        type="number"
                        min="0"
                        max="180"
                        placeholder="Min"
                        value={customMin}
                        onChange={e => setCustomMin(e.target.value)}
                        className={styles.customInput}
                    />
                    <span className={styles.customSep}>:</span>
                    <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Sec"
                        value={customSec}
                        onChange={e => setCustomSec(e.target.value)}
                        className={styles.customInput}
                    />
                    <button
                        className={styles.customSetBtn}
                        onClick={applyCustom}
                        disabled={!(parseInt(customMin) > 0 || parseInt(customSec) > 0)}
                    >
                        Set
                    </button>
                </div>

                <div className={styles.controls}>
                    <button className={`${styles.timerBtn} ${styles.resetBtn}`} onClick={resetTimer}>
                        ↺ Reset
                    </button>
                    <button className={`${styles.timerBtn} ${styles.startBtn}`} onClick={toggleTimer}>
                        {isRunning ? '⏸ Pause' : remaining === 0 ? '🔄 Restart' : '▶ Start'}
                    </button>
                </div>
            </div>
        </div>
    );
}
