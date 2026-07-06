#!/usr/bin/env node
/**
 * Seed ~/.aris with demo project, agent note, and placeholder API key for local visuals.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const ARIS_HOME = join(homedir(), '.aris')
const demoRoot = join(ARIS_HOME, 'demo', 'specialty-coffee')
const projectsPath = join(ARIS_HOME, 'projects.json')
const notesPath = join(ARIS_HOME, 'notes.json')
const settingsPath = join(ARIS_HOME, 'settings.json')

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

await mkdir(join(demoRoot, 'specs', 'active'), { recursive: true })

const projects = await readJson(projectsPath, { projects: [] })
let project = projects.projects.find((p) => p.name === 'Specialty Coffee Site')

if (!project) {
  const now = new Date().toISOString()
  project = {
    id: randomUUID(),
    name: 'Specialty Coffee Site',
    description: 'Demo project for Aris — continue adding features over time.',
    workspacePath: demoRoot,
    mode: 'continue',
    createdAt: now,
    updatedAt: now,
    features: [],
  }
  projects.projects.push(project)
  await writeFile(projectsPath, JSON.stringify(projects, null, 2))
}

const notes = await readJson(notesPath, { notes: [] })
const hasAgentNote = notes.notes.some(
  (n) => n.projectId === project.id && n.visibility === 'agent',
)

if (!hasAgentNote) {
  const now = new Date().toISOString()
  notes.notes.push({
    id: randomUUID(),
    projectId: project.id,
    title: 'Brand direction',
    body: 'Warm earth tones, single-origin focus, hero with brewing methods. Avoid stock photos.',
    visibility: 'agent',
    tags: ['design', 'brand'],
    createdAt: now,
    updatedAt: now,
  })
  await writeFile(notesPath, JSON.stringify(notes, null, 2))
}

const settings = await readJson(settingsPath, {})
if (!settings.cursorApiKey?.trim()) {
  settings.cursorApiKey = 'demo_key_for_local_screenshots'
  settings.defaultModel = settings.defaultModel ?? 'composer-2.5'
  await writeFile(settingsPath, JSON.stringify(settings, null, 2))
}

console.log('Demo data ready:', { projectId: project.id, workspacePath: project.workspacePath })
