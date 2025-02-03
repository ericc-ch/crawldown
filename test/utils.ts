import { readFileSync } from "node:fs"
import { join } from "node:path"

export const readFixture = (name: string): string => {
  return readFileSync(join(import.meta.dirname, "fixtures", name), "utf-8")
}
