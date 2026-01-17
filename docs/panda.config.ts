import { defineConfig } from '@pandacss/dev'

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: ['./src/**/*.{ts,tsx,js,jsx,astro}', './pages/**/*.{ts,tsx,js,jsx,astro}'],

	// Files to exclude
	exclude: [],

	// Useful for theme customization
	theme: {
		extend: {
			tokens: {
				colors: {
					brand: {
						50: { value: '#eff6ff' },
						100: { value: '#dbeafe' },
						200: { value: '#bfdbfe' },
						300: { value: '#93c5fd' },
						400: { value: '#60a5fa' },
						500: { value: '#3b82f6' },
						600: { value: '#2563eb' },
						700: { value: '#1d4ed8' },
						800: { value: '#1e40af' },
						900: { value: '#1e3a8a' },
					},
					gray: {
						50: { value: '#f9fafb' },
						100: { value: '#f3f4f6' },
						200: { value: '#e5e7eb' },
						300: { value: '#d1d5db' },
						400: { value: '#9ca3af' },
						500: { value: '#6b7280' },
						600: { value: '#4b5563' },
						700: { value: '#374151' },
						800: { value: '#1f2937' },
						900: { value: '#111827' },
					},
				},
				fonts: {
					body: { value: 'system-ui, -apple-system, sans-serif' },
					mono: { value: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace" },
				},
				fontSizes: {
					xs: { value: '0.75rem' },
					sm: { value: '0.875rem' },
					md: { value: '1rem' },
					lg: { value: '1.125rem' },
					xl: { value: '1.25rem' },
					'2xl': { value: '1.5rem' },
					'3xl': { value: '1.875rem' },
					'4xl': { value: '2.25rem' },
					'5xl': { value: '3rem' },
				},
				spacing: {
					0: { value: '0' },
					1: { value: '0.25rem' },
					2: { value: '0.5rem' },
					3: { value: '0.75rem' },
					4: { value: '1rem' },
					5: { value: '1.25rem' },
					6: { value: '1.5rem' },
					8: { value: '2rem' },
					10: { value: '2.5rem' },
					12: { value: '3rem' },
					16: { value: '4rem' },
					20: { value: '5rem' },
					24: { value: '6rem' },
				},
			},
		},
	},

	// The output directory for your css system
	outdir: 'styled-system',
})
