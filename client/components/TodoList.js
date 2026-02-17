'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import styles from './TodoList.module.css';

export default function TodoList({ isOpen, onClose, roomId }) {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const { user } = useAuth();

    // Sync tasks from Firestore
    useEffect(() => {
        if (!isOpen || !roomId) return;
        try {
            const q = query(collection(db, 'tasks'), where('roomId', '==', roomId));
            const unsub = onSnapshot(q, (snap) => {
                const t = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                t.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
                setTasks(t);
            }, (err) => {
                console.warn('[Todo] Firestore error, using local:', err.message);
            });
            return unsub;
        } catch {
            // Firestore not configured — use local state
        }
    }, [isOpen, roomId]);

    const addTask = async () => {
        const text = newTask.trim();
        if (!text) return;
        setNewTask('');

        const task = {
            text,
            completed: false,
            roomId: roomId || 'local',
            userId: user?.uid || 'guest',
            userName: user?.displayName || 'Guest',
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'tasks'), task);
        } catch {
            // Fallback to local state
            setTasks(prev => [...prev, { ...task, id: Date.now().toString(), createdAt: { seconds: Date.now() / 1000 } }]);
        }
    };

    const toggleTask = async (task) => {
        try {
            await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed });
        } catch {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
        } catch {
            setTasks(prev => prev.filter(t => t.id !== taskId));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') addTask();
    };

    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.panel}>
                <div className={styles.header}>
                    <div>
                        <h3>✅ Tasks</h3>
                        {total > 0 && (
                            <span className={styles.counter}>{completed}/{total} completed</span>
                        )}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(completed / total) * 100}%` }}
                        />
                    </div>
                )}

                {/* Task input */}
                <div className={styles.inputRow}>
                    <input
                        type="text"
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a new task..."
                        className={styles.taskInput}
                        maxLength={100}
                    />
                    <button className={styles.addBtn} onClick={addTask} disabled={!newTask.trim()}>
                        +
                    </button>
                </div>

                {/* Task list */}
                <div className={styles.taskList}>
                    {tasks.length === 0 ? (
                        <div className={styles.empty}>
                            <span>📝</span>
                            <p>No tasks yet. Add one above!</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className={`${styles.taskItem} ${task.completed ? styles.taskDone : ''}`}>
                                <button
                                    className={styles.checkbox}
                                    onClick={() => toggleTask(task)}
                                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    {task.completed ? '✓' : ''}
                                </button>
                                <span className={styles.taskText}>{task.text}</span>
                                {task.userName && task.userName !== 'Guest' && (
                                    <span className={styles.taskAuthor}>{task.userName.split(' ')[0]}</span>
                                )}
                                <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)} aria-label="Delete">
                                    🗑
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
