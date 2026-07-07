#!/usr/bin/env node
import { chromium } from 'playwright'
import { mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

const outDir = process.argv[2] ?? '/opt/cursor/artifacts'
const baseUrl = process.argv[3] ?? 'http://localhost:3000'
const videoDir = join(outDir, 'video-tmp')

await mkdir(videoDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()

async function visit(path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1500)
}

await visit('/')
await visit('/projects')
await visit('/chat')

const select = page.locator('select').first()
if (await select.count()) {
  await select.selectOption({ index: 1 })
  await page.waitForTimeout(1000)
}

await page.fill('input[placeholder*="Describe"]', 'Add a hero section about single-origin coffee')
await page.waitForTimeout(800)

await context.close()
await browser.close()

const files = await import('node:fs/promises').then((fs) => fs.readdir(videoDir))
const webm = files.find((f) => f.endsWith('.webm'))
if (webm) {
  await rename(join(videoDir, webm), join(outDir, 'aris-demo.webm'))
  console.log(`Saved ${join(outDir, 'aris-demo.webm')}`)
}
