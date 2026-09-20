import { motion } from 'motion/react';
import RansomWord from './RansomWord';

const photos = [
  {
    id: 'hero-1',
    src: 'https://ik.imagekit.io/sk67opnzi/assets/1.jpeg',
    caption: 'Our Favorite Day ☀️',
    rotation: -4,
  },
  {
    id: 'hero-2',
    src: 'https://ik.imagekit.io/sk67opnzi/assets/2.jpeg',
    caption: 'Sweetest Moments 🎀',
    rotation: 5,
  },
  {
    id: 'hero-3',
    src: 'https://ik.imagekit.io/sk67opnzi/assets/3.jpeg',
    caption: 'Partners in Crime ✨',
    rotation: 2,
  },
];

export default function ScrapbookHero() {
  // Staggered animation setup
  const listContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      }
    }
  };

  const polaroidAnim = {
    hidden: { opacity: 0, y: 30, scale: 0.95, rotate: 0 },
    show: (rotation: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: rotation,
      transition: { type: 'spring', stiffness: 60, delay: 0.1 }
    })
  };

  return (
    <section className="relative w-full py-16 md:py-24 overflow-visible flex flex-col items-center">
      {/* Newspaper backdrop collage snippet */}
      <div className="absolute top-0 opacity-10 uppercase tracking-widest text-[#8B0000] font-bold text-center pointer-events-none select-none -z-10">
        <h2 className="text-8xl md:text-9xl leading-none font-serif opacity-30">Bhaktu 23.09</h2>
      </div>

      {/* Ribbon decoration stickers */}
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [8, 12, 8] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="absolute top-2 right-4 md:right-16 text-5xl md:text-6xl z-20 drop-shadow-md select-none pointer-events-none"
      >
        🎀
      </motion.div>

      {/* Ransom note header: BIRTHDAY GIRL */}
      <div className="flex flex-col items-center gap-3 mb-16 relative z-10">
        <div className="max-w-lg px-4">
          <RansomWord word="Birthday" size="text-4xl md:text-5xl px-3 py-1.5" />
        </div>
        <div className="flex justify-center items-center gap-2">
          <RansomWord word="Girl" offset={3} />
          <span className="text-5xl md:text-6xl filter drop-shadow-sm select-none">👑</span>
        </div>
      </div>

      {/* Overlapping Polaroid Collage Grid */}
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-4xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 mt-8 min-h-[460px] items-center"
      >
        {photos.map((photo, index) => {
          const rotation = photo.rotation ?? (index === 0 ? -5 : index === 1 ? 4 : -2);
          return (
            <motion.div
              key={photo.id}
              custom={rotation}
              variants={polaroidAnim}
              whileHover={{ 
                scale: 1.06, 
                y: -12,
                rotate: rotation > 0 ? rotation + 2.5 : rotation - 2.5,
                zIndex: 30,
                transition: { type: 'spring', stiffness: 350, damping: 22 }
              }}
              className="relative mx-auto bg-white p-4 pb-10 w-full max-w-[280px] polaroid-shadow border border-zinc-100/50 flex flex-col items-center hover:cursor-pointer transition-all duration-300 hover:shadow-2xl group"
            >
              {/* Placement Tape for tactile look */}
              {index === 0 && <div className="absolute -top-4 left-1/3 w-20 h-6 tape-strip z-10" />}
              {index === 1 && <div className="absolute -top-3 right-1/4 w-16 h-6 tape-strip-alt z-10" />}
              {index === 2 && (
                <div className="absolute top-2 right-2 text-[#C41E3A] z-10 drop-shadow-sm scale-110 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">
                  📌
                </div>
              )}

              {/* Photo Frame Container */}
              <div className="w-full aspect-square bg-[#FAF0E6] overflow-hidden rounded-xs border border-zinc-200/50 relative">
                <img
                  src={photo.src}
                  alt={photo.caption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110 grayscale-[15%] hover:grayscale-0"
                />
              </div>

              {/* Handwritten style caption */}
              <div className="mt-4 w-full text-center">
                <p className="font-cursive text-2xl text-[#8B0000] font-medium leading-none tracking-wide select-none">
                  {photo.caption}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Decorative center rose floral centerpiece cutout overlap */}
      <div className="absolute bottom-[-50px] right-[5%] w-36 h-36 opacity-90 select-none pointer-events-none z-10">
        <motion.img
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfCZEdW4t2u10w6zHIlSjGQuf8ryfk27YhXbul7lleOVyL1-HmCnnagJTjQ0QY8lrPoNxooovZv7cQe3g_u-9zx6SO-UOO8WYjc7TDgZqG_v30VM9eng59I8e6i9RQIWrNrnGyupWVOEEZmQtSdmRKsptd9ibk8YEDXCfSRO0c3xzynQqPHhcBP8qwjwd1fVSZvjvn5i3c-5VE8_JDK3qXeJUt6xJTpubv_ArUQ0yU4ljyGQYJBPA43gT35z49yqiEtMW4IFLXefxx"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full shadow-inner opacity-75"
        />
      </div>
    </section>
  );
}
