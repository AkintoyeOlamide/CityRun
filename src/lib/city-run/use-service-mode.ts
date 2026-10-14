"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseServiceMode,
  readStoredServiceMode,
  writeStoredServiceMode,
  type ServiceMode,
} from "@/lib/city-run/service-mode";

export function useServiceMode() {
  const [mode, setMode] = useState<ServiceMode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(readStoredServiceMode());
    setReady(true);
  }, []);

  const choose = useCallback((next: ServiceMode) => {
    writeStoredServiceMode(next);
    setMode(next);
  }, []);

  return {
    mode,
    ready,
    choose,
    parsed: parseServiceMode(mode),
  };
}
