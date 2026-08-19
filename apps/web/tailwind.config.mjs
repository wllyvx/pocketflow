/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: { 500: "#4F46E5", 600: "#4338CA" },
        secondary: { 500: "#10B981", 600: "#059669" },
        warning: "#F59E0B",
        danger: "#EF4444",
        ink: { 50: "#F9FAFB", 100: "#F3F4F6", 200: "#E5E7EB", 300: "#D1D5DB", 400: "#9CA3AF", 500: "#6B7280", 700: "#374151", 900: "#111827" },
        canvas: "#F5F6F2",
        coral: { 50: "#FFF1EC", 100: "#FFE1D4", 500: "#ED795D", 600: "#D66D57" },
        navy: { 500: "#253A4C", 600: "#1E3346" },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "DM Sans", "ui-sans-serif", "sans-serif"],
      },
      spacing: { 18: "4.5rem" },
      borderRadius: { sm: "2px", DEFAULT: "4px", md: "6px", lg: "8px", xl: "12px" },
      transitionDuration: { fast: "100ms", standard: "200ms", slow: "300ms" },
    },
  },
  plugins: [],
};
