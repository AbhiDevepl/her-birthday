import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { MapPin, Loader2, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

interface VisitorGateProps {
  onDone: () => void;
}

// Local cache for reverse geocoded coordinates to prevent redundant network calls
const addressCache = new Map<string, string>();

export default function VisitorGate({ onDone }: VisitorGateProps) {
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // Hook handles: permissions, watchPosition, getCurrentPosition, cleanup, jitter filtering
  const {
    location,
    latitude,
    longitude,
    accuracy,
    timestamp,
    loading: locating,
    errorType,
    isTracking,
    isPoorAccuracy,
    retry,
  } = useLocation({
    autoStart: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 15000,
    minDistanceChangeMeters: 5,
    accuracyThresholdMeters: 5000,
  });

  const lastGeocodedKeyRef = useRef<string>('');

  // Reverse geocoding via backend proxy (throttled & cached, no frontend API keys)
  useEffect(() => {
    if (!latitude || !longitude) return;

    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    if (key === lastGeocodedKeyRef.current) return;
    lastGeocodedKeyRef.current = key;

    if (addressCache.has(key)) {
      setResolvedAddress(addressCache.get(key) || null);
      return;
    }

    const abortController = new AbortController();
    fetch(`/api/reverse-geocode?latitude=${latitude}&longitude=${longitude}`, {
      signal: abortController.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data?.data) {
          const formatted =
            data.data.city && data.data.country
              ? `${data.data.city}, ${data.data.country}`
              : data.data.displayName || data.data.country || '';
          if (formatted) {
            addressCache.set(key, formatted);
            setResolvedAddress(formatted);
          }
        }
      })
      .catch(() => {
        // Reverse geocode failure is non-blocking
      });

    return () => abortController.abort();
  }, [latitude, longitude]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nickname.trim()) {
      setFormError('Please enter your nickname to continue.');
      return;
    }

    if (!location) {
      setFormError('Location permission is required to continue. Please allow location access and try again.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    const payload = {
      nickname: nickname.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFormError(body.error || 'Server rejected registration. Please try again.');
        return;
      }

      sessionStorage.setItem('visitor_registered', 'true');
      onDone();
    } catch (err: any) {
      console.warn('Visitor registration network error:', err);
      // If network fails (e.g. offline preview), persist locally so user isn't permanently blocked, but notify
      try {
        const raw = localStorage.getItem('offlineVisitors');
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          id: Date.now(),
          ...payload,
          address: resolvedAddress || undefined,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('offlineVisitors', JSON.stringify(list));
        onDone();
      } catch {
        setFormError('Unable to connect to the server. Please check your internet connection and try again.');
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

        {/* Nickname Input */}
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

        {/* Location Status Card */}
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold">
            Location Status
          </span>

          {locating && !location && (
            <div className="flex items-center gap-2 p-3 rounded-sm bg-[#FAF0E6] border border-kraft/40 text-on-surface-variant font-sans text-xs">
              <Loader2 className="w-4 h-4 text-crimson animate-spin shrink-0" />
              <span>Detecting your location...</span>
            </div>
          )}

          {location && (
            <div className="p-3 rounded-sm bg-emerald-50/80 border border-emerald-300/60 text-emerald-900 font-sans text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Location detected</span>
                </div>
                {isTracking && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live GPS
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[11px] text-emerald-800/90 pt-1 border-t border-emerald-200/50">
                <div>
                  Latitude: <span className="font-semibold">{latitude?.toFixed(4)}</span>
                </div>
                <div>
                  Longitude: <span className="font-semibold">{longitude?.toFixed(4)}</span>
                </div>
                <div className="col-span-2">
                  Accuracy: <span className="font-semibold">{accuracy} meters</span>
                </div>
                {resolvedAddress && (
                  <div className="col-span-2 font-sans text-[11px] text-emerald-900 mt-0.5">
                    Near: <span className="font-semibold">{resolvedAddress}</span>
                  </div>
                )}
              </div>
              {isPoorAccuracy && (
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Note: Approximate GPS accuracy ({accuracy}m).
                </p>
              )}
            </div>
          )}

          {!location && errorType === 'PERMISSION_DENIED' && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-900 font-sans text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-crimson shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-crimson">Location permission is disabled.</p>
                  <p className="text-rose-800/90 leading-relaxed">
                    Enable location access in your browser settings and try again.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={retry}
                className="self-start flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-crimson border border-crimson/30 hover:bg-crimson/10 rounded-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Try again
              </button>
            </div>
          )}

          {!location && (errorType === 'POSITION_UNAVAILABLE' || errorType === 'TIMEOUT') && (
            <div className="p-3 rounded-sm bg-amber-50 border border-amber-200 text-amber-900 font-sans text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-amber-900">Unable to determine your current location.</p>
                  <p className="text-amber-800/90">Please check your device location settings.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={retry}
                className="self-start flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {!location && (errorType === 'UNSUPPORTED' || errorType === 'INSECURE_CONTEXT') && (
            <div className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-zinc-800 font-sans text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-600 shrink-0" />
              <span>
                {errorType === 'INSECURE_CONTEXT'
                  ? 'Location tracking requires a secure HTTPS connection.'
                  : 'Location tracking is not supported by this browser.'}
              </span>
            </div>
          )}
        </div>

        {formError && (
          <p role="alert" className="font-sans text-sm text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-3 py-2 whitespace-pre-line">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || locating || !nickname.trim() || !location}
          className="font-cursive text-2xl bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold py-3 rounded-sm shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
        >
          {submitting ? 'Please wait…' : 'Continue'}
        </button>
      </motion.form>
    </div>
  );
}
