"use client";
import React, { useState } from "react";
import styles from "../app/page.module.css";
import SettingsOverlay from "./SettingsOverlay";

interface UserHeaderProps {
    user: {
        id: string;
        name: string;
        preferences: string | null;
        // any other fields needed
    };
}

export default function UserHeader({ user }: UserHeaderProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <div className={styles.headerBar}>
                <div className={styles.logoSmall}>ARK</div>
                <div
                    className={styles.profileContainer}
                    onClick={() => setIsSettingsOpen(true)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className={styles.statusDot}></div>
                    <div className={styles.profileName}>{user.name}</div>
                </div>
            </div>

            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                user={user}
            />
        </>
    );
}
