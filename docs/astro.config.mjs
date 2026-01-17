import mdx from '@astrojs/mdx'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
	integrations: [mdx()],
	site: 'https://mdrv.github.io',
	base: '/wsx',
	outDir: './dist',
	srcDir: './src',
	build: {
		format: 'directory',
	},
})
