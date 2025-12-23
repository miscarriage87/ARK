"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import BackgroundGlow from "@/components/BackgroundGlow";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  // 0: Dot, 1: Expansion, 2: Move to Top, 3: Title Reveal, 4: Subheader, 5: Ready/Input, 6: Exiting
  const [animStage, setAnimStage] = useState(0);

  const go = async () => {
    if (name.trim()) {
      setAnimStage(6);
      await new Promise((r) => setTimeout(r, 800));
      router.push(`/${encodeURIComponent(name.trim())}`);
    }
  };

  // Orchestrate Animation Stages
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    // Timeline aggressively tightened for continuous flow
    timers.push(setTimeout(() => setAnimStage(1), 1200)); // Start expanding (duration ~1s -> finishes at 2200)
    timers.push(setTimeout(() => setAnimStage(2), 2200)); // Move to top immediately (duration 1.2s -> finishes at 3400)
    timers.push(setTimeout(() => setAnimStage(3), 3800)); // Show Text delayed (let YinYang settle)
    timers.push(setTimeout(() => setAnimStage(4), 5800)); // Show Input delayed
    // Stage 5 is skipped/merged into 4 for simplicity in this new flow

    return () => timers.forEach(clearTimeout);
  }, []);

  const lettersLabel = "dArk".split("");
  const subheaderText = "digitaler Abreißkalender";

  return (
    <main className="h-[100dvh] bg-[#050505] text-white font-sans selection:bg-amber-500/30 overflow-hidden relative flex flex-col items-center justify-start md:justify-center pt-[20vh] md:pt-0 md:pb-[15vh] p-6">

      {/* Intro Overlay: White Background to Black Dot */}
      <AnimatePresence mode="wait">
        {animStage === 0 && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 200, borderRadius: "0%" }}
              animate={{ scale: 0, borderRadius: "50%" }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
              className="w-10 h-10 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Background Glow */}
      <BackgroundGlow opacity={animStage >= 1 ? 1 : 0} />

      {animStage === 1 && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
          <motion.div
            layoutId="yinyang-shared"
            initial={{ opacity: 0, width: 0, height: 0 }}
            animate={{ opacity: 1, width: 128, height: 128 }}
            transition={{
              width: { duration: 1, ease: "easeOut" },
              height: { duration: 1, ease: "easeOut" },
              opacity: { duration: 0.5 },
              layout: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
            }}
            className="flex items-center justify-center rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] bg-black/10 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              <YinYangSvg />
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Content Container */}
      <motion.div
        animate={animStage === 6 ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-4xl w-full flex flex-col items-center gap-8"
      >
        {/* Placeholder for Logo Area / YinYang Stage 2 */}
        <div className="h-12 border-none flex flex-col items-center justify-end shrink-0">
          {animStage >= 2 && (
            <div className="group cursor-pointer relative z-[100]">
              <motion.div
                layoutId="yinyang-shared"
                className="w-10 h-10 flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-black/10 backdrop-blur-sm relative z-[100]"
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <YinYangSvg />
                </motion.div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Branding Section Group */}
        <div className="flex flex-col items-center w-full gap-2">

          {/* Title */}
          <div className="group h-auto flex items-center justify-center relative z-20 w-full">
            <motion.h1
              className="text-[20vw] md:text-[14rem] font-serif font-medium tracking-[-0.04em] leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] relative py-2 px-4 md:px-8"
              style={{
                WebkitTextFillColor: "transparent",
                WebkitBackgroundClip: "text",
                backgroundImage: "linear-gradient(to top, #fbbf24 0%, #ffffff 60%)",
              }}
            >
              {lettersLabel.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={animStage >= 3 ? { opacity: 1 } : {}}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                  className="inline-block"
                >
                  {letter}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Subheader */}
          <div className="flex flex-col items-center justify-center h-auto">
            <div className="w-full flex justify-center gap-[1px] md:gap-[3px] overflow-hidden px-1">
              {subheaderText.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={animStage >= 3 ? { opacity: 1, filter: "blur(0px)" } : {}}
                  transition={{ duration: 0.8, delay: 1.5 + i * 0.03 }}
                  className={`text-sm md:text-lg font-extralight tracking-tight ${[0, 10, 12, 16].includes(i)
                    ? "text-amber-400 font-bold"
                    : "text-gray-400"
                    }`}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>
            {animStage >= 3 && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent max-w-[200px] mt-4"
              />
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-md min-h-[80px] flex items-center justify-center mt-4">
          <AnimatePresence>
            {animStage >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1 rounded-2xl shadow-2xl transition-colors duration-300 hover:bg-white/[0.05] hover:border-white/20 group/input"
              >
                <div className="flex flex-col md:flex-row items-center gap-1">
                  <div className="flex-1 w-full px-4 py-3 flex items-center gap-3">
                    <Sparkles
                      size={18}
                      className="text-amber-500 transition-transform group-hover/input:rotate-12"
                    />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && go()}
                      placeholder="Dein Name..."
                      className="w-full bg-transparent text-xl placeholder-gray-600 focus:outline-none text-white font-light tracking-wide"
                    // autoFocus removed
                    />
                  </div>

                  <button
                    onClick={go}
                    disabled={!name.trim()}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 text-sm md:text-base"
                  >
                    Eintreten <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>

      {/* Bottom Reflection */}
      <motion.div
        animate={animStage >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 2 }}
        className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none"
      />
    </main>
  );
}

// Extracted SVG component for cleaner code & reusability
function YinYangSvg({ shadow = false }: { shadow?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${shadow ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}
    >
      <path
        d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C36.1929 100 25 88.8071 25 75C25 61.1929 36.1929 50 50 50C63.8071 50 75 38.8071 75 25C75 11.1929 63.8071 0 50 0Z"
        fill="#000"
      />
      <path
        d="M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C63.8071 0 75 11.1929 75 25C75 38.8071 63.8071 50 50 50C36.1929 50 25 61.1929 25 75C25 88.8071 36.1929 100 50 100Z"
        fill="#fff"
      />
      <circle cx="50" cy="25" r="7" fill="#fff" />
      <circle cx="50" cy="75" r="7" fill="#000" />
    </svg>
  );
}