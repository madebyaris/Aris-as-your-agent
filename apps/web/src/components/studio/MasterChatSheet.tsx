import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bot, FolderKanban, KeyRound, Search, Square } from 'lucide-react'
import { getSettings, listProjects } from '#/server/aris'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useStudioRun } from './studio-run-context'
import { cn } from '@/lib/utils'

type MasterChatSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCommand: () => void
}

export function MasterChatSheet({
  open,
  onOpenChange,
  onOpenCommand,
}: MasterChatSheetProps) {
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { activeRun } = useStudioRun()
  const projectCount = projectsQuery.data?.projects.length ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="size-4" />
            </span>
            Master
          </SheetTitle>
          <SheetDescription>
            Control plane for projects, accounts, and run status. Project chat stays inside each
            workspace.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <section className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Connection
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  'size-2 rounded-full',
                  settingsQuery.data?.hasApiKey ? 'bg-status-success' : 'bg-muted-foreground/35',
                )}
              />
              <span className="text-sm font-medium">
                {settingsQuery.data?.hasApiKey ? 'Provider connected' : 'No provider connected'}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
              {settingsQuery.data?.defaultModel ?? 'No model selected'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="font-normal">
                {projectCount} {projectCount === 1 ? 'project' : 'projects'}
              </Badge>
              {activeRun ? (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Square className="size-2.5 fill-current" />
                  {activeRun.label}
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-normal">
                  Idle
                </Badge>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-dashed bg-muted/25 p-4">
            <p className="text-sm font-medium">Master chat comes next</p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              This surface will command projects, credentials, and status without editing project
              code. Use project Board or Chat for execution today.
            </p>
          </section>

          <div className="grid gap-2">
            <Button asChild variant="outline" className="justify-start" onClick={() => onOpenChange(false)}>
              <Link to="/studio">
                <FolderKanban className="size-4" />
                Open projects
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start" onClick={() => onOpenChange(false)}>
              <Link to="/accounts">
                <KeyRound className="size-4" />
                Accounts & models
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                onOpenChange(false)
                onOpenCommand()
              }}
            >
              <Search className="size-4" />
              Command palette
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘K</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
