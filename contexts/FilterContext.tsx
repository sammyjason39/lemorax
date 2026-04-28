"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface FilterContextType {
  periodeStart: string;
  periodeEnd: string;
  cabang: string[];
  setPeriodeStart: (v: string) => void;
  setPeriodeEnd: (v: string) => void;
  setCabang: (v: string[]) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const DEFAULT_START = "2024-01";
const DEFAULT_END = "2026-04";

export function FilterProvider({ children }: { children: ReactNode }) {
  const [periodeStart, setPeriodeStartState] = useState(DEFAULT_START);
  const [periodeEnd, setPeriodeEndState] = useState(DEFAULT_END);
  const [cabang, setCabangState] = useState<string[]>([]);

  const setPeriodeStart = useCallback((v: string) => setPeriodeStartState(v), []);
  const setPeriodeEnd = useCallback((v: string) => setPeriodeEndState(v), []);
  const setCabang = useCallback((v: string[]) => setCabangState(v), []);

  const resetFilters = useCallback(() => {
    setPeriodeStartState(DEFAULT_START);
    setPeriodeEndState(DEFAULT_END);
    setCabangState([]);
  }, []);

  return (
    <FilterContext.Provider
      value={{
        periodeStart,
        periodeEnd,
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
