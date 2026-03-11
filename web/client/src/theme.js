// src/theme.js
import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        tavern: {
          bg: { value: "#F3E5C6" },
          panel: { value: "#FAF1D9" },
          wood: { value: "#3B2416" },
          woodDark: { value: "#2A170E" },
          brass: { value: "#C9A227" },
          ink: { value: "#2A1B12" },
        },
      },
    },
  },
});