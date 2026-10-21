import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

import { getBundleBanner } from '../../scripts/getBundleBanner.ts';
import { defines, pkgExports } from '../../tsdown.base.ts';

import pkg from './package.json' with { type: 'json' };

const externals = [
  'react',
  'react-dom',
  /^react\//,
  'typesense-docsearch-core',
];

const sharedConfig: UserConfig = {
  platform: 'browser',
  deps: {
    neverBundle: externals,
  },
  target: 'es2017',
  define: defines,
  sourcemap: true,
  outExtensions: () => ({
    js: '.js',
  }),
};

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      docsearch: 'src/DocSearch.tsx',
      docsearchAi: 'src/DocSearchAI.tsx',
      askaiModal: 'src/DocSearchAskAiModal.tsx',
      button: 'src/DocSearchButton.tsx',
      modal: 'src/DocSearchModal.tsx',
      useDocSearchKeyboardEvents: 'src/useDocSearchKeyboardEvents.ts',
      useTheme: 'src/useTheme.tsx',
      version: 'src/version.ts',
      sidepanel: 'src/Sidepanel.tsx',
      sidepanelPanel: 'src/Sidepanel/Sidepanel.tsx',
      sidepanelButton: 'src/Sidepanel/SidepanelButton.tsx',
    },
    ...sharedConfig,
    dts: true,
    format: 'esm',
    minify: false,
    outDir: 'dist/esm',
    exports: {
      ...pkgExports,
      customExports: {
        './style': './style/index.js',
        './style/askai': './style/askai.js',
        './style/button': './style/button.js',
        './style/modal': './style/modal.js',
        './style/sidepanel': './style/sidepanel.js',
        './style/variables': './style/variables.js',
      },
    },
  },
  {
    entry: 'src/index.ts',
    outDir: 'dist/umd',
    ...sharedConfig,
    banner: getBundleBanner(pkg),
    deps: {
      alwaysBundle: [
        /^@algolia\/autocomplete-core/,
        /^@base-ui\/react/,
        /^algoliasearch/,
        /^marked(?:\/|$)/,
        /^zod(?:\/|$)/,
      ],
      neverBundle: externals,
      onlyBundle: false,
    },
    dts: false,
    globalName: 'DocSearchReact',
    minify: true,
    outputOptions: {
      entryFileNames: '[name].js',
      globals: {
        react: 'React',
        'react/jsx-runtime': 'React',
        'react-dom': 'ReactDOM',
        'typesense-docsearch-core': 'DocSearchCore',
        'typesense-docsearch-core/useTheme': 'DocSearchCore',
      },
    },
    format: 'umd',
  },
]);
