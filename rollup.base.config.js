import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import * as react from 'react';
import * as reactDom from 'react-dom';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import { terser } from 'rollup-plugin-terser';

export const plugins = [
  commonjs({
    namedExports: {
      // Source: https://github.com/rollup/rollup-plugin-commonjs/issues/290#issuecomment-537683484
      react: Object.keys(react),
      'react-dom': Object.keys(reactDom),
    },
  }),
  replace({
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  }),
  json(),
  resolve({
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  }),
  babel({
    exclude: 'node_modules/**',
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    rootMode: 'upward',
    runtimeHelpers: true,
  }),
  terser(),
  filesize({
    showMinifiedSize: false,
    showGzippedSize: true,
  }),
];
