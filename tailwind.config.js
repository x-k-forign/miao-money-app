/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        miao: {
          background: "#F5FBFF",
          card: "#FFFFFF",
          primary: "#72C8F3",
          primarySoft: "#DFF3FF",
          text: "#29465B",
          muted: "#7A93A6",
          pink: "#FFB8D2",
          mint: "#BDEDD8",
          yellow: "#FFE8A9"
        }
      },
      borderRadius: {
        miao: "18px"
      }
    }
  },
  plugins: []
};
