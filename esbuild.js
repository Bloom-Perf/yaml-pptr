const esbuild = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');
esbuild
    .build({
        entryPoints: ['./src/index.ts'],
        outfile: 'dist/index.js',
        bundle: true,
        minify: true,
        treeShaking: true,
        platform: 'node',
        format: 'cjs',
        target: 'node18',
        plugins: [nodeExternalsPlugin()],
    })
    .catch(() => process.exit(1));