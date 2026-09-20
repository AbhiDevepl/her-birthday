import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import EntranceSplash from './components/EntranceSplash';
import ScrapbookHero from './components/ScrapbookHero';
import LetterSection from './components/LetterSection';
import CatSection from './components/CatSection';
import PhotoCarousel from './components/PhotoCarousel';
import FinalWish from './components/FinalWish';
import VisitorGate from './components/VisitorGate';
import AdminDashboard from './components/AdminDashboard';
import BirthdayCountdown from './components/BirthdayCountdown';

export default function App() {
  const [showScrapbook, setShowScrapbook] = useState(false);
  const [checkedIn, setCheckedIn] = useState(
    () => sessionStorage.getItem('visitorCheckedIn') === '1',
  );

  if (window.location.pathname.replace(/\/$/, '') === '/admin') {
    return <AdminDashboard />;
  }

  if (!checkedIn) {
    return (
      <div className="min-h-screen relative paper-bg select-none">
        <VisitorGate
          onDone={() => {
            sessionStorage.setItem('visitorCheckedIn', '1');
            setCheckedIn(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative paper-bg select-none">
      {/* Hidden background music (mounted after the gate click, so autoplay is allowed) */}
      <iframe
        src="https://www.youtube.com/embed/k2ICJWeSgGw?autoplay=1&loop=1&playlist=k2ICJWeSgGw&start=17&controls=0&modestbranding=1&rel=0&playsinline=1"
        title="Background Music"
        allow="autoplay"
        style={{
          position: 'fixed',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          border: 0,
        }}
      />
      <AnimatePresence mode="wait">
        {!showScrapbook ? (
          <div key="splash" className="w-full h-full">
            <EntranceSplash onEnter={() => setShowScrapbook(true)} />
          </div>
        ) : (
          <motion.div
            key="scrapbook-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="flex flex-col items-center justify-start min-h-screen pb-16"
          >
            {/* Top Sticky Header Header decoration */}
            <header className="sticky top-0 right-0 left-0 w-full bg-[#FAF0E6]/90 backdrop-blur-md border-b border-[#D4A96A]/20 py-4 px-6 md:px-12 flex justify-between items-center z-40 shadow-xs select-none">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span className="font-cursive text-2xl md:text-3xl text-[#C41E3A] font-bold">
                  Bhaktu's Special Day 🎀
                </span>
              </div>
              <div className="flex gap-2.5 sm:gap-4 items-center">
                <BirthdayCountdown />
                <span className="hidden sm:inline-block text-sm font-sans tracking-widest text-[#D4A96A] font-semibold uppercase px-2 py-1 rounded-full bg-kraft/10 border border-kraft/30">
                  23.09
                </span>
                <div className="w-8 h-8 rounded-full bg-[#C41E3A] shadow-sm flex items-center justify-center text-cream text-[11px] font-bold">
                  ❤️
                </div>
              </div>
            </header>

            {/* Main Interactive Collage Scrapbook Sheets */}
            <main className="w-full max-w-5xl px-4 md:px-8 space-y-12 md:space-y-20 relative overflow-visible mt-6">
              
              {/* Placement Tape Strips scattered in background */}
              <div className="absolute top-1/4 left-4 w-16 h-40 bg-zinc-300/10 border-x-2 border-dashed border-zinc-400/20 rotate-12 -z-20" />
              <div className="absolute top-2/3 right-4 w-20 h-40 bg-zinc-300/10 border-x-2 border-dashed border-zinc-400/20 -rotate-12 -z-20" />

              {/* 1. ScrapbookHero */}
              <ScrapbookHero />

              {/* Decorative spacing element / paper rip */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

              {/* 2. LetterSection */}
              <LetterSection />

              {/* Decorative spacing element / paper rip */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

              {/* 3. CatSection */}
              <CatSection />

              {/* Decorative spacing element / paper rip */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

              {/* 4. PhotoCarousel */}
              <PhotoCarousel />

              {/* Decorative spacing element / paper rip */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

              {/* 5. FinalWish */}
              <FinalWish />

            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
