import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default [
    // ES modules build
    {
        input: 'src/index.js',
        output: {
            file: 'dist/membase.esm.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [
            nodeResolve({
                preferBuiltins: true
            }),
            commonjs()
        ],
        external: ['axios', 'ethers', 'crypto-js', 'uuid', 'fs', 'fs/promises', 'path']
    },
    // CommonJS build
    {
        input: 'src/index.js',
        output: {
            file: 'dist/membase.cjs.js',
            format: 'cjs',
            sourcemap: true
        },
        plugins: [
            nodeResolve({
                preferBuiltins: true
            }),
            commonjs()
        ],
        external: ['axios', 'ethers', 'crypto-js', 'uuid', 'fs', 'fs/promises', 'path']
    },
    // Minified build
    {
        input: 'src/index.js',
        output: {
            file: 'dist/membase.min.js',
            format: 'umd',
            name: 'Membase',
            sourcemap: true
        },
        plugins: [
            nodeResolve({
                preferBuiltins: true
            }),
            commonjs(),
            terser()
        ],
        external: ['axios', 'ethers', 'crypto-js', 'uuid', 'fs', 'fs/promises', 'path']
    }
]; 