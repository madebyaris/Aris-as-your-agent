import { randomUUID } from 'node:crypto'

type ArisProvider = 'cursor' | 'openrouter'

type ArisAccount = {
  id: string
  label: string
  apiKey: string
  provider: ArisProvider
  createdAt: string
}

type ArisSettings = {
  cursorApiKey?: string
  defaultModel?: string
  defaultProvider?: ArisProvider
  accounts?: Array<Partial<ArisAccount> & { id: string; label: string; apiKey: string; createdAt: string }>
  activeAccountId?: string
}

/** Pure migration helper for tests (mirrors @aris/workspace migrateSettings). */
const DEFAULT_MODEL = 'composer-2.5'
const DEFAULT_PROVIDER: ArisProvider = 'cursor'

export function migrateSettingsForTest(raw: ArisSettings): ArisSettings {
  let accounts: ArisAccount[] = [...(raw.accounts ?? [])].map((a) => ({
    ...a,
    provider: a.provider ?? DEFAULT_PROVIDER,
  }))
  if (raw.cursorApiKey?.trim() && accounts.length === 0) {
    const id = randomUUID()
    accounts = [
      {
        id,
        label: 'Default',
        apiKey: raw.cursorApiKey.trim(),
        provider: 'cursor',
        createdAt: new Date().toISOString(),
      },
    ]
    return {
      ...raw,
      accounts,
      activeAccountId: raw.activeAccountId ?? id,
      defaultModel: raw.defaultModel ?? DEFAULT_MODEL,
      defaultProvider: raw.defaultProvider ?? 'cursor',
    }
  }
  const active = accounts.find((a) => a.id === raw.activeAccountId) ?? accounts[0]
  return {
    ...raw,
    accounts,
    defaultModel: raw.defaultModel ?? DEFAULT_MODEL,
    defaultProvider: raw.defaultProvider ?? active?.provider ?? DEFAULT_PROVIDER,
  }
}
