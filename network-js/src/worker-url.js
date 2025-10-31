/**
 * Worker URL export for bundlers
 *
 * This module exports the URL to the network worker file.
 * It resolves correctly whether the library is:
 * - Installed from NPM
 * - Linked locally
 * - Used in a monorepo
 *
 * Usage in your app:
 * ```javascript
 * import NetworkStats from '@guinetik/network-js';
 * import workerUrl from '@guinetik/network-js/worker-url';
 *
 * const analyzer = new NetworkStats({ workerScript: workerUrl });
 * ```
 */

// Resolve worker URL relative to this module
// When bundled by Vite/Webpack/etc, this will resolve correctly
export default new URL('./network-worker.js', import.meta.url).href;
