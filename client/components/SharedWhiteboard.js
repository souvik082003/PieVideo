'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SharedWhiteboard.module.css';

const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const SIZES = [2, 4, 8, 14];

export default function SharedWhiteboard({ isOpen, onClose, socket, roomId }) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(4);
    const [tool, setTool] = useState('pen'); // pen | eraser
    const lastPos = useRef(null);

    // Initialize canvas
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
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
    }, [isOpen]);

    // Draw a line segment on canvas
    const drawSegment = useCallback((x1, y1, x2, y2, strokeColor, strokeSize) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeSize;
        ctx.globalCompositeOperation = strokeColor === 'eraser' ? 'destination-out' : 'source-over';
        if (strokeColor === 'eraser') {
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        }
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    // Listen for partner's drawing
    useEffect(() => {
        if (!socket || !isOpen) return;
        const handleDraw = (data) => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            // Scale to local canvas size
            const x1 = data.x1 * canvas.width;
            const y1 = data.y1 * canvas.height;
            const x2 = data.x2 * canvas.width;
            const y2 = data.y2 * canvas.height;
            drawSegment(x1, y1, x2, y2, data.color, data.size);
        };
        const handleClear = () => {
            const ctx = ctxRef.current;
            const canvas = canvasRef.current;
            if (ctx && canvas) {
                ctx.fillStyle = '#111118';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };
        socket.on('receive-draw', handleDraw);
        socket.on('receive-clear-canvas', handleClear);
        return () => {
            socket.off('receive-draw', handleDraw);
            socket.off('receive-clear-canvas', handleClear);
        };
    }, [socket, isOpen, drawSegment]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        const pos = getPos(e);
        lastPos.current = pos;
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing || !lastPos.current) return;
        const pos = getPos(e);
        const prev = lastPos.current;
        const strokeColor = tool === 'eraser' ? 'eraser' : color;

        drawSegment(prev.x, prev.y, pos.x, pos.y, strokeColor, brushSize);

        // Send to partner (normalized 0-1)
        const canvas = canvasRef.current;
        if (socket && roomId) {
            socket.emit('send-draw', {
                roomId,
                x1: prev.x / canvas.width,
                y1: prev.y / canvas.height,
                x2: pos.x / canvas.width,
                y2: pos.y / canvas.height,
                color: strokeColor,
                size: brushSize,
            });
        }

        lastPos.current = pos;
    };

    const stopDraw = () => {
        setIsDrawing(false);
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
            socket.emit('send-clear-canvas', { roomId });
        }
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'doodle.png';
        link.href = canvas.toDataURL();
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <h3>🎨 Draw Together</h3>
                    <div className={styles.headerActions}>
                        <button className={styles.actionBtn} onClick={downloadCanvas} title="Download">💾</button>
                        <button className={styles.actionBtn} onClick={clearCanvas} title="Clear All">🗑️</button>
                        <button className={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className={styles.toolbar}>
                    {/* Tools */}
                    <div className={styles.toolGroup}>
                        <button
                            className={`${styles.toolBtn} ${tool === 'pen' ? styles.toolActive : ''}`}
                            onClick={() => setTool('pen')}
                            title="Pen"
                        >✏️</button>
                        <button
                            className={`${styles.toolBtn} ${tool === 'eraser' ? styles.toolActive : ''}`}
                            onClick={() => setTool('eraser')}
                            title="Eraser"
                        >🧹</button>
                    </div>

                    {/* Colors */}
                    <div className={styles.toolGroup}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={`${styles.colorBtn} ${color === c ? styles.colorActive : ''}`}
                                style={{ background: c }}
                                onClick={() => { setColor(c); setTool('pen'); }}
                            />
                        ))}
                    </div>

                    {/* Brush size */}
                    <div className={styles.toolGroup}>
                        {SIZES.map(s => (
                            <button
                                key={s}
                                className={`${styles.sizeBtn} ${brushSize === s ? styles.sizeActive : ''}`}
                                onClick={() => setBrushSize(s)}
                            >
                                <span style={{ width: s + 4, height: s + 4, borderRadius: '50%', background: 'white', display: 'block' }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className={styles.canvasArea}>
                    <canvas
                        ref={canvasRef}
                        className={styles.canvas}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                    />
                </div>
            </div>
        </div>
    );
}
