import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const slides = [
  {
    src: 'https://ik.imagekit.io/sk67opnzi/assets/4.jpeg',
    caption: 'Cozy letter writing afternoons ✍️☕',
  },
  {
    src: 'https://ik.imagekit.io/sk67opnzi/assets/6.jpeg',
    caption: 'Warm wishes & candle glows 🕯️🎂',
  },
  {
    src: 'https://ik.imagekit.io/sk67opnzi/8.jpeg',
    caption: 'Laughter, balloons, and sweet color schemes 🎈✨',
  },
  {
    src: 'https://ik.imagekit.io/sk67opnzi/assets/5.jpeg',
    caption: 'Dried roses preserved forever in our memories 🌹📖',
  }
];

export default function PhotoCarousel() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left/prev, 1 for right/next

  const handlePrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  // Slideshow sliding variables
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
      rotate: dir > 0 ? 5 : -5,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 1.5,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.3 },
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
      rotate: dir < 0 ? 5 : -5,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }
    })
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8 }}
      className="relative w-full max-w-2xl mx-auto px-4 py-16 flex flex-col items-center overflow-visible"
    >
      <div className="absolute top-2 left-6 text-4xl select-none pointer-events-none opacity-40">
        ✨
      </div>
      <div className="absolute bottom-4 right-8 text-4xl select-none pointer-events-none opacity-40">
        🦋
      </div>

      <div className="text-center mb-10 select-none">
        <h2 className="font-cursive text-4xl md:text-5xl text-[#8B0000] rotate-[-1deg] inline-block font-bold">
          Flip Through Our Journal 📖
        </h2>
        <div className="w-24 h-0.5 bg-kraft/50 mx-auto mt-2 rounded-full" />
      </div>

      {/* Slide Carousel Window */}
      <div className="relative w-full aspect-square max-w-[400px] flex items-center justify-center min-h-[380px] overflow-visible">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute bg-white p-5 pb-14 w-full h-full polaroid-shadow border border-zinc-100 flex flex-col items-center hover:cursor-grab active:cursor-grabbing rounded-xs"
          >
            {/* Hanging Tape Strip style decoration top-center */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-28 h-8 tape-strip-alt z-20 opacity-90" />

            {/* Photo slot */}
            <div className="w-full h-full bg-[#FAF0E6] overflow-hidden rounded-xs border border-zinc-200/50">
              <img
                src={slides[index].src}
                alt={slides[index].caption}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[8%] transition-all duration-300"
              />
            </div>

            {/* Caption beneath photo */}
            <div className="absolute bottom-3 left-0 right-0 text-center px-4">
              <p className="font-cursive text-2xl text-dark-red font-medium leading-none tracking-wide select-none truncate">
                {slides[index].caption}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Navigation Buttons styled as physical paper punch buttons */}
        <button
          onClick={handlePrev}
          className="absolute left-[-24px] md:left-[-48px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#FAF0E6] hover:bg-kraft/20 text-dark-red hover:text-crimson scrapbook-shadow flex items-center justify-center border-2 border-kraft/40 transition-colors z-30 cursor-pointer text-xl font-bold select-none active:scale-90"
          aria-label="Previous image pointer"
        >
          ❮
        </button>
        <button
          onClick={handleNext}
          className="absolute right-[-24px] md:right-[-48px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#FAF0E6] hover:bg-kraft/20 text-dark-red hover:text-crimson scrapbook-shadow flex items-center justify-center border-2 border-kraft/40 transition-colors z-30 cursor-pointer text-xl font-bold select-none active:scale-90"
          aria-label="Next image pointer"
        >
          ❯
        </button>
      </div>

      {/* Carousel Dots indicators */}
      <div className="flex gap-2.5 justify-center mt-12 select-none">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
            className={`w-3.5 h-3.5 rounded-full transition-all border border-kraft ${
              i === index ? 'bg-crimson scale-110 shadow-sm' : 'bg-[#FAF0E6] opacity-60'
            }`}
          />
        ))}
      </div>
    </motion.section>
  );
}
