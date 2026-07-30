import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  export default defineconfig({
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    seed: {
      run: "ts-node",
      args: [
        "--compiler-options",
        '{"module":"CommonJS"}',
        "prisma/seed.ts",
      ],
    },
  },
});
