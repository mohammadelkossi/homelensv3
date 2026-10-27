import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // homelens-v2/ is a separate nested git repo/checkout, not part of this
    // project — without this it gets linted (including its own
    // node_modules), which drowns real results in ~75k irrelevant problems.
    "homelens-v2/**",
  ]),
]);

export default eslintConfig;
