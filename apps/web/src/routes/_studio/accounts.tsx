import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  addAccountFn,
  getSettings,
  listModelsFn,
  removeAccountFn,
  setActiveAccountFn,
  setDefaultModelFn,
} from '#/server/aris'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Bot, Check, Cpu, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_studio/accounts')({
  component: AccountsPage,
})

function AccountsPage() {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: listModelsFn,
    enabled: settingsQuery.data?.hasApiKey === true,
  })

  const [label, setLabel] = useState('Default')
  const [apiKey, setApiKey] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const addMutation = useMutation({
    mutationFn: () => addAccountFn({ data: { label, apiKey } }),
    onSuccess: async () => {
      setApiKey('')
      setAddOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['models'] })
      toast.success('Account saved')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Invalid key'),
  })

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Agent configuration</p>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Choose the Cursor identity and model Aris uses for local project work.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add account
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <h2 className="text-sm font-semibold">Cursor accounts</h2>
          <span className="text-xs text-muted-foreground">
            {settingsQuery.data?.accounts.length ?? 0} saved
          </span>
        </div>
        {(settingsQuery.data?.accounts.length ?? 0) === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl border bg-muted/40">
              <KeyRound className="size-4.5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">Connect your first account</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Keys are validated against Cursor before they are saved locally.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5" />
              Add Cursor API key
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {(settingsQuery.data?.accounts ?? []).map((account) => {
              const active = settingsQuery.data?.activeAccountId === account.id
              return (
                <div
                  key={account.id}
                  className="flex min-h-[76px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs">
                    <Bot className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{account.label}</h3>
                      {active ? (
                        <Badge variant="secondary" className="h-5 gap-1 font-normal">
                          <Check className="size-3" />
                          Active
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {account.keyHint}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {!active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await setActiveAccountFn({ data: { accountId: account.id } })
                          await queryClient.invalidateQueries({ queryKey: ['settings'] })
                        }}
                      >
                        Make active
                      </Button>
                    ) : null}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${account.label}`}
                      onClick={async () => {
                        await removeAccountFn({ data: { accountId: account.id } })
                        await queryClient.invalidateQueries({ queryKey: ['settings'] })
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Run preferences</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Applied to new chats and board runs.
          </p>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/35">
              <Cpu className="size-4 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-sm font-medium">Default model</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The model Aris selects unless a run overrides it.
              </p>
            </div>
          </div>
          <Select
            value={settingsQuery.data?.defaultModel ?? 'composer-2.5'}
            onValueChange={async (value) => {
              if (!value) return
              await setDefaultModelFn({ data: { model: value } })
              await queryClient.invalidateQueries({ queryKey: ['settings'] })
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {(modelsQuery.data?.models.length
                ? modelsQuery.data.models
                : [{ id: 'composer-2.5', displayName: 'composer-2.5' }]
              ).map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/25 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <p>
          API keys remain in{' '}
          <code className="font-mono text-[11px] text-foreground">~/.aris/settings.json</code>{' '}
          on this machine. They are never rendered after saving.
        </p>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Add Cursor account</SheetTitle>
            <SheetDescription>
              The key is verified with Cursor before it is stored.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 px-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="account-label">Label</Label>
              <Input
                id="account-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Personal"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-key">API key</Label>
              <Input
                id="account-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="cursor_..."
                className="font-mono text-xs"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                This account becomes active after validation.
              </p>
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!apiKey.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              Save and activate
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
