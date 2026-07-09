import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type StudioActiveRun = {
  runKey: string
  label: string
  projectId?: string
}

type StudioRunContextValue = {
  activeRun: StudioActiveRun | null
  setActiveRun: (run: StudioActiveRun | null) => void
  clearRun: (runKey?: string) => void
}

const StudioRunContext = createContext<StudioRunContextValue | null>(null)

export function StudioRunProvider({ children }: { children: ReactNode }) {
  const [activeRun, setActiveRunState] = useState<StudioActiveRun | null>(null)

  const setActiveRun = useCallback((run: StudioActiveRun | null) => {
    setActiveRunState(run)
  }, [])

  const clearRun = useCallback((runKey?: string) => {
    setActiveRunState((current) => {
      if (!current) return null
      if (runKey && current.runKey !== runKey) return current
      return null
    })
  }, [])

  const value = useMemo(
    () => ({ activeRun, setActiveRun, clearRun }),
    [activeRun, setActiveRun, clearRun],
  )

  return (
    <StudioRunContext.Provider value={value}>{children}</StudioRunContext.Provider>
  )
}

export function useStudioRun() {
  const ctx = useContext(StudioRunContext)
  if (!ctx) {
    throw new Error('useStudioRun must be used within StudioRunProvider')
  }
  return ctx
}
