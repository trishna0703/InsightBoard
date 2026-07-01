import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FilterInput, DEFAULT_FILTER } from "../hooks/useInsights";

const STORAGE_KEY = "insightboard.filters.v1";

interface FiltersContextValue {
  filters: FilterInput;
  setFilters: React.Dispatch<React.SetStateAction<FilterInput>>;
  clearFilters: () => void;
  /** True until the persisted filters have been read from storage. */
  hydrated: boolean;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Holds the board's composable-filter state ABOVE the navigator so it survives
 * tab navigation (Module 6.3 "Filters persist across navigation"), and mirrors
 * it to AsyncStorage so it also survives an app restart.
 */
export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterInput>(DEFAULT_FILTER);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Load persisted filters once on mount.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw) {
          const parsed = JSON.parse(raw) as Partial<FilterInput>;
          setFilters({ ...DEFAULT_FILTER, ...parsed });
        }
      })
      .catch(() => {
        /* corrupt/missing value — fall back to defaults */
      })
      .finally(() => {
        if (active) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist on change, but only after hydration so the initial default write
  // doesn't clobber stored filters before they've loaded.
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters)).catch(() => null);
  }, [filters]);

  const clearFilters = () => setFilters(DEFAULT_FILTER);

  return (
    <FiltersContext.Provider
      value={{ filters, setFilters, clearFilters, hydrated }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters must be used within a FiltersProvider");
  }
  return ctx;
}
