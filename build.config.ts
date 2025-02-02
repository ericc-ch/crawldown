import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: ["src/main"],
  declaration: true,
  clean: true,
})
