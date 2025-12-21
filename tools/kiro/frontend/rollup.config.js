/**
 * Rollup configuration for ARK Digital Calendar frontend
 * 
 * Bundles JavaScript modules for production deployment with optimizations.
 */

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;
const isOptimizedBuild = process.env.BUILD === 'optimized';

export default {
    input: {
        // Main application bundle - use optimized version when building optimized
        app: isOptimizedBuild ? 'src/js/app-optimized.js' : 'src/js/app.js',
        // Service worker (separate bundle)
        sw: 'public/sw.js'
    },
    output: {
        dir: 'public/js',
        format: 'es',
        sourcemap: !production,
        // Enable code splitting
        manualChunks: {
            // Vendor libraries
            vendor: ['idb'],
            // Notification functionality (lazy loaded)
            notifications: ['workbox-sw']
        },
        // Optimize chunk names
        chunkFileNames: production ? '[name]-[hash].js' : '[name].js',
        entryFileNames: production ? '[name]-[hash].js' : '[name].js'
    },
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs(),
        production && terser({
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.debug'],
                passes: 2
            },
            mangle: {
                properties: {
                    regex: /^_/  // Mangle private properties starting with _
                }
            },
            format: {
                comments: false
            }
        })
    ].filter(Boolean),
    // Optimize dependencies
    external: [],
    watch: {
        clearScreen: false,
        include: 'src/**',
        exclude: 'node_modules/**'
    }
};