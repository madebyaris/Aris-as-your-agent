#!/usr/bin/env node
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const outDir = process.argv[2] ?? '/opt/cursor/artifacts/screenshots'
const baseUrl = process.argv[3] ?? 'http://localhost:3000'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

async function shot(name, url, action) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (action) await action(page)
  await page.waitForTimeout(500)
  const path = join(outDir, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  console.log(`Saved ${path}`)
}

await shot('home', `${baseUrl}/`)
await shot('projects', `${baseUrl}/projects`)
await shot('chat', `${baseUrl}/chat`, async (p) => {
  const select = p.locator('select').first()
  if (await select.count()) {
    await select.selectOption({ index: 1 })
    await p.waitForTimeout(800)
  }
})

await browser.close()
console.log(`Screenshots in ${outDir}`)
