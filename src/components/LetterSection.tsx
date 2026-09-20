import { motion } from 'motion/react';

export default function LetterSection() {
  const letters = [
    `Happy Birthday, Bhaktu!! 🎉💖

Even though miles keep us apart and I can't meet you today, I'm sending all my love, prayers, and best wishes your way. Thank you for being such an amazing friend and for always being there despite the distance.

Having you in my life is hands-down one of the greatest privileges I will ever know. You are my constant soundboard, my favorite escape, and the keeper of my funniest memories.`,

    `Through all the deep late-night talks and absolute laughter that only we understand—you've proven what genuine friendship means. You appreciate the small things, and somehow always know how to make me laugh when everything gets heavy.

I hope your day is filled with happiness, laughter, and beautiful memories. May this year bring you success, good health, and everything you've been wishing for.

Really missing you today—hopefully we'll celebrate together soon.

Happy Birthday Dabbu❤️🫶🏻`,
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative w-full max-w-4xl mx-auto px-4 py-8"
    >
      {/* Decorative butterfly */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          x: [0, 5, 0],
          rotate: [-10, -5, -10],
        }}
        transition={{
          repeat: Infinity,
          duration: 4.8,
          ease: 'easeInOut',
        }}
        className="absolute -top-6 left-12 text-5xl z-20 select-none pointer-events-none"
      >
        🦋
      </motion.div>

      {/* Main Crumpled Kraft Card */}
      <div className="relative w-full kraft-bg crumpled-effect p-8 md:p-14 rounded-md scrapbook-shadow border-2 border-amber-800/10 overflow-hidden select-none scrapbook-letter-lift cursor-default">
        {/* Ribbon */}
        <div className="absolute top-4 left-4 text-5xl z-20 rotate-[-15deg] font-sans transition-transform duration-300 hover:rotate-[-5deg] hover:scale-110">
          🎀
        </div>

        {/* Wax seal */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full border border-dashed border-zinc-800/20 opacity-30 rotate-12 flex items-center justify-center transition-all duration-300 hover:opacity-60 hover:rotate-45 hover:scale-110">
          <span className="text-sm font-sans font-black">
            Bhaktu
          </span>
        </div>

        {/* Lined paper */}
        <div className="bg-[#FAF0E6] p-6 md:p-10 rounded-sm border border-orange-100 flex flex-col gap-4 relative scrapbook-parchment-lift cursor-default">
          {/* Notebook lines */}
          <div className="absolute inset-0 ledger-lines opacity-10 pointer-events-none" />

          {/* Tape */}
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-28 h-6 tape-strip z-10 opacity-70" />

          {/* Letter content */}
          <div className="relative z-10 font-serif text-zinc-800 text-lg md:text-xl leading-relaxed space-y-6">
            {/* First letter */}
            <div className="space-y-4">
              <h3 className="font-cursive text-3xl md:text-4xl text-crimson font-bold rotate-[-1deg]">
                Dear Bhaktu 💖,
              </h3>

              {letters[0].split('\n\n').map((paragraph, index) => (
                <p
                  key={index}
                  className="indent-8 text-justify font-serif tracking-wide text-zinc-900"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Second letter */}
            <div className="space-y-4 pt-2">
              {letters[1].split('\n\n').map((paragraph, index) => (
                <p
                  key={index}
                  className="indent-8 text-justify font-serif tracking-wide text-zinc-900"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Signature */}
            <div className="pt-6 text-right flex flex-col items-end">
              <span className="font-cursive text-3xl text-[#C41E3A] font-bold">
                With all my heart,
              </span>

              <span className="font-cursive text-2xl text-zinc-800 rotate-2 mr-4">
                Your Best Friend ❤️
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}