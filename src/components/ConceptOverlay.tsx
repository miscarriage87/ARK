"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ConceptOverlay.module.css";

interface ConceptOverlayProps {
    word: string | null;
    definition: string | null;
    onClose: () => void;
}

export default function ConceptOverlay({ word, definition, onClose }: ConceptOverlayProps) {
    return (
        <AnimatePresence>
            {word && (
                <div className={styles.overlay} onClick={onClose}>
                    <motion.div
                        className={styles.card}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className={styles.word}>{word}</h3>
                        <p className={styles.definition}>{definition}</p>
                        <p className={styles.closeHint}>Tippe irgendwo zum Schließen</p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
