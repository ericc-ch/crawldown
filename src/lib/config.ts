interface Config {
  browserPath: string | null
}

let config: Config = {
  browserPath: null,
}

export function getConfig(): Config {
  return config
}

export function setConfig(newConfig: Partial<Config>): void {
  config = {
    ...config,
    ...newConfig,
  }
}
