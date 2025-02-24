/// <reference types="@vitest/browser/providers/playwright" />

import { downloadFile, selectFile, unZipFile } from "./tests/browser/commands"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPath from "vite-tsconfig-paths"

export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: "node",
          include: [ "./tests/node/**/*.test.ts" ]
        }
      },
      {
        test: {
          name: "browser",
          include: [ "./tests/browser/**/*.test.tsx" ],
          browser: {
            enabled: true,
            provider: "playwright",
            instances: [
              { browser: "chromium" }
            ],
            commands: {
              selectFile, downloadFile, unZipFile
            }
          }
        }
      }
    ]
  },
  plugins: [ react(), tsconfigPath() ]
})