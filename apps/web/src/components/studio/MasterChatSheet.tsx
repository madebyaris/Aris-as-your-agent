import { useQuery } from '@tanstack/react-query'
import { Bot, Square } from 'lucide-react'
import { getSettings, listProjects } from '#/server/aris'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useStudioRun } from './studio-run-context'
import { MasterChat } from './MasterChat'
import { cn } from '@/lib/utils'

type MasterChatSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCommand: () => void
}

export function MasterChatSheet({
  open,
  onOpenChange,
}: MasterChatSheetProps) {
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { activeRun } = useStudioRun()
  const projectCount = projectsQuery.data?.projects.length ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-3 border-b p-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="size-4" />
            </span>
            Master
          </SheetTitle>
          <SheetDescription>
            Control-plane agent for projects, status, notes, and servers. Project code work stays
            in Board and Chat.
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span
              className={cn(
                'size-1.5 rounded-full',
                settingsQuery.data?.hasApiKey ? 'bg-status-success' : 'bg-muted-foreground/35',
              )}
            />
            <span className="text-xs text-muted-foreground">
              {settingsQuery.data?.hasApiKey ? 'Provider connected' : 'No provider'}
            </span>
            <Badge variant="outline" className="h-5 font-mono text-[10px] font-normal">
              {settingsQuery.data?.defaultModel ?? 'No model'}
            </Badge>
            <Badge variant="outline" className="h-5 font-normal">
              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </Badge>
            {activeRun ? (
              <Badge variant="secondary" className="h-5 gap-1 font-normal">
                <Square className="size-2.5 fill-current" />
                {activeRun.label}
              </Badge>
            ) : (
              <Badge variant="secondary" className="h-5 font-normal">
                Idle
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MasterChat />
        </div>
      </SheetContent>
    </Sheet>
  )
}
