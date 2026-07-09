import { Outlet, createFileRoute } from '@tanstack/react-router'
import { StudioShell } from '@/components/studio/StudioShell'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createFileRoute('/_studio')({
  component: StudioLayout,
})

function StudioLayout() {
  return (
    <TooltipProvider>
      <StudioShell>
        <Outlet />
      </StudioShell>
    </TooltipProvider>
  )
}
