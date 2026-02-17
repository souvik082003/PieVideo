'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './WouldYouRather.module.css';

const QUESTIONS = [
    { a: "Go on a surprise vacation", b: "Have a surprise party thrown for you" },
    { a: "Cook dinner together every night", b: "Go out to eat together every night" },
    { a: "Relive our first date", b: "Fast-forward to our 50th anniversary" },
    { a: "Have a movie marathon day", b: "Have an adventure day outdoors" },
    { a: "Read each other's minds for a day", b: "Switch bodies for a day" },
    { a: "Live in a cozy cabin in the mountains", b: "Live in a beach house by the ocean" },
    { a: "Receive a love letter every day", b: "Receive a surprise gift once a month" },
    { a: "Dance together in the rain", b: "Watch the sunset together" },
    { a: "Have breakfast in bed every day", b: "Have a romantic dinner every night" },
    { a: "Travel the world together", b: "Build our dream home together" },
    { a: "Always know what I'm thinking", b: "Always know what I'm feeling" },
    { a: "Have a pet together", b: "Have a garden together" },
    { a: "Cuddle on the couch all day", b: "Go on a road trip adventure" },
    { a: "Get matching tattoos", b: "Write our own wedding vows" },
    { a: "Learn to dance together", b: "Learn to cook together" },
    { a: "Wake up early for sunrise", b: "Stay up late stargazing" },
    { a: "Have a picnic in the park", b: "Have a fancy restaurant date" },
    { a: "Give up social media for a year", b: "Give up TV shows for a year" },
    { a: "Take a pottery class together", b: "Take a painting class together" },
    { a: "Spend the holidays at a ski lodge", b: "Spend the holidays on a tropical beach" },
    { a: "Slow dance in the living room", b: "Have a water fight in the yard" },
    { a: "Write a song together", b: "Make a scrapbook together" },
    { a: "Have a spa day at home", b: "Go to an amusement park" },
    { a: "Know every language together", b: "Play every instrument together" },
    { a: "Go camping under the stars", b: "Stay in a luxury hotel" },
    { a: "Have a long-distance video date", b: "Send each other voice notes all day" },
    { a: "Re-watch our favorite movie", b: "Discover a new movie together" },
    { a: "Bake a cake together", b: "Do a puzzle together" },
    { a: "Have a karaoke night", b: "Have a game night" },
    { a: "Visit every continent together", b: "Visit every theme park together" },
    { a: "Celebrate every small anniversary", b: "Have one big annual celebration" },
    { a: "Share one phone for a day", b: "Not look at any screens for a day" },
    { a: "Have a pillow fort movie night", b: "Have a rooftop dinner under the stars" },
    { a: "Be together 24/7 for a week", b: "Have a week of surprise dates" },
    { a: "Exchange playlists and only listen to each other's music", b: "Exchange outfits and wear each other's clothes" },
];

export default function WouldYouRather({ isOpen, onClose, socket, roomId, myUserId }) {
    const [questionIdx, setQuestionIdx] = useState(0);
    const [myChoice, setMyChoice] = useState(null);
    const [partnerChoice, setPartnerChoice] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [score, setScore] = useState({ match: 0, total: 0 });

    // Listen for partner's choice
    useEffect(() => {
        if (!socket) return;
        const handleGameData = (data) => {
            if (data.game === 'would-you-rather' && data.data.questionIdx === questionIdx) {
                setPartnerChoice(data.data.choice);
            }
        };
        socket.on('receive-game', handleGameData);
        return () => socket.off('receive-game', handleGameData);
    }, [socket, questionIdx]);

    // Auto-reveal when both have chosen
    useEffect(() => {
        if (myChoice && partnerChoice && !revealed) {
            setRevealed(true);
            setScore(prev => ({
                match: prev.match + (myChoice === partnerChoice ? 1 : 0),
                total: prev.total + 1,
            }));
        }
    }, [myChoice, partnerChoice, revealed]);

    const choose = (choice) => {
        if (myChoice) return; // Already chose
        setMyChoice(choice);
        if (socket && roomId) {
            socket.emit('send-game', {
                roomId,
                game: 'would-you-rather',
                data: { questionIdx, choice, userId: myUserId },
            });
        }
    };

    const nextQuestion = () => {
        setMyChoice(null);
        setPartnerChoice(null);
        setRevealed(false);
        setQuestionIdx(prev => (prev + 1) % QUESTIONS.length);
    };

    if (!isOpen) return null;
    const q = QUESTIONS[questionIdx];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span className={styles.headerIcon}>🤔</span>
                    <span className={styles.headerTitle}>Would You Rather</span>
                    <span className={styles.scoreTag}>
                        💕 {score.match}/{score.total}
                    </span>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <p className={styles.questionNum}>
                    Question {questionIdx + 1} of {QUESTIONS.length}
                </p>

                <div className={styles.options}>
                    <button
                        className={`${styles.optionBtn} ${styles.optionA}
                            ${myChoice === 'a' ? styles.chosen : ''}
                            ${revealed && partnerChoice === 'a' ? styles.partnerChose : ''}
                            ${revealed ? styles.revealed : ''}`}
                        onClick={() => choose('a')}
                        disabled={!!myChoice}
                    >
                        <span className={styles.optionText}>{q.a}</span>
                        {revealed && myChoice === 'a' && <span className={styles.youTag}>You</span>}
                        {revealed && partnerChoice === 'a' && <span className={styles.partnerTag}>Partner</span>}
                    </button>

                    <div className={styles.vsCircle}>
                        <span>VS</span>
                    </div>

                    <button
                        className={`${styles.optionBtn} ${styles.optionB}
                            ${myChoice === 'b' ? styles.chosen : ''}
                            ${revealed && partnerChoice === 'b' ? styles.partnerChose : ''}
                            ${revealed ? styles.revealed : ''}`}
                        onClick={() => choose('b')}
                        disabled={!!myChoice}
                    >
                        <span className={styles.optionText}>{q.b}</span>
                        {revealed && myChoice === 'b' && <span className={styles.youTag}>You</span>}
                        {revealed && partnerChoice === 'b' && <span className={styles.partnerTag}>Partner</span>}
                    </button>
                </div>

                {revealed && (
                    <div className={styles.result}>
                        <p className={styles.resultText}>
                            {myChoice === partnerChoice
                                ? '💕 You both chose the same!'
                                : '😄 Different choices — variety is fun!'}
                        </p>
                        <button className={styles.nextBtn} onClick={nextQuestion}>
                            Next Question →
                        </button>
                    </div>
                )}

                {myChoice && !partnerChoice && !revealed && (
                    <p className={styles.waiting}>Waiting for your partner... 💭</p>
                )}
            </div>
        </div>
    );
}
