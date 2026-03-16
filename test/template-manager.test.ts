import {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplateVersion,
  deleteTemplate,
  addTagToTemplate,
  searchTemplates,
  clearTemplates
} from "../src/workflows/template-manager.js"
import { WorkflowRecipe } from "../src/types.js"

describe("TemplateManager", () => {
  const mockRecipe: WorkflowRecipe = {
    name: "Test Recipe",
    description: "Test",
    type: "simple",
    steps: ["understand", "plan"]
  }

  beforeEach(() => {
    clearTemplates()
  })

  it("should create template", () => {
    const template = createTemplate("tmpl-1", "Test Template", mockRecipe)

    expect(template.id).toBe("tmpl-1")
    expect(template.name).toBe("Test Template")
    expect(template.version).toBe("1.0.0")
  })

  it("should get template", () => {
    createTemplate("tmpl-1", "Test", mockRecipe)

    const template = getTemplate("tmpl-1")
    expect(template).not.toBeNull()
    expect(template!.name).toBe("Test")
  })

  it("should list templates", () => {
    createTemplate("tmpl-1", "Template 1", mockRecipe)
    createTemplate("tmpl-2", "Template 2", mockRecipe)

    const templates = listTemplates()
    expect(templates.length).toBe(2)
  })

  it("should update version", () => {
    createTemplate("tmpl-1", "Test", mockRecipe)

    updateTemplateVersion("tmpl-1", "2.0.0")
    const template = getTemplate("tmpl-1")

    expect(template!.version).toBe("2.0.0")
  })

  it("should delete template", () => {
    createTemplate("tmpl-1", "Test", mockRecipe)
    expect(listTemplates().length).toBe(1)

    deleteTemplate("tmpl-1")
    expect(listTemplates().length).toBe(0)
  })

  it("should add tags", () => {
    createTemplate("tmpl-1", "Test", mockRecipe)

    addTagToTemplate("tmpl-1", "workflow")
    addTagToTemplate("tmpl-1", "production")

    const template = getTemplate("tmpl-1")
    expect(template!.tags).toContain("workflow")
    expect(template!.tags).toContain("production")
  })

  it("should search templates", () => {
    createTemplate("tmpl-1", "Data Processing", mockRecipe, "1.0.0", "Process large datasets")
    createTemplate("tmpl-2", "Web API", mockRecipe)

    const results = searchTemplates("data")
    expect(results.length).toBe(1)
    expect(results[0].name).toBe("Data Processing")
  })
})
