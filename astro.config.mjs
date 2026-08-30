import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://infant83.github.io',
  base: '/sj-resurrection',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx()],
  vite: {
    build: {
      sourcemap: false,
    },
  },
});
