import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '#/components/ProjectsPage'

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
})
