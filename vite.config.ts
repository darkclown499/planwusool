import tailwindcss from '@tailwindcss/vite';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function stripUseClientDirective(): import('vite').Plugin {
  return {
    name: 'strip-use-client-directive',
    enforce: 'pre' as const,
    transform(code, id) {
      if (
        id.endsWith('.js') ||
        id.endsWith('.ts') ||
        id.endsWith('.tsx') ||
        id.endsWith('.mjs')
      ) {
        if (code.includes('"use client"') || code.includes("'use client'")) {
          return code.replace(/['"]use client['"];?\s*/g, '');
        }
      }
    },
  };
}

export default defineConfig(({ isSsrBuild }) => {
    return {
        base: './',
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
                buildDirectory: process.env.VITE_BUILD_DIR || 'build',
            }),
            stripUseClientDirective(),
            tailwindcss(),
            react(),
        ],
        server: {
            host: '127.0.0.1',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': '*',
            },
            watch: {
                ignored: ['**/vendor/**', '**/node_modules/**']
            }
        },

        esbuild: {
            jsx: 'automatic',
            jsxImportSource: 'react',
        },
        resolve: {
            alias: {
                'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    // manualChunks split client vendor bundles for caching.
                    // The SSR build externalizes react (and all deps) so it
                    // must not use manualChunks — react can't be included in a
                    // chunk when it's resolved as external.
                    manualChunks: isSsrBuild
                        ? undefined
                        : {
                            vendor: ['react', 'react-dom'],
                            // Every @radix-ui primitive the app installs + class utils.
                            // Grouping them keeps them in one long-cached chunk instead
                            // of bloating the entry bundle on every deploy.
                            ui: [
                                '@radix-ui/react-avatar', '@radix-ui/react-checkbox',
                                '@radix-ui/react-collapsible', '@radix-ui/react-dialog',
                                '@radix-ui/react-direction', '@radix-ui/react-dropdown-menu',
                                '@radix-ui/react-label', '@radix-ui/react-navigation-menu',
                                '@radix-ui/react-popover', '@radix-ui/react-progress',
                                '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area',
                                '@radix-ui/react-select', '@radix-ui/react-separator',
                                '@radix-ui/react-slot', '@radix-ui/react-switch',
                                '@radix-ui/react-tabs', '@radix-ui/react-toggle-group',
                                '@radix-ui/react-tooltip',
                                'class-variance-authority', 'clsx', 'tailwind-merge',
                            ],
                            // i18next runtime + plugins are stable across deploys;
                            // isolate them so locale JSON changes don't invalidate
                            // the whole entry hash.
                            i18n: [
                                'i18next', 'react-i18next',
                                'i18next-browser-languagedetector', 'i18next-http-backend',
                            ],
                            utils: ['date-fns'],
                            // Heavy libraries pulled into the entry chunk by Rollup's
                            // shared-dependency hoisting. Splitting them out keeps the
                            // initial HTML payload (landing page, auth, dashboard shell)
                            // small; they load only when the importing page actually uses them.
                            charts: ['recharts'],
                            editor: ['@uiw/react-codemirror', '@codemirror/lang-css', '@codemirror/lang-javascript', '@codemirror/lang-json'],
                            tiptap: ['@tiptap/react', '@tiptap/starter-kit'],
                            calendar: ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
                            payments: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
                            qr: ['qrcode', 'react-qr-code', 'react-barcode'],
                            sentry: ['@sentry/react', '@sentry/tracing', '@sentry/replay'],
                        }
                },
            },
            assetsDir: 'assets',
        }
    };
});