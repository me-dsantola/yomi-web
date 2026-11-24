import { readFileSync, writeFileSync } from 'node:fs';
let patched = 0;
for (const file of [
  'node_modules/next/dist/client/react-client-callbacks/on-recoverable-error.js',
  'node_modules/next/dist/esm/client/react-client-callbacks/on-recoverable-error.js',
]) {
  const original = readFileSync(file, 'utf8');
  const modified = original.replace(/(const onRecoverableError\s*=\s*)\(error\)\s*=>\s*\{/, '$1(error, info) => { console.error("YOMI_HYDRATION_COMPONENT", info && info.componentStack);');
  if (modified !== original) { writeFileSync(file, modified); patched += 1; }
}
if (!patched) throw new Error('Next hydration callback was not instrumented');
console.log('Instrumented '+patched+' hydration callbacks for CI diagnostics only');
