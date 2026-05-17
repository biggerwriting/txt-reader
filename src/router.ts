// src/router.ts

type RouteHandler = (params: Record<string, string>) => void

interface Route {
  pattern: RegExp
  keys: string[]
  handler: RouteHandler
}

export class Router {
  private routes: Route[] = []
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    window.addEventListener('hashchange', () => this.dispatch())
  }

  on(path: string, handler: RouteHandler): void {
    const keys: string[] = []
    const regexStr = path.replace(/:(\w+)/g, (_, key) => {
      keys.push(key)
      return '([^/]+)'
    })
    this.routes.push({ pattern: new RegExp(`^${regexStr}$`), keys, handler })
  }

  navigate(path: string): void {
    window.location.hash = path
  }

  dispatch(): void {
    const hash = window.location.hash.slice(1) || '/'
    for (const route of this.routes) {
      const match = hash.match(route.pattern)
      if (match) {
        const params: Record<string, string> = {}
        route.keys.forEach((key, i) => { params[key] = match[i + 1] })
        this.container.innerHTML = ''
        route.handler(params)
        return
      }
    }
  }

  start(): void {
    this.dispatch()
  }
}
