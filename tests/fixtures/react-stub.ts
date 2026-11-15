// Minimal hook runtime so the ORIGINAL React hook can run in Node for differential testing.
type Slot = { value?: unknown; deps?: unknown[]; memo?: unknown };
let slots: Slot[] = [];
let idx = 0;
let dirty = false;

export function useState<T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] {
  const i = idx++;
  if (!(i in slots)) slots[i] = { value: typeof init === 'function' ? (init as () => T)() : init };
  const slot = slots[i];
  return [
    slot.value as T,
    (v) => {
      slot.value = typeof v === 'function' ? (v as (p: T) => T)(slot.value as T) : v;
      dirty = true;
    },
  ];
}
const sameDeps = (a?: unknown[], b?: unknown[]) => !!a && !!b && a.length === b.length && a.every((x, k) => Object.is(x, b[k]));
export function useMemo<T>(fn: () => T, deps: unknown[]): T {
  const i = idx++;
  const s = slots[i] ?? (slots[i] = {});
  if (!sameDeps(s.deps, deps)) { s.memo = fn(); s.deps = deps; }
  return s.memo as T;
}
export function useRef<T>(init: T): { current: T } {
  const i = idx++;
  if (!(i in slots)) slots[i] = { value: { current: init } };
  return slots[i].value as { current: T };
}
export function useCallback<T>(fn: T, _deps: unknown[]): T { idx++; return fn; }
export function useEffect(_fn: () => void, _deps: unknown[]): void { idx++; /* initial-state reset is a no-op */ }

export function renderHook<R>(hook: () => R) {
  slots = []; idx = 0; dirty = false;
  let result!: R;
  const render = () => { idx = 0; result = hook(); };
  render();
  return {
    get current() { return result; },
    rerender() { render(); },
    /** run an action against the latest render, then re-render until stable */
    act(fn: (r: R) => void) {
      dirty = false;
      fn(result);
      for (let n = 0; dirty && n < 5; n++) { dirty = false; render(); }
    },
  };
}
