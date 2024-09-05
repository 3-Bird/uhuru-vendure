import { defineConfig } from 'tsup';

export default defineConfig({
    format: ['cjs'],
    dts: true,
    bundle: false,
    minify: false,
    skipNodeModulesBundle: true,
    entry: ['index.ts'],
    clean: true,
    outDir: 'lib',
    sourcemap: true,
    silent: true,
    tsconfig: 'tsconfig.build.json',
});
