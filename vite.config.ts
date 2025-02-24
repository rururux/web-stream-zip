import { defineConfig } from "vite"
import tsconfigPath from "vite-tsconfig-paths"

export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: "node",
          include: [ "./tests/node/**/*.test.ts" ]
        }
      }
    ]
  },
  plugins: [ tsconfigPath() ]
})