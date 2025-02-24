/// <reference types="@vitest/browser/providers/playwright" />

import { downloadFile, selectFile, unZipFile } from "./tests/browser/commands"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tsconfigPath from "vite-tsconfig-paths"
import dts from "vite-plugin-dts"
import { resolve } from "path"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "./index.ts"),
      name: "web-stream-zip",
      fileName: "index",
      formats: [ "es" ]
    }
  },
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
  plugins: [ react(), tsconfigPath(), dts({ tsconfigPath: "./tsconfig.main.json" }) ]
})