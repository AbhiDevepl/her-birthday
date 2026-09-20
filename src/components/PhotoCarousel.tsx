import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setIsZoomed(false);
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setDirection(1);
    setIsZoomed(false);
    setIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, []);

  const openLightbox = (targetIndex: number) => {
    setIndex(targetIndex);
    setIsZoomed(false);
    setIsLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setIsZoomed(false);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isLightboxOpen, closeLightbox, handlePrev, handleNext]);

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
      id="photo-carousel-section"
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
        <p className="font-sans text-xs text-stone-600 mt-2 tracking-wide">
          Click any photo to zoom in full screen 🔍
        </p>
      </div>

      {/* Slide Carousel Window */}
      <div className="relative w-full aspect-square max-w-[400px] flex items-center justify-center min-h-[380px] overflow-visible">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            id={`carousel-slide-${index}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            whileHover={{ 
              y: -8, 
              rotate: index % 2 === 0 ? 1.5 : -1.5, 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 350, damping: 22 } 
            }}
            className="group absolute bg-white p-5 pb-14 w-full h-full polaroid-shadow border border-zinc-100 flex flex-col items-center rounded-xs cursor-pointer transition-shadow duration-300 hover:shadow-2xl"
            onClick={() => openLightbox(index)}
            tabIndex={0}
            role="button"
            aria-label={`View photo ${index + 1} full screen: ${slides[index].caption}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(index);
              }
            }}
          >
            {/* Hanging Tape Strip style decoration top-center */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-28 h-8 tape-strip-alt z-20 opacity-90 pointer-events-none" />

            {/* Photo slot */}
            <div className="relative w-full h-full bg-[#FAF0E6] overflow-hidden rounded-xs border border-zinc-200/50">
              <img
                src={slides[index].src}
                alt={slides[index].caption}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale-[8%] group-hover:scale-105 transition-all duration-500 ease-out"
              />

              {/* Hover Zoom Badge */}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream/95 text-dark-red text-xs font-sans font-semibold shadow-md tracking-wider border border-kraft/40 scale-90 group-hover:scale-100 transition-transform duration-300">
                  <ZoomIn className="w-3.5 h-3.5 text-crimson" />
                  Tap to Zoom
                </span>
              </div>
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
          id="carousel-prev-button"
          onClick={handlePrev}
          className="absolute left-[-24px] md:left-[-48px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#FAF0E6] hover:bg-kraft/20 text-dark-red hover:text-crimson scrapbook-shadow flex items-center justify-center border-2 border-kraft/40 transition-colors z-30 cursor-pointer text-xl font-bold select-none active:scale-90"
          aria-label="Previous image"
        >
          ❮
        </button>
        <button
          id="carousel-next-button"
          onClick={handleNext}
          className="absolute right-[-24px] md:right-[-48px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#FAF0E6] hover:bg-kraft/20 text-dark-red hover:text-crimson scrapbook-shadow flex items-center justify-center border-2 border-kraft/40 transition-colors z-30 cursor-pointer text-xl font-bold select-none active:scale-90"
          aria-label="Next image"
        >
          ❯
        </button>
      </div>

      {/* Carousel Dots indicators */}
      <div className="flex gap-2.5 justify-center mt-12 select-none">
        {slides.map((_, i) => (
          <button
            key={i}
            id={`carousel-dot-${i}`}
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-3.5 h-3.5 rounded-full transition-all border border-kraft cursor-pointer ${
              i === index ? 'bg-crimson scale-110 shadow-sm' : 'bg-[#FAF0E6] opacity-60 hover:opacity-90'
            }`}
          />
        ))}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            id="carousel-lightbox-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-stone-950/90 backdrop-blur-md p-4 sm:p-6 md:p-8"
            onClick={closeLightbox}
          >
            {/* Top Toolbar */}
            <div
              className="w-full max-w-5xl flex items-center justify-between text-cream z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 font-sans text-xs tracking-wider text-cream/90 font-medium">
                  {index + 1} / {slides.length}
                </span>
                <span className="hidden sm:inline-block text-xs text-stone-400 font-sans">
                  Press Esc to exit
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  id="lightbox-toggle-zoom-btn"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-cream text-xs font-sans font-medium transition-colors border border-stone-700/60 cursor-pointer"
                  title={isZoomed ? 'Zoom out (1x)' : 'Zoom in (1.6x)'}
                >
                  {isZoomed ? (
                    <>
                      <ZoomOut className="w-4 h-4 text-amber-300" />
                      <span>1x</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn className="w-4 h-4 text-amber-300" />
                      <span>1.6x</span>
                    </>
                  )}
                </button>

                <button
                  id="lightbox-close-btn"
                  onClick={closeLightbox}
                  className="w-9 h-9 rounded-full bg-stone-800/80 hover:bg-crimson text-cream flex items-center justify-center transition-colors border border-stone-700/60 cursor-pointer shadow-lg active:scale-95"
                  aria-label="Close lightbox"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Area: Photo Display & Navigation */}
            <div
              className="relative w-full flex-1 flex items-center justify-center overflow-hidden my-2 sm:my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prev Button */}
              <button
                id="lightbox-prev-btn"
                onClick={handlePrev}
                className="absolute left-2 sm:left-6 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-stone-900/80 hover:bg-crimson text-cream border border-stone-700/70 flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer active:scale-90"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Button */}
              <button
                id="lightbox-next-btn"
                onClick={handleNext}
                className="absolute right-2 sm:right-6 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-stone-900/80 hover:bg-crimson text-cream border border-stone-700/70 flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer active:scale-90"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Polaroid Frame in Lightbox */}
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: isZoomed ? 1.4 : 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`relative bg-white p-3 sm:p-5 pb-12 sm:pb-16 rounded-sm shadow-2xl max-w-[92vw] max-h-[75vh] flex flex-col items-center select-none transition-transform duration-300 cursor-pointer ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed((prev) => !prev)}
              >
                {/* Decorative vintage tape strip */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-6 sm:h-7 tape-strip-alt opacity-90 pointer-events-none z-10" />

                {/* Photo with aspect-fit */}
                <div className="relative overflow-hidden rounded-xs bg-[#FAF0E6] border border-stone-200 max-h-[58vh]">
                  <img
                    id={`lightbox-image-${index}`}
                    src={slides[index].src}
                    alt={slides[index].caption}
                    referrerPolicy="no-referrer"
                    className="max-h-[58vh] max-w-[85vw] object-contain block mx-auto transition-transform duration-300"
                  />
                </div>

                {/* Handwritten Polaroid Caption inside frame */}
                <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 text-center px-4">
                  <p className="font-cursive text-2xl sm:text-3xl text-dark-red font-medium tracking-wide">
                    {slides[index].caption}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Bottom Footer Details */}
            <div
              className="w-full max-w-lg flex flex-col items-center gap-2 text-center text-cream/80 z-20 select-none pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thumbnail Strip */}
              <div className="flex gap-2 sm:gap-3 items-center justify-center p-1.5 rounded-full bg-stone-900/60 border border-stone-800/80">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    id={`lightbox-thumb-${i}`}
                    onClick={() => {
                      setIndex(i);
                      setIsZoomed(false);
                    }}
                    aria-label={`Thumbnail ${i + 1}`}
                    className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xs overflow-hidden border-2 transition-all cursor-pointer ${
                      i === index
                        ? 'border-crimson scale-110 shadow-md'
                        : 'border-transparent opacity-50 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={slide.src}
                      alt={`Thumb ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-sans text-stone-400">
                Use arrow keys ◀ ▶ to navigate &bull; Click image to toggle zoom
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

