'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import styles from './page.module.css';

import LandingPage from '../components/LandingPage';

export default function LoginPage() {
    const [showLanding, setShowLanding] = useState(true);
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, loading: authLoading, register, login, googleSignIn } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (user && !authLoading) router.push('/home');
    }, [user, authLoading, router]);

    if (authLoading || user) {
        return <div className={styles.page}><div className={styles.bgOrbs}><div className={styles.orb} /><div className={styles.orb} /><div className={styles.orb} /></div></div>;
    }

    if (showLanding) {
        return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                if (!name.trim()) throw new Error('Name is required');
                await register(name, email, password);
            } else {
                await login(email, password);
            }
            router.push('/home');
        } catch (err) {
            setError(err.message?.replace('Firebase: ', '') || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            await googleSignIn();
            router.push('/home');
        } catch (err) {
            setError(err.message?.replace('Firebase: ', '') || 'Google Sign-In failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Animated background */}
            <div className={styles.bgOrbs}>
                <div className={styles.orb} />
                <div className={styles.orb} />
                <div className={styles.orb} />
            </div>

            <div className={styles.card}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <Image src="/pie_logo.svg" alt="PieVideo" width={56} height={56} className={styles.logo} />
                    <h1 className={styles.brand}>Pie<span>Video</span></h1>
                    <p className={styles.tagline}>Focus & Connect Together</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {isRegister && (
                        <div className={styles.inputGroup}>
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                required
                            />
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@email.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.divider}><span>or</span></div>

                <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    Continue with Google
                </button>

                <p className={styles.toggle}>
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                        {isRegister ? 'Sign In' : 'Register'}
                    </button>
                </p>
            </div>
        </div>
    );
}
