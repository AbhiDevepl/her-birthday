import React, { useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface EntranceSplashProps {
  onEnter: () => void;
}

export default function EntranceSplash({ onEnter }: EntranceSplashProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleOpenSurprise = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Confetti burst from the button location or full screen
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const x = (buttonRect.left + buttonRect.width / 2) / window.innerWidth;
    const y = (buttonRect.top + buttonRect.height / 2) / window.innerHeight;

    // Spectacular realistic paper/ribbon burst
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { x, y },
      colors: ['#C41E3A', '#D4A96A', '#FAF0E6', '#FFB6C1', '#8B0000'],
    });

    // Multiple bursts for extra juice
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { x: 0.2, y: 0.3 },
        colors: ['#C41E3A', '#FFB6C1'],
      });
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { x: 0.8, y: 0.3 },
        colors: ['#D4A96A', '#8B0000'],
      });
    }, 250);

    setIsExiting(true);
    // Let animation complete before calling onEnter
    setTimeout(() => {
      onEnter();
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={isExiting ? { opacity: 0, scale: 1.05, y: -80 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center paper-bg crumpled-effect overflow-hidden"
    >
      {/* Tape and Ribbons on outer margins */}
      <div className="absolute top-8 left-8 w-24 h-10 tape-strip -rotate-12 opacity-80" />
      <div className="absolute bottom-8 right-8 w-28 h-10 tape-strip-alt rotate-45 opacity-80" />

      {/* Scattered Floating Stickers */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [2, -2, 2] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="absolute top-[15%] left-[10%] text-5xl md:text-6xl drop-shadow-md select-none"
      >
        🦋
      </motion.div>
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [-4, 4, -4] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.5 }}
        className="absolute top-[25%] right-[12%] text-6xl drop-shadow-md select-none"
      >
        🎀
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [3, -3, 3] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-[20%] left-[15%] text-5xl select-none"
      >
        🌹
      </motion.div>
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1.5 }}
        className="absolute bottom-[25%] right-[18%] text-5xl drop-shadow-md select-none"
      >
        💌
      </motion.div>

      {/* Main card mockup setup */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: -1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative max-w-lg w-full bg-white p-8 md:p-12 polaroid-shadow rounded-sm border border-gray-100 flex flex-col items-center gap-6"
      >
        {/* Tiny Red Pin */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-crimson rounded-full shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
        </div>

        <h1 className="font-cursive text-5xl md:text-7xl text-crimson font-bold drop-shadow-sm leading-none mt-2">
          Happy Birthday Bhaktu ✨
        </h1>

        <p className="font-serif text-lg md:text-xl text-on-surface-variant font-medium tracking-wide">
          A little surprise just for you 🎀
        </p>

        {/* Vintage sketch borders/decorations */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent my-1" />

        <div className="relative w-44 h-44 md:w-52 md:h-52 bg-[#FAF0E6] flex items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-kraft/40 p-4">
          <div className="text-6xl animate-pulse">🎂</div>
          {/* Sparkles / floral frames around */}
          <div className="absolute top-2 left-6 text-xl">✨</div>
          <div className="absolute bottom-4 right-8 text-xl">💝</div>
        </div>

        {/* Action Button styled as a Red Wax Seal */}
        <motion.button
          onClick={handleOpenSurprise}
          whileHover={{ scale: 1.08, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          className="relative mt-4 bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold w-32 h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center border-4 border-[#C41E3A] shadow-lg cursor-pointer transform hover:rotate-6 select-none group"
        >
          {/* Wax seal realistic design details */}
          <div className="absolute inset-1.5 border border-dashed border-cream/20 rounded-full" />
          <span className="font-cursive text-xl md:text-2xl leading-tight">Open Your</span>
          <span className="font-cursive text-xl md:text-2xl leading-none">Surprise</span>
          <span className="text-xs font-sans tracking-widest text-cream/70 uppercase font-semibold mt-1">
            ➔
          </span>
        </motion.button>

        <span className="text-xs font-sans tracking-widest text-[#D4A96A] font-semibold uppercase animate-pulse">
          Click the Seal
        </span>
      </motion.div>

      {/* Decorative notebook lines at bottom */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-40">
        <p className="font-sans text-xs text-kraft uppercase tracking-widest">
          Vintage Scrapbook • Curated with love
        </p>
      </div>
    </motion.div>
  );
}
