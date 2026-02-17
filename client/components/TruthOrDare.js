'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './TruthOrDare.module.css';

const TRUTHS = [
    "What was your first impression of me?",
    "What's your favorite memory of us together?",
    "What's something you've never told me?",
    "What do you find most attractive about me?",
    "When did you first realize you liked me?",
    "What's your biggest fear about our relationship?",
    "What's the most romantic thing you've ever imagined doing for me?",
    "What song reminds you of us?",
    "What's something I do that always makes you smile?",
    "If you could change one thing about our first date, what would it be?",
    "What do you dream about our future together?",
    "What's the sweetest thing I've ever done for you?",
    "What were you thinking during our first kiss?",
    "What's your favorite physical feature of mine?",
    "Have you ever had a dream about me? What happened?",
    "What's one thing you wish we could do more often?",
    "What do you love most about our relationship?",
    "What's something you're grateful for about us?",
    "When do you miss me the most?",
    "What's your favorite way to spend time with me?",
    "What was the moment you knew I was special?",
    "What's something you admire about me?",
    "What's our funniest moment together?",
    "If you could relive one day with me, which would it be?",
    "What's something you want to try with me?",
    "What's your favorite pet name for me?",
    "What's the most thoughtful gift you've received from me?",
    "What quality of mine do you hope our kids would inherit?",
    "What's one thing that always makes you think of me?",
    "What's the best advice I've ever given you?",
];

const DARES = [
    "Send me the last photo you took of me!",
    "Do your best impression of me for 30 seconds!",
    "Say 3 things you love about me while looking into the camera!",
    "Show me your most embarrassing saved photo!",
    "Sing our favorite song right now!",
    "Do a silly dance on camera for 15 seconds!",
    "Make your best 'I love you' face!",
    "Tell me a cheesy pickup line with a straight face!",
    "Give me 5 compliments in 10 seconds!",
    "Recreate our first selfie together right now!",
    "Talk in a romantic movie voice for 1 minute!",
    "Show me what's on your home screen!",
    "Do your best celebrity impression!",
    "Make a funny face and screenshot it!",
    "Whisper something sweet into the camera!",
    "Show me the last 3 things in your search history!",
    "Write my name on your hand and show me!",
    "Do 10 push-ups while saying I love you!",
    "Close your eyes and describe what I'm wearing!",
    "Read our last text conversation out loud!",
    "Draw a heart on a piece of paper and show it!",
    "Make up a short poem about us right now!",
    "Show your best 'surprised' face!",
    "Give me air kisses for 10 seconds!",
    "Tell me what you love most about us in baby talk!",
    "Do a dramatic reading of a love quote!",
    "Show me your secret talent!",
    "Wink at me as flirtatiously as you can!",
    "Tell me about your dream date with me!",
    "Act like you're proposing to me!",
];

export default function TruthOrDare({ isOpen, onClose, socket, roomId, onForceOpen }) {
    const [mode, setMode] = useState(null); // 'truth' | 'dare'
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isFlipping, setIsFlipping] = useState(false);
    const [history, setHistory] = useState([]);

    // Listen for partner's Truth or Dare picks
    useEffect(() => {
        if (!socket) return;
        const handleGameData = (data) => {
            if (data.game === 'truth-or-dare') {
                setIsFlipping(true);
                setMode(data.data.type);
                // Auto-open the panel if it's closed
                if (onForceOpen) onForceOpen();
                setTimeout(() => {
                    setCurrentQuestion(data.data.question);
                    setHistory(prev => [...prev, data.data.question]);
                    setIsFlipping(false);
                }, 600);
            }
        };
        socket.on('receive-game', handleGameData);
        return () => socket.off('receive-game', handleGameData);
    }, [socket, onForceOpen]);

    const pickQuestion = useCallback((type) => {
        setIsFlipping(true);
        setMode(type);

        setTimeout(() => {
            const pool = type === 'truth' ? TRUTHS : DARES;
            const available = pool.filter(q => !history.includes(q));
            const source = available.length > 0 ? available : pool;
            const question = source[Math.floor(Math.random() * source.length)];

            setCurrentQuestion(question);
            setHistory(prev => [...prev, question]);
            setIsFlipping(false);

            // Sync with partner
            if (socket && roomId) {
                socket.emit('send-game', {
                    roomId,
                    game: 'truth-or-dare',
                    data: { type, question },
                });
            }
        }, 600);
    }, [history, socket, roomId]);

    const reset = () => {
        setMode(null);
        setCurrentQuestion('');
        setIsFlipping(false);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span className={styles.headerIcon}>🎯</span>
                    <span className={styles.headerTitle}>Truth or Dare</span>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {!currentQuestion && !isFlipping ? (
                    <div className={styles.choiceArea}>
                        <p className={styles.prompt}>Choose your fate! 💕</p>
                        <div className={styles.choiceBtns}>
                            <button
                                className={`${styles.choiceBtn} ${styles.truthBtn}`}
                                onClick={() => pickQuestion('truth')}
                            >
                                <span className={styles.choiceEmoji}>💬</span>
                                <span className={styles.choiceLabel}>Truth</span>
                            </button>
                            <button
                                className={`${styles.choiceBtn} ${styles.dareBtn}`}
                                onClick={() => pickQuestion('dare')}
                            >
                                <span className={styles.choiceEmoji}>🔥</span>
                                <span className={styles.choiceLabel}>Dare</span>
                            </button>
                        </div>
                        {history.length > 0 && (
                            <p className={styles.counter}>Questions asked: {history.length}</p>
                        )}
                    </div>
                ) : (
                    <div className={styles.cardArea}>
                        <div className={`${styles.card} ${isFlipping ? styles.flipping : ''} ${mode === 'truth' ? styles.truthCard : styles.dareCard}`}>
                            <div className={styles.cardType}>
                                {mode === 'truth' ? '💬 Truth' : '🔥 Dare'}
                            </div>
                            <p className={styles.cardQuestion}>{currentQuestion}</p>
                        </div>
                        <div className={styles.cardActions}>
                            <button className={styles.nextBtn} onClick={() => pickQuestion(mode)}>
                                🔄 Next {mode === 'truth' ? 'Truth' : 'Dare'}
                            </button>
                            <button className={styles.switchBtn} onClick={reset}>
                                ↺ Choose Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
