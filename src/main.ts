// src/main.ts
import { Router } from './router'
import { mountShelf } from './pages/shelf'

const app = document.getElementById('app')!
const router = new Router(app)

router.on('/', () => mountShelf(app, router))
router.on('/shelf', () => mountShelf(app, router))
router.on('/reader/:bookId', (params) => {
  import('./pages/reader').then(m => m.mountReader(app, router, params.bookId))
})

router.start()

// Default route
if (!window.location.hash || window.location.hash === '#') {
  router.navigate('/shelf')
}
