interface Config {
  browserPath: string | null
}

export class ConfigManager {
  private static instance: ConfigManager | null = null
  private config: Config = {
    browserPath: null,
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
