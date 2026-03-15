/**
 * 工作流模板管理器 - Phase 4
 */

import { log } from "../utils.js"
import { WorkflowRecipe } from "../types.js"

export interface WorkflowTemplate {
  id: string
  name: string
  version: string
  recipe: WorkflowRecipe
  description: string
  tags: string[]
  createdAt: number
  author?: string
}

const templates = new Map<string, WorkflowTemplate[]>()

export function createTemplate(
  templateId: string,
  name: string,
  recipe: WorkflowRecipe,
  version: string = "1.0.0",
  description: string = ""
): WorkflowTemplate {
  const template: WorkflowTemplate = {
    id: templateId,
    name,
    version,
    recipe,
    description,
    tags: [],
    createdAt: Date.now()
  }

  if (!templates.has("global")) {
    templates.set("global", [])
  }
  templates.get("global")!.push(template)

  log("TemplateManager", `Template created: ${name} v${version}`)
  return template
}

export function getTemplate(templateId: string): WorkflowTemplate | null {
  const allTemplates = Array.from(templates.values()).flat()
  return allTemplates.find(t => t.id === templateId) || null
}

export function listTemplates(): WorkflowTemplate[] {
  return Array.from(templates.values()).flat()
}

export function updateTemplateVersion(templateId: string, newVersion: string): boolean {
  const template = getTemplate(templateId)
  if (!template) return false

  template.version = newVersion
  return true
}

export function deleteTemplate(templateId: string): boolean {
  const allTemplates = templates.get("global")
  if (!allTemplates) return false

  const idx = allTemplates.findIndex(t => t.id === templateId)
  if (idx === -1) return false

  allTemplates.splice(idx, 1)
  return true
}

export function addTagToTemplate(templateId: string, tag: string): void {
  const template = getTemplate(templateId)
  if (template && !template.tags.includes(tag)) {
    template.tags.push(tag)
  }
}

export function searchTemplates(query: string): WorkflowTemplate[] {
  const allTemplates = listTemplates()
  const q = query.toLowerCase()

  return allTemplates.filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
  )
}

export function clearTemplates(): void {
  templates.clear()
}
