'use client';

import styles from './LandingPage.module.css';
import Image from 'next/image';

export default function LandingPage({ onGetStarted }) {

    const features = [
        {
            icon: '📹',
            title: 'HD Video Calling',
            desc: 'Crystal clear video calls with peer-to-peer technology. Connect instantly with zero lag.',
        },
        {
            icon: '🎨',
            title: 'Shared Whiteboard',
            desc: 'Draw, sketch, and brainstorm together in real-time. Perfect for creative collaboration.',
        },
        {
            icon: '🖌️',
            title: 'Pictionary Game',
            desc: 'Play Draw & Guess with your friends directly in the call. Thousands of words included!',
        },
        {
            icon: '🌙',
            title: 'Goodnight Mode',
            desc: 'Sleep together virtually with a synced starry night overlay and ambient sleep sounds.',
        },
        {
            icon: '🎥',
            title: 'Watch Together',
            desc: 'Sync videos and watch movies or YouTube clips simultaneously with friends.',
        },
        {
            icon: '❤️',
            title: 'Love Reactions',
            desc: 'Send floating hearts and emojis to express yourself during calls.',
        },
    ];

    return (
        <div className={styles.container}>
            {/* Animated Background */}
            <div className={styles.background}>
                <div className={styles.blob} />
                <div className={styles.blob} />
                <div className={styles.blob} />
                <div className={styles.overlay} />
            </div>

            {/* Navbar */}
            <nav className={styles.navbar}>
                <div className={styles.logo}>
                    <Image src="/pie_logo.svg" alt="PieVideo" width={40} height={40} className={styles.logoIcon} />
                    <span className={styles.logoText}>PieVideo</span>
                </div>
                <button className={styles.navBtn} onClick={onGetStarted}>
                    Login
                </button>
            </nav>

            {/* Hero */}
            <header className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.badge}>✨ The Future of Connection</div>
                    <h1 className={styles.heroTitle}>
                        Connect Deeply,<br />
                        <span className={styles.gradientText}>Play Freely.</span>
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Experience the ultimate video calling app designed for couples and friends.
                        Watch movies, play games, and sleep together—miles apart, differnt hearts.
                    </p>
                    <div className={styles.ctaGroup}>
                        <button className={styles.ctaBtn} onClick={onGetStarted}>
                            Get Started 🚀
                        </button>
                        <button className={`${styles.ctaBtn} ${styles.secondaryBtn}`} onClick={onGetStarted}>
                            Learn More
                        </button>
                    </div>
                </div>
                {/* Hero Visual/Floating Elements could go here */}
            </header>

            {/* Features layout - Bento Grid style */}
            <section className={styles.featuresSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>More Than Just Video</h2>
                    <p className={styles.sectionSubtitle}>Everything you need to feel closer, built into one magical app.</p>
                </div>

                <div className={styles.bentoGrid}>
                    {features.map((feature, index) => (
                        <div key={index} className={`${styles.featureCard} ${styles[`card${index}`]}`}>
                            <div className={styles.cardContent}>
                                <div className={styles.iconWrapper}>{feature.icon}</div>
                                <h3 className={styles.featureTitle}>{feature.title}</h3>
                                <p className={styles.featureDesc}>{feature.desc}</p>
                            </div>
                            <div className={styles.cardGlow} />
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <Image src="/pie_logo.svg" alt="PieVideo" width={32} height={32} />
                        <span>PieVideo</span>
                    </div>
                    <div className={styles.socialLinks}>
                        <a href="https://www.instagram.com/ig_souvik03?igsh=bnBpeTNlNTJpeTVu&utm_source=qr" target="_blank" rel="noreferrer" className={styles.socialLink}>
                            📸 Instagram
                        </a>
                        <a href="https://www.linkedin.com/in/souvik-samanta-660130211" target="_blank" rel="noreferrer" className={styles.socialLink}>
                            💼 LinkedIn
                        </a>
                        <a href="https://github.com/souvik082003" target="_blank" rel="noreferrer" className={styles.socialLink}>
                            💻 GitHub
                        </a>
                    </div>
                </div>
                <div className={styles.copyright}>
                    <p>Designed & Developed with ❤️ by <span className={styles.devName}>Souvik Samanta</span></p>
                    <p>&copy; {new Date().getFullYear()} PieVideo. All rights reserved.</p>
                    <p className={styles.version}>v1.0.0 • Made in India 🇮🇳</p>
                </div>
            </footer>
        </div>
    );
}
