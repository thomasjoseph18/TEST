// WebGL capability detection. The canvas factory is injected so this is testable in Node.
export interface WebGLSupport {
  supported: boolean;
  version: 0 | 1 | 2;
  reason?: 'no_context' | 'exception' | 'major_performance_caveat';
}

interface CanvasLike {
  getContext(id: string, attrs?: Record<string, unknown>): unknown;
}

export function detectWebGL(makeCanvas: () => CanvasLike): WebGLSupport {
  try {
    const c2 = makeCanvas();
    if (c2.getContext('webgl2', { failIfMajorPerformanceCaveat: true })) return { supported: true, version: 2 };
    const c1 = makeCanvas();
    if (c1.getContext('webgl', { failIfMajorPerformanceCaveat: true })) return { supported: true, version: 1 };
    // A software renderer exists but would be unusably slow for a first-person game.
    const soft = makeCanvas();
    if (soft.getContext('webgl') || makeCanvas().getContext('experimental-webgl')) {
      return { supported: false, version: 0, reason: 'major_performance_caveat' };
    }
    return { supported: false, version: 0, reason: 'no_context' };
  } catch {
    return { supported: false, version: 0, reason: 'exception' };
  }
}
