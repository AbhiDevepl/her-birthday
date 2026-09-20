import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export type PermissionStatusType = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'unknown';

export type LocationErrorType =
  | 'UNSUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'POOR_ACCURACY'
  | 'UNKNOWN';

export interface LocationError {
  type: LocationErrorType;
  message: string;
  code?: number;
}

export interface UseLocationOptions {
  autoStart?: boolean;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  minDistanceChangeMeters?: number;
  accuracyThresholdMeters?: number;
}

export interface UseLocationReturn {
  location: LocationData | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string | null;
  loading: boolean;
  error: string | null;
  errorType: LocationErrorType | null;
  permission: PermissionStatusType;
  isTracking: boolean;
  isSecureContext: boolean;
  isPoorAccuracy: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  retry: () => void;
}

// Dev logger without spamming
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.run.app'));

function logDev(type: 'log' | 'warn' | 'error', message: string, detail?: unknown) {
  if (!isDev) return;
  if (type === 'warn') {
    console.warn(`[Location] ${message}`, detail ?? '');
  } else if (type === 'error') {
    console.error(`[Location] ${message}`, detail ?? '');
  } else {
    console.log(`[Location] ${message}`, detail ?? '');
  }
}

// Haversine distance in meters to prevent small GPS jitter from causing excessive updates
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    autoStart = true,
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 15000,
    minDistanceChangeMeters = 5,
    accuracyThresholdMeters = 5000,
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<LocationError | null>(null);
  const [permission, setPermission] = useState<PermissionStatusType>('unknown');
  const [isTracking, setIsTracking] = useState<boolean>(false);

  // References to handle React Strict Mode, unmount lifecycle, and prevent duplicate watchers
  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isTrackingRequestedRef = useRef<boolean>(autoStart);
  const lastPositionRef = useRef<LocationData | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  // Secure context detection (HTTPS or localhost)
  const isSecure = useMemo(() => {
    if (typeof window === 'undefined') return true;
    if (typeof window.isSecureContext === 'boolean') return window.isSecureContext;
    return (
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }, []);

  // Stop active watcher
  const stopTracking = useCallback(() => {
    isTrackingRequestedRef.current = false;
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (isMountedRef.current) {
      setIsTracking(false);
      setLoading(false);
    }
  }, []);

  // Success handler
  const handlePositionSuccess = useCallback(
    (pos: GeolocationPosition) => {
      if (!isMountedRef.current) return;

      const { latitude, longitude, accuracy } = pos.coords;

      // Validate numeric coordinates
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const err: LocationError = {
          type: 'POSITION_UNAVAILABLE',
          message: 'Unable to determine your current location.\nPlease check your device location settings.',
        };
        logDev('warn', 'Received non-finite coordinates', pos.coords);
        setErrorInfo(err);
        setLoading(false);
        return;
      }

      // Check for poor accuracy
      const isPoor = Number.isFinite(accuracy) && accuracy > accuracyThresholdMeters;
      if (isPoor) {
        logDev('warn', `Position has low accuracy: ${Math.round(accuracy)}m`);
      }

      const newLocation: LocationData = {
        latitude,
        longitude,
        accuracy: Math.round(accuracy || 0),
        timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
      };

      // Filter jitter: only update state if first fix or moved beyond threshold or accuracy significantly improved
      const last = lastPositionRef.current;
      let shouldUpdate = true;
      if (last) {
        const distance = getDistanceMeters(last.latitude, last.longitude, latitude, longitude);
        const accuracyDifference = last.accuracy - newLocation.accuracy;
        // Update if moved > minDistanceChangeMeters or accuracy improved by > 10m
        if (distance < minDistanceChangeMeters && accuracyDifference <= 10) {
          shouldUpdate = false;
        }
      }

      if (shouldUpdate) {
        lastPositionRef.current = newLocation;
        setLocation(newLocation);
        setErrorInfo(null);
        setLoading(false);
        setPermission('granted');
        logDev('log', 'Position updated:', {
          latitude: newLocation.latitude.toFixed(5),
          longitude: newLocation.longitude.toFixed(5),
          accuracy: `${newLocation.accuracy}m`,
        });
      } else {
        setLoading(false);
      }
    },
    [accuracyThresholdMeters, minDistanceChangeMeters]
  );

  // Error handler
  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    if (!isMountedRef.current) return;

    let errorObj: LocationError;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorObj = {
          type: 'PERMISSION_DENIED',
          message: 'Location permission is disabled.\nEnable location access in your browser settings and try again.',
          code: err.code,
        };
        setPermission('denied');
        logDev('warn', 'Permission denied');
        break;
      case err.POSITION_UNAVAILABLE:
        errorObj = {
          type: 'POSITION_UNAVAILABLE',
          message: 'Unable to determine your current location.\nPlease check your device location settings.',
          code: err.code,
        };
        logDev('warn', 'Position unavailable');
        break;
      case err.TIMEOUT:
        errorObj = {
          type: 'TIMEOUT',
          message: 'Unable to determine your current location within time limit.\nPlease check your device location settings and try again.',
          code: err.code,
        };
        logDev('warn', 'Position request timed out');
        break;
      default:
        errorObj = {
          type: 'UNKNOWN',
          message: 'Unable to determine your current location.\nPlease check your device location settings.',
          code: err.code,
        };
        logDev('error', 'Unknown geolocation error', err);
        break;
    }

    setErrorInfo(errorObj);
    setLoading(false);
  }, []);

  // Start tracking
  const startTracking = useCallback(() => {
    isTrackingRequestedRef.current = true;

    // Check secure context
    if (!isSecure) {
      const err: LocationError = {
        type: 'INSECURE_CONTEXT',
        message: 'Location tracking requires a secure connection (HTTPS or localhost).',
      };
      logDev('error', err.message);
      setErrorInfo(err);
      setLoading(false);
      setIsTracking(false);
      return;
    }

    // Check browser support
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const err: LocationError = {
        type: 'UNSUPPORTED',
        message: 'Location tracking is not supported by this browser.',
      };
      logDev('error', err.message);
      setErrorInfo(err);
      setPermission('unsupported');
      setLoading(false);
      setIsTracking(false);
      return;
    }

    setLoading(true);
    setErrorInfo(null);
    setIsTracking(true);

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      maximumAge,
      timeout,
    };

    // 1. Initial quick fix with getCurrentPosition
    try {
      navigator.geolocation.getCurrentPosition(
        handlePositionSuccess,
        (err) => {
          // If already got watchPosition or error handled, let watchPosition take over
          if (!lastPositionRef.current) {
            handlePositionError(err);
          }
        },
        geoOptions
      );
    } catch (e) {
      logDev('error', 'getCurrentPosition threw an exception', e);
    }

    // 2. Setup continuous watchPosition (ensure only one watcher exists)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        geoOptions
      );
      watchIdRef.current = watchId;
    } catch (e) {
      logDev('error', 'watchPosition threw an exception', e);
      setLoading(false);
    }
  }, [enableHighAccuracy, handlePositionError, handlePositionSuccess, isSecure, maximumAge, timeout]);

  // Retry tracking
  const retry = useCallback(() => {
    setErrorInfo(null);
    lastPositionRef.current = null;
    startTracking();
  }, [startTracking]);

  // Permissions API listener
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (!isMountedRef.current) return;
          permissionStatusRef.current = status;
          setPermission(status.state as PermissionStatusType);

          status.onchange = () => {
            if (!isMountedRef.current) return;
            const newState = status.state as PermissionStatusType;
            setPermission(newState);
            logDev('log', `Permission status changed to: ${newState}`);

            if (newState === 'granted') {
              setErrorInfo(null);
              if (isTrackingRequestedRef.current) {
                startTracking();
              }
            } else if (newState === 'denied') {
              stopTracking();
              setErrorInfo({
                type: 'PERMISSION_DENIED',
                message: 'Location permission is disabled.\nEnable location access in your browser settings and try again.',
              });
            }
          };
        })
        .catch((err) => {
          logDev('warn', 'Permissions API query not supported for geolocation', err);
        });
    }

    if (autoStart) {
      startTracking();
    }

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [autoStart, startTracking, stopTracking]);

  const isPoorAccuracy = useMemo(() => {
    if (!location) return false;
    return location.accuracy > accuracyThresholdMeters;
  }, [accuracyThresholdMeters, location]);

  return {
    location,
    latitude: location ? location.latitude : null,
    longitude: location ? location.longitude : null,
    accuracy: location ? location.accuracy : null,
    timestamp: location ? location.timestamp : null,
    loading,
    error: errorInfo ? errorInfo.message : null,
    errorType: errorInfo ? errorInfo.type : null,
    permission,
    isTracking,
    isSecureContext: isSecure,
    isPoorAccuracy,
    startTracking,
    stopTracking,
    retry,
  };
}
