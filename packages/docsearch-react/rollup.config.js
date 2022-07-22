import replace from '@rollup/plugin-replace';

import { plugins } from '../../rollup.base.config';
import { getBundleBanner } from '../../scripts/getBundleBanner';

import pkg from './package.json';

export default {
  input: 'src/index.ts',
  external: [
    'react',
    'react-dom',
    'typesense',
    'typesense-instantsearch-adapter/lib/SearchResponseAdapter',
  ],
  output: {
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      typesense: 'typesense',
      'typesense-instantsearch-adapter/lib/SearchResponseAdapter':
        'SearchResponseAdapter',
      '@babel/runtime/regenerator': 'regeneratorRuntime',
    },
    file: 'dist/umd/index.js',
    format: 'umd',
    sourcemap: true,
    name: pkg.name,
    banner: getBundleBanner(pkg),
  },
  plugins: [
    ...plugins,
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
};
