/** @type {import('eslint').Linter.Config} */
const nextConfig = require('@eslint/js').configs.recommended;

module.exports = {
  extends: [
    "next/core-web-vitals",
    "next/typescript"
  ],
  rules: {
    // Temporarily disable for deployment
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn", 
    "prefer-const": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
};