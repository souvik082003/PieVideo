'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import styles from './SharedWhiteboard.module.css';

export default function ExcalidrawWhiteboard({ isOpen, onClose, socket, roomId }) {
    const excalidrawAPIRef = useRef(null);
    const debounceTimer = useRef(null);
    const isReceiving = useRef(false);
    const lastSceneVersion = useRef(0);

    // Handle scene changes — send to partner with debounce
    const handleChange = useCallback((elements, appState) => {
        if (isReceiving.current) return;
        if (!socket || !roomId) return;

        // Only send if elements actually changed
        const currentVersion = elements.reduce((v, el) => v + el.version, 0);
        if (currentVersion === lastSceneVersion.current) return;
        lastSceneVersion.current = currentVersion;

        // Debounce to avoid flooding socket
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            socket.emit('send-excalidraw-scene', {
                roomId,
                elements: JSON.parse(JSON.stringify(elements)),
            });
        }, 200);
    }, [socket, roomId]);

    // Listen for partner's scene updates
    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleReceiveScene = (data) => {
            const api = excalidrawAPIRef.current;
            if (!api) return;
            isReceiving.current = true;

            try {
                const currentElements = api.getSceneElements();

                // Merge incoming elements: partner's elements take precedence by version
                const elementMap = new Map();
                currentElements.forEach(el => elementMap.set(el.id, el));
                data.elements.forEach(el => {
                    const existing = elementMap.get(el.id);
                    if (!existing || el.version > existing.version) {
                        elementMap.set(el.id, el);
                    }
                });

                const merged = Array.from(elementMap.values());
                api.updateScene({ elements: merged });
                lastSceneVersion.current = merged.reduce((v, el) => v + el.version, 0);
            } catch (err) {
                console.warn('Excalidraw scene update error:', err);
            }

            // Delay to avoid re-triggering onChange
            setTimeout(() => {
                isReceiving.current = false;
            }, 100);
        };

        socket.on('receive-excalidraw-scene', handleReceiveScene);
        return () => {
            socket.off('receive-excalidraw-scene', handleReceiveScene);
        };
    }, [socket, isOpen]);

    // Export to PNG
    const handleExport = async () => {
        const api = excalidrawAPIRef.current;
        if (!api) return;
        try {
            const elements = api.getSceneElements();
            const appState = api.getAppState();
            if (!elements.length) return;

            const blob = await exportToBlob({
                elements,
                appState: {
                    ...appState,
                    exportWithDarkMode: true,
                },
                files: api.getFiles(),
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `whiteboard-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.warn('Export failed:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <h3>🎨 Whiteboard</h3>
                    <div className={styles.headerActions}>
                        <button className={styles.actionBtn} onClick={handleExport} title="Export as PNG">
                            💾
                        </button>
                        <button className={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Excalidraw Canvas */}
                <div className={styles.excalidrawWrapper} tabIndex={-1}>
                    <Excalidraw
                        excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
                        theme="dark"
                        onChange={handleChange}
                        initialData={{
                            appState: {
                                viewBackgroundColor: '#111118',
                                currentItemStrokeColor: '#ffffff',
                                currentItemFontFamily: 1,
                                gridSize: null,
                            },
                        }}
                        UIOptions={{
                            canvasActions: {
                                loadScene: false,
                                export: false,
                                saveToActiveFile: false,
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
