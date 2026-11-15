import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

/**
 * Turn legacy `/src/assets/...` image URLs in JSX into Vite asset imports.
 * This keeps those images in the production bundle instead of leaving the
 * browser to request a development-only `/src/...` URL at runtime.
 */
function bundleLegacySourceImages(): Plugin {
  return {
    name: 'bundle-legacy-source-images',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/')) return null;

      const imagePattern = /(["'])\/src\/assets\/images\/([^"']+\.(?:avif|gif|jpe?g|png|svg|webp))\1/g;
      let imageIndex = 0;
      const imports: string[] = [];
      const transformed = code.replace(imagePattern, (_match, _quote: string, imagePath: string) => {
        const variable = `__villotharImage${imageIndex++}`;
        imports.push(`import ${variable} from '../assets/images/${imagePath}';`);
        return `{${variable}}`;
      });

      return imports.length ? `${imports.join('\n')}\n${transformed}` : null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [bundleLegacySourceImages(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
