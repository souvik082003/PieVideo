'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './VideoPlayer.module.css';

export default function VideoPlayer({ stream, userName, muted, emoji, isLarge, isLocal }) {
    const videoRef = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            const videoTrack = stream.getVideoTracks()[0];
            setHasVideo(videoTrack?.enabled ?? false);

            const handleTrackChange = () => {
                setHasVideo(stream.getVideoTracks().some(t => t.enabled));
            };
            stream.addEventListener('removetrack', handleTrackChange);
            stream.addEventListener('addtrack', handleTrackChange);
            return () => {
                stream.removeEventListener('removetrack', handleTrackChange);
                stream.removeEventListener('addtrack', handleTrackChange);
            };
        }
    }, [stream]);

    const initial = userName?.charAt(0)?.toUpperCase() || '?';

    return (
        <div className={styles.videoWrapper}>
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    className={`${styles.video} ${isLocal ? styles.videoLocal : ''}`}
                />
            ) : (
                <div className={styles.placeholder}>
                    <div className={styles.placeholderAvatar}>{initial}</div>
                </div>
            )}

            <div className={styles.nameTag}>{userName}</div>

            {emoji && <div className={styles.emojiReaction}>{emoji}</div>}
        </div>
    );
}
