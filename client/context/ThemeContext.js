'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
    dark: {
        name: 'Dark',
        icon: '🌙',
        '--bg-primary': '#0a0a0f',
        '--bg-secondary': '#111118',
        '--bg-card': 'rgba(255, 255, 255, 0.04)',
        '--bg-input': 'rgba(255, 255, 255, 0.05)',
        '--bg-hover': 'rgba(255, 255, 255, 0.08)',
        '--border': 'rgba(255, 255, 255, 0.08)',
        '--border-hover': 'rgba(255, 255, 255, 0.15)',
        '--text-primary': '#f1f1f1',
        '--text-secondary': 'rgba(255, 255, 255, 0.6)',
        '--text-muted': 'rgba(255, 255, 255, 0.3)',
        '--accent': '#6366f1',
        '--accent-hover': '#818cf8',
        '--accent-glow': 'rgba(99, 102, 241, 0.35)',
        '--sent-bubble': '#075e54',
        '--sent-bubble-text': '#e9edef',
        '--received-bubble': '#1f2937',
        '--received-bubble-text': '#e9edef',
        '--chat-bg': '#0b141a',
        '--controls-bg': 'rgba(10, 10, 15, 0.85)',
        '--danger': '#ef4444',
        '--success': '#22c55e',
        '--video-bg': '#0f0f1a',
    },
    light: {
        name: 'Light',
        icon: '☀️',
        '--bg-primary': '#f0f2f5',
        '--bg-secondary': '#ffffff',
        '--bg-card': 'rgba(255, 255, 255, 0.9)',
        '--bg-input': 'rgba(0, 0, 0, 0.04)',
        '--bg-hover': 'rgba(0, 0, 0, 0.06)',
        '--border': 'rgba(0, 0, 0, 0.1)',
        '--border-hover': 'rgba(0, 0, 0, 0.2)',
        '--text-primary': '#111b21',
        '--text-secondary': '#667781',
        '--text-muted': '#8696a0',
        '--accent': '#00a884',
        '--accent-hover': '#06cf9c',
        '--accent-glow': 'rgba(0, 168, 132, 0.3)',
        '--sent-bubble': '#d9fdd3',
        '--sent-bubble-text': '#111b21',
        '--received-bubble': '#ffffff',
        '--received-bubble-text': '#111b21',
        '--chat-bg': '#efeae2',
        '--controls-bg': 'rgba(255, 255, 255, 0.92)',
        '--danger': '#ef4444',
        '--success': '#22c55e',
        '--video-bg': '#1a1a2e',
    },
    ocean: {
        name: 'Ocean',
        icon: '🌊',
        '--bg-primary': '#0a192f',
        '--bg-secondary': '#112240',
        '--bg-card': 'rgba(100, 200, 255, 0.06)',
        '--bg-input': 'rgba(100, 200, 255, 0.08)',
        '--bg-hover': 'rgba(100, 200, 255, 0.12)',
        '--border': 'rgba(100, 200, 255, 0.12)',
        '--border-hover': 'rgba(100, 200, 255, 0.25)',
        '--text-primary': '#ccd6f6',
        '--text-secondary': '#8892b0',
        '--text-muted': 'rgba(136, 146, 176, 0.6)',
        '--accent': '#64ffda',
        '--accent-hover': '#a8fff1',
        '--accent-glow': 'rgba(100, 255, 218, 0.2)',
        '--sent-bubble': '#1a4a5c',
        '--sent-bubble-text': '#ccd6f6',
        '--received-bubble': '#1c2d4a',
        '--received-bubble-text': '#ccd6f6',
        '--chat-bg': '#0a192f',
        '--controls-bg': 'rgba(10, 25, 47, 0.9)',
        '--danger': '#ff6b6b',
        '--success': '#64ffda',
        '--video-bg': '#0a192f',
    },
    purple: {
        name: 'Purple',
        icon: '💜',
        '--bg-primary': '#13091f',
        '--bg-secondary': '#1c1132',
        '--bg-card': 'rgba(168, 85, 247, 0.06)',
        '--bg-input': 'rgba(168, 85, 247, 0.08)',
        '--bg-hover': 'rgba(168, 85, 247, 0.12)',
        '--border': 'rgba(168, 85, 247, 0.12)',
        '--border-hover': 'rgba(168, 85, 247, 0.25)',
        '--text-primary': '#e8e0f0',
        '--text-secondary': '#a78bfa',
        '--text-muted': 'rgba(167, 139, 250, 0.5)',
        '--accent': '#a855f7',
        '--accent-hover': '#c084fc',
        '--accent-glow': 'rgba(168, 85, 247, 0.3)',
        '--sent-bubble': '#4c1d95',
        '--sent-bubble-text': '#e8e0f0',
        '--received-bubble': '#2e1065',
        '--received-bubble-text': '#e8e0f0',
        '--chat-bg': '#13091f',
        '--controls-bg': 'rgba(19, 9, 31, 0.9)',
        '--danger': '#f43f5e',
        '--success': '#a3e635',
        '--video-bg': '#13091f',
    },
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('app_theme');
        if (saved && THEMES[saved]) setTheme(saved);
    }, []);

    useEffect(() => {
        const vars = THEMES[theme];
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, value]) => {
            if (key.startsWith('--')) {
                root.style.setProperty(key, value);
            }
        });
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
