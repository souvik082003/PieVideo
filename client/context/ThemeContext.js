'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const DARK_VARS = {
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
    '--topbar-bg': 'rgba(10, 10, 15, 0.85)',
    '--sidebar-bg': 'rgba(15, 15, 22, 0.6)',
};

const LIGHT_VARS = {
    '--bg-primary': '#f5f5f9',
    '--bg-secondary': '#ffffff',
    '--bg-card': 'rgba(255, 255, 255, 0.95)',
    '--bg-input': '#f0f0f5',
    '--bg-hover': '#ebebf0',
    '--border': 'rgba(0, 0, 0, 0.08)',
    '--border-hover': 'rgba(0, 0, 0, 0.16)',
    '--text-primary': '#1a1a2e',
    '--text-secondary': '#555570',
    '--text-muted': '#8888a0',
    '--accent': '#6366f1',
    '--accent-hover': '#4f46e5',
    '--accent-glow': 'rgba(99, 102, 241, 0.15)',
    '--sent-bubble': '#6366f1',
    '--sent-bubble-text': '#ffffff',
    '--received-bubble': '#e8e8f0',
    '--received-bubble-text': '#1a1a2e',
    '--chat-bg': '#f0f0f5',
    '--controls-bg': 'rgba(255, 255, 255, 0.95)',
    '--danger': '#ef4444',
    '--success': '#22c55e',
    '--video-bg': '#1a1a2e',
    '--topbar-bg': 'rgba(255, 255, 255, 0.92)',
    '--sidebar-bg': 'rgba(245, 245, 250, 0.85)',
};

// Exported for use in home page toggle UI
export const THEMES = {
    light: { name: 'Light', icon: '☀️' },
    dark: { name: 'Dark', icon: '🌙' },
    system: { name: 'System', icon: '💻' },
};

function getSystemPreference() {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
    const [mode, setMode] = useState('dark'); // 'light' | 'dark' | 'system'
    const [resolvedTheme, setResolvedTheme] = useState('dark');

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('app_theme');
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
            setMode(saved);
        }
    }, []);

    // Resolve the actual theme (important for 'system' mode)
    const resolve = useCallback(() => {
        if (mode === 'system') {
            setResolvedTheme(getSystemPreference());
        } else {
            setResolvedTheme(mode);
        }
    }, [mode]);

    useEffect(() => {
        resolve();

        // Listen for OS theme changes when in system mode
        if (mode === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => resolve();
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [mode, resolve]);

    // Apply CSS variables + data-theme attribute
    useEffect(() => {
        const vars = resolvedTheme === 'dark' ? DARK_VARS : LIGHT_VARS;
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
        root.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    // Save preference
    useEffect(() => {
        localStorage.setItem('app_theme', mode);
    }, [mode]);

    return (
        <ThemeContext.Provider value={{ theme: mode, setTheme: setMode, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
