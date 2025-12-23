"use client";
import React from "react";
import { motion } from "framer-motion";

interface AnimatedPageContainerProps {
    children: React.ReactNode;
}

export default function AnimatedPageContainer({ children }: AnimatedPageContainerProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="relative z-10 w-full flex flex-col items-center"
        >
            {children}
        </motion.div>
    );
}
