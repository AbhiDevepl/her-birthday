import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeLeft {
  status: 'before' | 'during' | 'after';
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateBirthdayTime(): TimeLeft {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Birthday start: September 23 at 00:00:00 (Month is 0-indexed: September is 8)
  const birthdayStart = new Date(currentYear, 8, 23, 0, 0, 0, 0);
  // Birthday end: September 23 at 23:59:59.999 (end of birthday day)
  const birthdayEnd = new Date(currentYear, 8, 23, 23, 59, 59, 999);

  const nowMs = now.getTime();
  const startMs = birthdayStart.getTime();
  const endMs = birthdayEnd.getTime();

  // If we are currently on the birthday (Sept 23):
  if (nowMs >= startMs && nowMs <= endMs) {
    const diff = Math.max(0, endMs - nowMs);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      status: 'during',
      days: 0,
      hours,
      minutes,
      seconds,
    };
  }

  // If before Sept 23: show time remaining until end of the birthday day
  if (nowMs < startMs) {
    const diff = Math.max(0, endMs - nowMs);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      status: 'before',
      days,
      hours,
      minutes,
      seconds,
    };
  }

  // If after Sept 23 this year, target next year's end of birthday day
  const nextYearEnd = new Date(currentYear + 1, 8, 23, 23, 59, 59, 999);
  const diff = Math.max(0, nextYearEnd.getTime() - nowMs);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    status: 'after',
    days,
    hours,
    minutes,
    seconds,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function BirthdayCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateBirthdayTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateBirthdayTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="birthday-countdown-timer"
      className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#FAF0E6] border border-[#D4A96A]/50 shadow-xs text-xs sm:text-sm font-sans select-none hover:border-[#C41E3A]/40 transition-colors"
      title="Time remaining until the end of Bhaktu's Birthday (23.09)"
    >
      <Clock className="w-3.5 h-3.5 text-[#C41E3A] animate-pulse shrink-0" />
      
      {timeLeft.status === 'during' ? (
        <div className="flex items-center gap-1 text-[#8B0000] font-medium font-mono text-[11px] sm:text-xs tracking-tight">
          <span className="text-[#C41E3A] font-sans font-semibold mr-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
            Ends in
          </span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30">
            {pad(timeLeft.hours)}h
          </span>
          <span>:</span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30">
            {pad(timeLeft.minutes)}m
          </span>
          <span>:</span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30 text-[#C41E3A]">
            {pad(timeLeft.seconds)}s
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[#8B0000] font-medium font-mono text-[11px] sm:text-xs tracking-tight">
          <span className="text-[#D4A96A] font-sans font-semibold mr-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider">
            {timeLeft.days > 0 ? `${timeLeft.days}d left` : 'Ends in'}
          </span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30">
            {pad(timeLeft.hours)}h
          </span>
          <span>:</span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30">
            {pad(timeLeft.minutes)}m
          </span>
          <span>:</span>
          <span className="bg-white/80 px-1 py-0.5 rounded-xs border border-[#D4A96A]/30 text-[#C41E3A]">
            {pad(timeLeft.seconds)}s
          </span>
        </div>
      )}
    </div>
  );
}
