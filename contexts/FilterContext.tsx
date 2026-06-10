"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import {
  CURRENT_PERIODE_VALUE,
  DEFAULT_PERIODE_START,
  resolvePeriode,
} from "@/lib/periode";

interface FilterContextType {
  periodeStart: string;
  periodeEnd: string;
  /** Resolved YYYY-MM (never "current") */
  resolvedPeriodeEnd: string;
  cabang: string[];
  setPeriodeStart: (v: string) => void;
  setPeriodeEnd: (v: string) => void;
  setCabang: (v: string[]) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [periodeStart, setPeriodeStartState] = useState(DEFAULT_PERIODE_START);
  const [periodeEnd, setPeriodeEndState] = useState(CURRENT_PERIODE_VALUE);
  const [cabang, setCabangState] = useState<string[]>([]);

  const resolvedPeriodeEnd = useMemo(() => resolvePeriode(periodeEnd), [periodeEnd]);

  const setPeriodeStart = useCallback((v: string) => setPeriodeStartState(v), []);
  const setPeriodeEnd = useCallback((v: string) => setPeriodeEndState(v), []);
  const setCabang = useCallback((v: string[]) => setCabangState(v), []);

  const resetFilters = useCallback(() => {
    setPeriodeStartState(DEFAULT_PERIODE_START);
    setPeriodeEndState(CURRENT_PERIODE_VALUE);
    setCabangState([]);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        periodeStart,
        periodeEnd,
        resolvedPeriodeEnd,
        cabang,
        setPeriodeStart,
        setPeriodeEnd,
        setCabang,
        resetFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextType {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
