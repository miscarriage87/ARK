
'use client';

import React, { useState } from 'react';
import styles from './QuoteCard.module.css';

interface QuoteProps {
    content: string;
    author: string;
    topic: string;
    date: string;
}

export default function QuoteCard({ content, author, topic, date }: QuoteProps) {
    const [isTorn, setIsTorn] = useState(false);

    const handleTear = () => {
        setIsTorn(true);
        // Logic to mark as read or save to archive
        console.log('Torn off!');
    };

    if (isTorn) {
        return (
            <div className={styles.tornPlaceholder}>
                <p>See you tomorrow!</p>
                <button onClick={() => setIsTorn(false)}>Undo (Demo)</button>
            </div>
        );
    }

    return (
        <div className={styles.cardContainer}>
            <div className={styles.holes}>
                <div className={styles.hole}></div>
                <div className={styles.hole}></div>
            </div>
            <div className={styles.paper} onClick={handleTear}>
                <div className={styles.header}>
                    <span className={styles.date}>{date}</span>
                    <span className={styles.topic}>{topic}</span>
                </div>
                <div className={styles.content}>
                    <h2 className={styles.quote}>&ldquo;{content}&rdquo;</h2>
                    <p className={styles.author}>&mdash; {author}</p>
                </div>
                <div className={styles.footer}>
                    <span className={styles.tearHint}>Tap to tear off</span>
                </div>
            </div>
        </div>
    );
}
