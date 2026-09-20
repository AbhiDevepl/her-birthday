import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface VisitorGateProps {
  onDone: () => void;
}

type Coords = { latitude: number; longitude: number };

const GEO_ERRORS: Record<number, string> = {
  1: 'Location access is required to continue.\nPlease allow location access for this site and try again.',
  2: 'Your location is unavailable right now. Please try again.',
  3: 'The location request timed out. Please try again.',
};

export default function VisitorGate({ onDone }: VisitorGateProps) {
  const [nickname, setNickname] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const requestedRef = useRef(false);

  const requestLocation = useCallback(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location sharing, so we cannot continue.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setLocating(false);
        if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) {
          setError('Your location is unavailable right now. Please try again.');
          return;
        }
        setCoords({ latitude: c.latitude, longitude: c.longitude });
      },
      (err) => {
        setLocating(false);
        setCoords(null);
        setError(GEO_ERRORS[err.code] ?? 'We could not get your location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nickname.trim()) return setError('Please enter your nickname to continue.');
    if (!coords) return setError('Location permission is required to continue. Please allow location access and try again.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), ...coords }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          // If the backend API route is 404 (e.g., static hosting / missing serverless route on Vercel)
          console.warn('Backend API /api/visitors returned 404. Saving visitor check-in locally.');
          try {
            const raw = localStorage.getItem('offlineVisitors');
            const list = raw ? JSON.parse(raw) : [];
            list.push({
              id: Date.now(),
              nickname: nickname.trim(),
              ...coords,
              createdAt: new Date().toISOString(),
            });
            localStorage.setItem('offlineVisitors', JSON.stringify(list));
          } catch (storageErr) {
            console.warn('Could not save to localStorage:', storageErr);
          }
          onDone();
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Something went wrong. Please try again.');
      }
      onDone();
    } catch (err) {
      // In case of a network error or fetch failure on static hosts, save locally and do not block the user
      console.warn('Visitor registration network error, saving locally:', err);
      try {
        const raw = localStorage.getItem('offlineVisitors');
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          id: Date.now(),
          nickname: nickname.trim(),
          ...coords,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('offlineVisitors', JSON.stringify(list));
        onDone();
        return;
      } catch {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 paper-bg crumpled-effect overflow-y-auto">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ scale: 0.94, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: -1 }}
        transition={{ duration: 0.7 }}
        className="relative max-w-md w-full bg-white p-8 md:p-10 polaroid-shadow rounded-sm border border-gray-100 flex flex-col gap-5"
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-crimson rounded-full shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
        </div>

        <h1 className="font-cursive text-4xl md:text-5xl text-crimson font-bold text-center leading-none mt-2">
          Before you open it ✨
        </h1>
        <p className="font-serif text-center text-on-surface-variant">
          Sign the guest book to unwrap the surprise 🎀
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

        <div className="flex flex-col gap-2">
          <label htmlFor="nickname" className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold">
            Enter your nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            maxLength={60}
            autoComplete="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Bhaktu"
            className="font-serif text-lg px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson focus:ring-2 focus:ring-crimson/20"
          />
        </div>
        {error && (
          <p role="alert" className="font-sans text-sm text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-3 py-2 whitespace-pre-line">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || locating || !nickname.trim() || !coords}
          className="font-cursive text-2xl bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold py-3 rounded-sm shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? 'Please wait…' : 'Continue'}
        </button>
      </motion.form>
    </div>
  );
}
