import { defineConfig } from "@voyant-travel/framework/project"

export default defineConfig({
  deployment: {
    target: "node",
    providers: {
      database: "postgres",
      // Uploaded media and generated documents must outlive the process. The
      // default `memory` provider keeps bytes in a Map, so every restart drops
      // every image and PDF the operator uploaded. `STORAGE_FILESYSTEM_ROOT`
      // points at a directory outside the deployed bundle; swap this to
      // `s3-compatible` when the deployment outgrows a single node.
      storage: "filesystem",
    },
  },
})
