import { motion } from 'motion/react';

// 15 hearts on one CSS keyframe; the per-heart offsets are stable, so the drift
// never re-renders React.
const HEARTS = Array.from({ length: 15 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 14 + ((i * 7) % 22),
  delay: (i * 0.9) % 9,
  duration: 6 + ((i * 3) % 5),
}));

export default function FinalWish() {
  return (
    <motion.section className="relative w-full py-16 md:py-24 overflow-hidden bg-gradient-to-b from-[#FAF0E6]/10 to-[#FAF0E6] flex flex-col items-center justify-center border-t border-[#D4A96A]/20">
      
      {/* Floating Animated Hearts Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {HEARTS.map((heart, i) => (
          <span
            key={i}
            className="float-heart absolute bottom-0 select-none"
            style={{
              left: `${heart.left}%`,
              fontSize: heart.size,
              animationDelay: `${heart.delay}s`,
              animationDuration: `${heart.duration}s`,
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Greeting Ribbon sticker */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [-10, -5, -10] }}
        transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut' }}
        className="absolute top-4 left-6 md:left-24 text-5xl z-10 select-none opacity-85"
      >
        🌹
      </motion.div>
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [5, 12, 5] }}
        transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', delay: 0.3 }}
        className="absolute top-6 right-8 md:right-28 text-5xl z-10 select-none opacity-85"
      >
        💌
      </motion.div>

      {/* Main Card Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative max-w-2xl w-full bg-[#FAF0E6] p-8 md:p-12 border-2 border-dashed border-kraft/40 rounded-md scrapbook-shadow text-center z-10 select-none rotate-[-0.5deg]"
      >
        {/* Tape overlapping layout */}
        <div className="absolute -top-4 left-1/3 w-32 h-8 tape-strip z-20 opacity-80" />

        {/* Vintage candle holder icon */}
        <div className="flex justify-center items-end gap-1 mb-8">
          <div className="w-1.5 h-10 bg-kraft/40 rounded-full" />
          <div className="w-7 h-12 bg-crimson rounded-t-full relative">
            {/* Candle flicker wick */}
            <motion.div
              animate={{ 
                scaleY: [1, 1.25, 1], 
                scaleX: [1, 0.9, 1], 
                y: [0, -2, 0],
                opacity: [0.95, 1, 0.95]
              }}
              transition={{ repeat: Infinity, duration: 0.25, ease: 'easeInOut' }}
              className="absolute -top-5 left-1/2 -translate-x-1/2"
              style={{ transformOrigin: 'bottom' }}
            >
              <svg width="22" height="22" viewBox="0 0 20 20">
                <path d="M10 0C10 0 6 5 6 9C6 11.2091 7.79086 13 10 13C12.2091 13 14 11.2091 14 9C14 5 10 0 10 0Z" fill="#FFA500" />
                <path d="M10 3C10 3 8 6 8 8.5C8 9.60457 8.89543 10.5 10 10.5C11.1046 10.5 12 9.60457 12 8.5C12 6 10 3 10 3Z" fill="#FFD700" />
              </svg>
            </motion.div>
          </div>
          <div className="w-1.5 h-10 bg-kraft/40 rounded-full" />
        </div>

        <h3 className="font-cursive text-4xl md:text-5xl text-dark-red font-bold mb-6">
          A Final Blessing... ✨
        </h3>

        {/* Cursive message blessing */}
        <p className="font-serif italic text-lg md:text-xl text-zinc-700 leading-relaxed font-normal tracking-wide max-w-lg mx-auto">
          "May your year be filled with as much light as you bring into the lives of everyone around you. Keep dreaming, keep laughing, and may every morning bring a new reason to smile. You are truly one of a kind, Ankita."
        </p>

        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-kraft/40 to-transparent mx-auto my-8" />

        {/* Dynamic cute visual interactives */}
        <div className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-crimson text-cream rounded-full scrapbook-shadow flex items-center justify-center text-xl cursor-pointer hover:bg-dark-red active:scale-95 transition-colors"
          >
            ❤️
          </motion.button>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="text-4xl"
          >
            🦋
          </motion.div>
        </div>
      </motion.div>

      {/* Footer layout: Made with ❤️ for Ankita */}
      <footer className="mt-16 text-center select-none z-10 px-4">
        <p className="font-cursive text-2xl text-[#8B0000] font-bold">
          Made with ❤️ for Bhaktu..
        </p>
        <p className="font-sans text-[10px] uppercase font-semibold text-[#D4A96A] tracking-[0.2em] mt-2">
          Forever & Always • Best Friends Scrapbook System
        </p>
      </footer>
    </motion.section>
  );
}
