import { randomUUID } from 'node:crypto'

type ArisAccount = {
  id: string
  label: string
  apiKey: string
  createdAt: string
}

type ArisSettings = {
  cursorApiKey?: string
  defaultModel?: string
  accounts?: ArisAccount[]
  activeAccountId?: string
}

/** Pure migration helper for tests (mirrors @aris/workspace migrateSettings). */
const DEFAULT_MODEL = 'composer-2.5'

export function migrateSettingsForTest(raw: ArisSettings): ArisSettings {
  const accounts = [...(raw.accounts ?? [])]
  if (raw.cursorApiKey?.trim() && accounts.length === 0) {
    const id = randomUUID()
    accounts.push({
      id,
      label: 'Default',
      apiKey: raw.cursorApiKey.trim(),
      createdAt: new Date().toISOString(),
    })
    return {
      ...raw,
      accounts,
      activeAccountId: raw.activeAccountId ?? id,
      defaultModel: raw.defaultModel ?? DEFAULT_MODEL,
    }
  }
  return {
    ...raw,
    accounts,
    defaultModel: raw.defaultModel ?? DEFAULT_MODEL,
  }
}
