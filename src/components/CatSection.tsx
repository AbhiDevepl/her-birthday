import { motion } from 'motion/react';
import RansomWord from './RansomWord';

export default function CatSection() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative w-full max-w-xl mx-auto px-4 py-12 flex flex-col items-center"
    >
      {/* Decorative floral elements behind the pinboards */}
      <div className="absolute inset-0 opacity-15 pointer-events-none select-none -z-10 flex items-center justify-center">
        <span className="text-[12rem]">🌺</span>
      </div>

      {/* Ransom Header */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <RansomWord word="Happy" size="text-2xl md:text-3xl px-4 py-2" />
        <RansomWord word="Birthday" offset={2} size="text-2xl md:text-3xl px-3.5 py-2.5" />
      </div>

      {/* Centered Cute Kitten Card */}
      <div className="relative group transition-all duration-300 ease-out hover:-translate-y-2.5 hover:rotate-[-2deg] cursor-pointer">
        {/* Shadow Paper Base */}
        <div className="absolute inset-0 bg-zinc-200 rounded-sm translate-x-2 translate-y-3 rotate-3 -z-10 opacity-60 transition-all duration-300 group-hover:translate-x-4 group-hover:translate-y-6 group-hover:rotate-4 group-hover:opacity-40" />
        
        {/* Main Polaroid Card Container */}
        <div className="bg-white p-4 pb-12 rounded-sm polaroid-shadow border border-zinc-100/80 max-w-sm flex flex-col items-center transition-shadow duration-300 group-hover:shadow-2xl">
          
          {/* Top Tape Fastener */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-6 tape-strip z-10" />

          {/* Picture Slot */}
          <div className="relative overflow-hidden w-full aspect-[0.6] bg-[#FAF0E6] rounded-xs border border-zinc-200/40">
            <img
              src="https://ik.imagekit.io/sk67opnzi/assets/7.jpg"
              alt="Cat with cake celebration guest of honor"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover grayscale-[5%] hover:grayscale-0 transition-all duration-700 hover:scale-105"
            />
            {/* Subtle vintage photo dust / overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_60%,_rgba(0,0,0,0.15))] pointer-events-none" />
          </div>

          {/* Caption text below photo */}
          <div className="mt-4 w-full text-center">
            <span className="font-cursive text-2xl text-[#C41E3A] font-bold leading-none tracking-wide block">
              The birthday guest of honor! 🐱🎂
            </span>
            <span className="font-sans text-[10px] uppercase font-semibold text-zinc-400 tracking-widest mt-1 block">
              p.s. she wanted the first slice
            </span>
          </div>
        </div>

        {/* Decorative elements clipping over */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="absolute -top-6 -right-6 text-5xl z-20 drop-shadow-md select-none transition-transform duration-300 group-hover:scale-115 group-hover:rotate-12"
        >
          🎀
        </motion.div>
      </div>
    </motion.section>
  );
}
