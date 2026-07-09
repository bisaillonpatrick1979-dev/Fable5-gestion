import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../store';

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // returns distance in meters
}

export function useGeofencing() {
  const { companyInfo, projects } = useAppStore();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported');
      return;
    }

    setIsChecking(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsError(null);
        setIsChecking(false);
      },
      (error) => {
        console.error('GPS Geolocation error', error);
        let msg = 'Unknown GPS Error';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permission denied by user';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Position unavailable';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS query timed out';
        }
        setGpsError(msg);
        setIsChecking(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (companyInfo.geofencingEnabled) {
      checkLocation();
    }
  }, [companyInfo.geofencingEnabled, checkLocation]);

  // Evaluates punchability on a certain project
  const evaluateProjectGeofence = useCallback((projectId: string) => {
    // 1. If global geofencing is off, you can punch in
    if (!companyInfo.geofencingEnabled) {
      return { canPunch: true, distance: 0, requiredRadius: 0, msg: 'Geofencing disabled globally' };
    }

    const project = projects.find((p) => p.id === projectId);
    // 2. If no project or no valid coordinates defined, allow punch (fail-safe)
    if (!project || !project.latitude || !project.longitude) {
      return { canPunch: true, distance: 0, requiredRadius: 0, msg: 'No GPS coordinate constraints on this project' };
    }

    // 3. If GPS is still checking and we don't have coords yet
    if (isChecking && !coords) {
      return { canPunch: false, isChecking: true, distance: 0, requiredRadius: project.radius, msg: 'Checking location...' };
    }

    // 4. If GPS error occurred and we have NO coords
    if (gpsError && !coords) {
      // Fail-safe: if GPS fails or permissions are blocked, we don't block work but warning is appropriate.
      // However user requested: "GPS non disponible sur l'appareil (fail-safe : on laisse passer)"
      return { canPunch: true, distance: 0, requiredRadius: project.radius, isFailSafe: true, msg: `Fail-safe passes: ${gpsError}` };
    }

    if (!coords) {
      return { canPunch: false, isChecking: true, distance: 0, requiredRadius: project.radius, msg: 'Acquiring GPS lock...' };
    }

    const dist = calculateDistance(
      coords.latitude,
      coords.longitude,
      project.latitude,
      project.longitude
    );

    const isInside = dist <= project.radius;

    return {
      canPunch: isInside,
      distance: dist,
      requiredRadius: project.radius,
      msg: isInside 
        ? `Within range (${dist}m out of max ${project.radius}m)` 
        : `Outside range (${dist}m out of max ${project.radius}m)`
    };
  }, [coords, gpsError, isChecking, companyInfo.geofencingEnabled, projects]);

  return {
    coords,
    gpsError,
    isChecking,
    checkLocation,
    evaluateProjectGeofence,
  };
}
