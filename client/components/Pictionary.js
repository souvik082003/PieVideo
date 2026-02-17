'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Pictionary.module.css';

const WORD_BANK = [
    'Sun', 'Moon', 'Star', 'Heart', 'House', 'Tree', 'Flower', 'Cat', 'Dog', 'Bird',
    'Fish', 'Butterfly', 'Rainbow', 'Cloud', 'Rain', 'Snow', 'Mountain', 'Beach', 'Ocean', 'Fire',
    'Pizza', 'Cake', 'Ice Cream', 'Guitar', 'Piano', 'Camera', 'Balloon', 'Crown', 'Diamond', 'Robot',
    'Rocket', 'Castle', 'Dragon', 'Unicorn', 'Mermaid', 'Superhero', 'Ghost', 'Alien', 'Pirate', 'Ninja',
    'Sunset', 'Volcano', 'Waterfall', 'Lightning', 'Umbrella', 'Bicycle', 'Airplane', 'Telescope', 'Compass', 'Treasure',
];

const ROUND_TIME = 60;

export default function Pictionary({ isOpen, onClose, socket, roomId }) {
    const [gameState, setGameState] = useState('lobby'); // lobby, drawing, guessing, roundEnd, gameOver
    const [isDrawer, setIsDrawer] = useState(false);
    const [currentWord, setCurrentWord] = useState('');
    const [guessInput, setGuessInput] = useState('');
    const [guesses, setGuesses] = useState([]);
    const [scores, setScores] = useState({ me: 0, partner: 0 });
    const [round, setRound] = useState(0);
    const [timer, setTimer] = useState(ROUND_TIME);
    const [roundResult, setRoundResult] = useState('');

    // Canvas refs
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef(null);
    const timerRef = useRef(null);

    const maxRounds = 6; // 3 each

    // Initialize canvas
    useEffect(() => {
        if (!isOpen || !canvasRef.current || gameState === 'lobby' || gameState === 'gameOver') return;
        const canvas = canvasRef.current;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#111118';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctxRef.current = ctx;
    }, [isOpen, gameState, round]);

    // Timer
    useEffect(() => {
        if (gameState !== 'drawing' && gameState !== 'guessing') return;
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [gameState, round]);

    // Socket listeners
    useEffect(() => {
        if (!socket || !isOpen) return;

        const handlePictionary = (data) => {
            if (data.type === 'start-round') {
                setRound(data.round);
                setTimer(ROUND_TIME);
                setGuesses([]);
                setRoundResult('');
                if (data.drawer === 'partner') {
                    setIsDrawer(false);
                    setCurrentWord(data.word); // Always set word for guess checking
                    setGameState('guessing');
                } else {
                    setIsDrawer(true);
                    setCurrentWord(data.word);
                    setGameState('drawing');
                }
            } else if (data.type === 'draw') {
                if (!canvasRef.current) return;
                const canvas = canvasRef.current;
                const ctx = ctxRef.current;
                if (!ctx) return;
                const x1 = data.x1 * canvas.width;
                const y1 = data.y1 * canvas.height;
                const x2 = data.x2 * canvas.width;
                const y2 = data.y2 * canvas.height;
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (data.type === 'guess') {
                setGuesses(prev => [...prev, { text: data.text, correct: data.correct, from: 'partner' }]);
                if (data.correct) {
                    clearInterval(timerRef.current);
                    setScores(prev => ({ ...prev, partner: prev.partner + 1 }));
                    setRoundResult('Partner guessed it! 🎉');
                    setGameState('roundEnd');
                }
            } else if (data.type === 'time-up') {
                clearInterval(timerRef.current);
                setRoundResult(`Time's up! The word was "${data.word}" ⏰`);
                setGameState('roundEnd');
            } else if (data.type === 'clear') {
                const ctx = ctxRef.current;
                const canvas = canvasRef.current;
                if (ctx && canvas) {
                    ctx.fillStyle = '#111118';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        };

        socket.on('receive-pictionary', handlePictionary);
        return () => socket.off('receive-pictionary', handlePictionary);
    }, [socket, isOpen]);

    const handleTimeUp = () => {
        if (isDrawer && socket && roomId) {
            socket.emit('send-pictionary', { roomId, type: 'time-up', word: currentWord });
        }
        setRoundResult(`Time's up! The word was "${currentWord}" ⏰`);
        setGameState('roundEnd');
    };

    const startGame = () => {
        startNewRound(1, true);
    };

    const startNewRound = (roundNum, iAmDrawer) => {
        const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
        setRound(roundNum);
        setTimer(ROUND_TIME);
        setGuesses([]);
        setRoundResult('');
        setIsDrawer(iAmDrawer);
        setCurrentWord(word);
        setGameState(iAmDrawer ? 'drawing' : 'guessing');

        if (socket && roomId) {
            socket.emit('send-pictionary', {
                roomId,
                type: 'start-round',
                round: roundNum,
                drawer: iAmDrawer ? 'partner' : 'me',
                word: word, // Always send the word so partner knows what to draw/guess
            });
        }
    };

    const nextRound = () => {
        const nextR = round + 1;
        if (nextR > maxRounds) {
            setGameState('gameOver');
            return;
        }
        startNewRound(nextR, !isDrawer);
    };

    // Drawing functions
    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        if (!isDrawer) return;
        e.preventDefault();
        isDrawing.current = true;
        lastPos.current = getPos(e);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing.current || !lastPos.current || !isDrawer) return;
        const pos = getPos(e);
        const prev = lastPos.current;
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        const canvas = canvasRef.current;
        if (socket && roomId) {
            socket.emit('send-pictionary', {
                roomId,
                type: 'draw',
                x1: prev.x / canvas.width,
                y1: prev.y / canvas.height,
                x2: pos.x / canvas.width,
                y2: pos.y / canvas.height,
                color: '#ffffff',
                size: 3,
            });
        }
        lastPos.current = pos;
    };

    const endDraw = () => {
        isDrawing.current = false;
        lastPos.current = null;
    };

    const clearCanvas = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (ctx && canvas) {
            ctx.fillStyle = '#111118';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (socket && roomId) {
            socket.emit('send-pictionary', { roomId, type: 'clear' });
        }
    };

    const submitGuess = () => {
        const text = guessInput.trim();
        if (!text) return;

        // Robust check: lowercase, trim, and check if it CONTAINS the word if it's a phrase, or exact match
        const isCorrect = text.toLowerCase() === currentWord.toLowerCase() ||
            (currentWord.includes(' ') && text.toLowerCase().includes(currentWord.toLowerCase()));

        setGuesses(prev => [...prev, { text, correct: isCorrect, from: 'me' }]);
        setGuessInput('');

        if (socket && roomId) {
            socket.emit('send-pictionary', { roomId, type: 'guess', text, correct: isCorrect });
        }

        if (isCorrect) {
            clearInterval(timerRef.current);
            setScores(prev => ({ ...prev, me: prev.me + 1 }));
            setRoundResult('You guessed it! 🎉');
            setGameState('roundEnd');
        }
    };



    const resetGame = () => {
        setGameState('lobby');
        setScores({ me: 0, partner: 0 });
        setRound(0);
        setGuesses([]);
        setRoundResult('');
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3>🖌️ Draw & Guess</h3>
                    <div className={styles.headerRight}>
                        {gameState !== 'lobby' && gameState !== 'gameOver' && (
                            <div className={styles.scoreboard}>
                                <span className={styles.scoreItem}>You: {scores.me}</span>
                                <span className={styles.scoreDivider}>·</span>
                                <span className={styles.scoreItem}>Partner: {scores.partner}</span>
                            </div>
                        )}
                        <button className={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className={styles.lobby}>
                        <div className={styles.lobbyIcon}>🎨</div>
                        <h2>Draw & Guess</h2>
                        <p>Take turns drawing & guessing words!</p>
                        <ul className={styles.rules}>
                            <li>🖌️ {maxRounds} rounds total ({maxRounds / 2} each)</li>
                            <li>⏰ {ROUND_TIME} seconds per round</li>
                            <li>✅ Guess the word to score points</li>
                        </ul>
                        <button className={styles.startBtn} onClick={startGame}>
                            Start Game 🚀
                        </button>
                    </div>
                )}

                {/* Drawing / Guessing */}
                {(gameState === 'drawing' || gameState === 'guessing') && (
                    <div className={styles.gameArea}>
                        {/* Status bar */}
                        <div className={styles.statusBar}>
                            <span className={styles.roundBadge}>Round {round}/{maxRounds}</span>
                            {isDrawer ? (
                                <span className={styles.wordDisplay}>Draw: <strong>{currentWord}</strong></span>
                            ) : (
                                <span className={styles.wordDisplay}>Guess what they're drawing!</span>
                            )}
                            <span className={`${styles.timerBadge} ${timer <= 10 ? styles.timerUrgent : ''}`}>
                                ⏰ {timer}s
                            </span>
                        </div>

                        {/* Canvas */}
                        <div className={styles.canvasArea}>
                            <canvas
                                ref={canvasRef}
                                className={styles.canvas}
                                onMouseDown={startDraw}
                                onMouseMove={draw}
                                onMouseUp={endDraw}
                                onMouseLeave={endDraw}
                                onTouchStart={startDraw}
                                onTouchMove={draw}
                                onTouchEnd={endDraw}
                                style={{ cursor: isDrawer ? 'crosshair' : 'default' }}
                            />
                            {isDrawer && (
                                <button className={styles.clearBtn} onClick={clearCanvas}>🗑️ Clear</button>
                            )}
                        </div>

                        {/* Guess input (for guesser) */}
                        {!isDrawer && (
                            <div className={styles.guessArea}>
                                <div className={styles.guessesList}>
                                    {guesses.map((g, i) => (
                                        <span key={i} className={`${styles.guessChip} ${g.correct ? styles.correct : styles.wrong}`}>
                                            {g.text} {g.correct ? '✅' : '❌'}
                                        </span>
                                    ))}
                                </div>
                                <div className={styles.guessRow}>
                                    <input
                                        className={styles.guessInput}
                                        type="text"
                                        placeholder="Type your guess..."
                                        value={guessInput}
                                        onChange={e => setGuessInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && submitGuess()}
                                        autoFocus
                                    />
                                    <button className={styles.guessBtn} onClick={submitGuess} disabled={!guessInput.trim()}>
                                        Guess
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Round End */}
                {gameState === 'roundEnd' && (
                    <div className={styles.roundEnd}>
                        <div className={styles.resultIcon}>{roundResult.includes('🎉') ? '🎉' : '⏰'}</div>
                        <h2>{roundResult}</h2>
                        <div className={styles.scoreboardLarge}>
                            <div className={styles.scoreCard}>
                                <span>You</span>
                                <span className={styles.scoreNum}>{scores.me}</span>
                            </div>
                            <span className={styles.vs}>vs</span>
                            <div className={styles.scoreCard}>
                                <span>Partner</span>
                                <span className={styles.scoreNum}>{scores.partner}</span>
                            </div>
                        </div>
                        <button className={styles.nextBtn} onClick={nextRound}>
                            {round >= maxRounds ? 'See Results' : 'Next Round →'}
                        </button>
                    </div>
                )}

                {/* Game Over */}
                {gameState === 'gameOver' && (
                    <div className={styles.gameOver}>
                        <div className={styles.trophyIcon}>🏆</div>
                        <h2>
                            {scores.me > scores.partner ? 'You Win!' :
                                scores.me < scores.partner ? 'Partner Wins!' : "It's a Tie!"}
                        </h2>
                        <div className={styles.finalScores}>
                            <span>You: {scores.me}</span>
                            <span>Partner: {scores.partner}</span>
                        </div>
                        <div className={styles.gameOverBtns}>
                            <button className={styles.startBtn} onClick={resetGame}>Play Again 🔄</button>
                            <button className={styles.exitBtn} onClick={onClose}>Exit</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
