import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const stub = new URL('./react-stub.ts', import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === 'react') return { url: stub, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
    const url = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
  }
  return next(specifier, context);
}
