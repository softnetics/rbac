// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Softnetics RBAC',
      social: {
        github: 'https://github.com/softnetics/rbac',
      },
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
          //   items: [
          //     // Each item here is one entry in the navigation menu.
          //     { label: 'Introduction', slug: 'getting-started/introduction' },
          //   ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
})
