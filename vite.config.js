import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { posts } from './src/data/posts.js'

export default defineConfig({
  plugins: [react(), {
    name: 'article-directory-index',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const [pathname, query] = (request.url || '').split('?')
        if (posts.some(post => post.href === pathname)) {
          request.url = `${pathname}index.html${query ? `?${query}` : ''}`
        }
        next()
      })
    },
  }],
  server: { allowedHosts: ['terminal.local'] },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        blog: fileURLToPath(new URL('./blog/index.html', import.meta.url)),
      },
    },
  },
})
