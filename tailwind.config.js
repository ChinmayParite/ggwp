/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'deep-black': '#050505',
                'vibrant-red': '#FF0000',
                'industrial-silver': '#C0C0C0',
                'aviation-orange': '#FF9500',
                'mach-gold': '#FFB800',
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Space Mono', 'monospace'],
                industrial: ['Orbitron', 'sans-serif'],
            },
        },
    },
    plugins: [],
}