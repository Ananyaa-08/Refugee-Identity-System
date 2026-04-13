/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'rims-bg-primary': '#060d1f',
                'rims-bg-secondary': '#0a1428',
                'rims-bg-card': '#0f1e38',
                'rims-bg-elevated': '#152342',
                'rims-border': '#1a2d4a',
                'rims-border-bright': '#1e3a5f',
                'rims-teal': '#00c9b1',
                'rims-amber': '#f59e0b',
                'rims-blue': '#3b82f6',
                'rims-green': '#10b981',
                'rims-red': '#ef4444',
                'rims-purple': '#8b5cf6',
            },
            fontFamily: {
                sans: ['IBM Plex Sans', 'sans-serif'],
                mono: ['IBM Plex Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
