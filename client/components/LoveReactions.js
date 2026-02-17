'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './LoveReactions.module.css';

const LOVE_REACTIONS = [
    { id: 'hearts', emoji: '❤️', label: 'Hearts', particles: ['❤️', '💕', '💗', '💖', '💓', '💘'] },
    { id: 'kiss', emoji: '💋', label: 'Kiss', particles: ['💋', '😘', '💋', '😘', '💋', '💋'] },
    { id: 'hug', emoji: '🤗', label: 'Hug', particles: ['🤗', '🫂', '💛', '🧡', '🤗', '🫂'] },
    { id: 'miss', emoji: '🥺', label: 'Miss You', particles: ['🥺', '😢', '💔', '🥺', '😿', '💭'] },
    { id: 'goodnight', emoji: '🌙', label: 'Good Night', particles: ['🌙', '⭐', '✨', '🌟', '💫', '🌙'] },
];

export default function LoveReactions({ isOpen, onClose, onSendReaction }) {
    if (!isOpen) return null;

    return (
        <div className={styles.reactionBar}>
            {LOVE_REACTIONS.map(r => (
                <button
                    key={r.id}
                    className={styles.reactionBtn}
                    onClick={() => { onSendReaction(r); onClose(); }}
                    title={r.label}
                >
                    <span className={styles.reactionEmoji}>{r.emoji}</span>
                    <span className={styles.reactionLabel}>{r.label}</span>
                </button>
            ))}
        </div>
    );
}

// Floating animation overlay — renders particles on screen
export function LoveAnimationOverlay({ activeReaction }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!activeReaction) return;

        const newParticles = [];
        const count = activeReaction.id === 'hearts' ? 20 : 12;

        for (let i = 0; i < count; i++) {
            const emoji = activeReaction.particles[Math.floor(Math.random() * activeReaction.particles.length)];
            newParticles.push({
                id: `${Date.now()}-${i}`,
                emoji,
                left: Math.random() * 100,
                delay: Math.random() * 1.5,
                duration: 2 + Math.random() * 2,
                size: 1 + Math.random() * 1.5,
                wobble: (Math.random() - 0.5) * 40,
            });
        }
        setParticles(newParticles);

        const timeout = setTimeout(() => setParticles([]), 5000);
        return () => clearTimeout(timeout);
    }, [activeReaction]);

    if (particles.length === 0) return null;

    return (
        <div className={styles.animationOverlay}>
            {particles.map(p => (
                <span
                    key={p.id}
                    className={styles.particle}
                    style={{
                        left: `${p.left}%`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        fontSize: `${p.size}rem`,
                        '--wobble': `${p.wobble}px`,
                    }}
                >
                    {p.emoji}
                </span>
            ))}
            {activeReaction?.id === 'hug' && <div className={styles.hugGlow} />}
            {activeReaction?.id === 'goodnight' && <div className={styles.nightOverlay} />}
        </div>
    );
}

export { LOVE_REACTIONS };
