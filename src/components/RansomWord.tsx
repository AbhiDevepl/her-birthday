import { motion } from 'motion/react';

// Cut-from-magazines palette. `.ransom-card` in index.css owns the font, so these
// only carry colour — per-letter font classes never won against it.
const STYLES = [
  'bg-crimson text-cream',
  'bg-white text-zinc-800',
  'bg-kraft text-dark-red',
  'bg-dark-red text-cream',
  'bg-blush text-zinc-900',
  'bg-zinc-900 text-white',
];

interface RansomWordProps {
  word: string;
  /** Shifts the colour cycle so adjacent words don't start on the same swatch. */
  offset?: number;
  size?: string;
}

export default function RansomWord({
  word,
  offset = 0,
  size = 'text-3xl md:text-4xl px-3 py-1',
}: RansomWordProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 select-none">
      {[...word].map((letter, i) => {
        const rotation = i % 2 === 0 ? -4 : 5;
        return (
          <motion.span
            key={i}
            animate={{ rotate: [rotation, rotation + 3, rotation - 3, rotation] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.25, ease: 'easeInOut' }}
            className={`ransom-card ${STYLES[(i + offset) % STYLES.length]} ${size} font-black`}
          >
            {letter}
          </motion.span>
        );
      })}
    </div>
  );
}
