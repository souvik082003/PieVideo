'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ChatPanel.module.css';

export default function ChatPanel({ isOpen, messages, onSend, currentUserId }) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSend({ type: 'text', message: inputValue });
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const isImage = file.type.startsWith('image/');
            onSend({
                type: isImage ? 'image' : 'file',
                message: '',
                fileName: file.name,
                fileData: reader.result,
                fileType: file.type,
                fileSize: file.size,
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Group consecutive messages from same user
    const grouped = messages.reduce((groups, msg, i) => {
        const prev = messages[i - 1];
        if (prev && prev.userId === msg.userId) {
            groups[groups.length - 1].messages.push(msg);
        } else {
            groups.push({
                userId: msg.userId,
                userName: msg.userName,
                isMe: msg.userId === currentUserId,
                messages: [msg],
            });
        }
        return groups;
    }, []);

    if (!isOpen) return null;

    return (
        <div className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.headerIcon}>💬</span>
                    <span className={styles.headerTitle}>Chat</span>
                </div>
                <span className={styles.msgCount}>{messages.length}</span>
            </div>

            {/* Chat wallpaper area */}
            <div className={styles.messagesArea}>
                <div className={styles.wallpaper} />

                {messages.length === 0 ? (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>💬</span>
                        <p>No messages yet</p>
                        <p className={styles.emptyHint}>Say hello! 👋</p>
                    </div>
                ) : (
                    grouped.map((grp, gi) => (
                        <div key={gi} className={`${styles.msgGroup} ${grp.isMe ? styles.myGroup : ''}`}>
                            {!grp.isMe && (
                                <div className={styles.senderRow}>
                                    <div className={styles.senderAvatar}>
                                        {grp.userName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <span className={styles.senderName}>{grp.userName}</span>
                                </div>
                            )}
                            {grp.messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.bubble} ${grp.isMe ? styles.myBubble : styles.theirBubble}`}
                                >
                                    {/* File / Image content */}
                                    {msg.type === 'image' && msg.fileData && (
                                        <div className={styles.imageAttachment}>
                                            <img src={msg.fileData} alt={msg.fileName} className={styles.attachedImage} />
                                        </div>
                                    )}
                                    {msg.type === 'file' && (
                                        <div className={styles.fileAttachment}>
                                            <div className={styles.fileIcon}>📎</div>
                                            <div className={styles.fileInfo}>
                                                <span className={styles.fileName}>{msg.fileName}</span>
                                                <span className={styles.fileSize}>
                                                    {msg.fileSize ? formatFileSize(msg.fileSize) : ''}
                                                </span>
                                            </div>
                                            {msg.fileData && (
                                                <a
                                                    href={msg.fileData}
                                                    download={msg.fileName}
                                                    className={styles.downloadBtn}
                                                >
                                                    ⬇
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Text content */}
                                    {msg.message && (
                                        <span className={styles.msgText}>{msg.message}</span>
                                    )}

                                    {/* Time + ticks */}
                                    <span className={styles.msgMeta}>
                                        <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                                        {grp.isMe && (
                                            <span className={styles.ticks}>
                                                {msg.status === 'delivered' ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className={styles.inputArea}>
                <input
                    ref={fileInputRef}
                    type="file"
                    className={styles.fileInput}
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                />
                <button
                    className={styles.attachBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                >
                    📎
                </button>
                <input
                    ref={inputRef}
                    className={styles.textInput}
                    type="text"
                    placeholder="Type a message"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
