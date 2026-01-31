import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-af-neue-berlin)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#0f4d39", // Updated to user request
          light: "#1a664e", // Adjusted for new base
          dark: "#083325",  // Adjusted for new base
          50: "#f2f7f5",
          100: "#e1ebe6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
