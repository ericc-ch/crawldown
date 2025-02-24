export const DEFAULT_HEADLESS = true

interface Config {
  browserPath: string | null
  headless: boolean
}

export class ConfigManager {
  private static instance: ConfigManager | null = null
  private config: Config = {
    browserPath: null,
    headless: DEFAULT_HEADLESS,
  }

  // Private constructor to prevent direct construction calls with `new`
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  getConfig(): Config {
    return this.config
  }

  setConfig(newConfig: Partial<Config>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    }
  }
}
