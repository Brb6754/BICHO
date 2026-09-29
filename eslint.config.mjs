import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// Flat config, because ESLint 10 removed .eslintrc entirely — and
// `next lint` went away in Next 16, so `npm run lint` now calls the
// eslint CLI directly. The old .eslintrc.json said exactly one thing
// ("extends": "next/core-web-vitals"); that one thing is the spread
// below. eslint-config-next already ships as a flat-config array, so
// there is nothing to translate.
const config = [
  {
    // Build output and vendored code. node_modules is ignored by
    // default; .next is not, and linting it reports thousands of
    // problems in generated files nobody will ever edit.
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.claude/skills/**'],
  },
  ...nextCoreWebVitals,
  {
    // eslint-config-next bundles an eslint-plugin-react that detects the
    // React version by calling context.getFilename() — an API ESLint 10
    // removed, so every file throws before a single rule runs. Stating
    // the version skips that detection path entirely. Keep it in step
    // with the react dependency in package.json.
    settings: { react: { version: '19.2' } },
  },
];

export default config;
