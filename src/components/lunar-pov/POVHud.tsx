import { ExplorationPoint, Destination } from '../../types';

interface POVHudProps {
  destination?: Destination;
  onExit: () => void;
  currentSol: number;
  oxygenLevel: number;
  waterLevel: number;
  batteryCharge: number;
  selectedPoint: ExplorationPoint | null;
  onDismissPoint: () => void;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
}

function ResourceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#94a3b8',
          width: '28px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: '5px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.5s ease',
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#cbd5e1',
          width: '32px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function POVHud({
  destination = 'moon',
  onExit,
  currentSol,
  oxygenLevel,
  waterLevel,
  batteryCharge,
  selectedPoint,
  onDismissPoint,
  isPointerLocked,
  onRequestPointerLock,
}: POVHudProps) {
  const isMars = destination === 'mars';

  // Destination-aware colour tokens
  const accent      = isMars ? '#fb923c' : '#22d3ee';
  const accentGlow  = isMars ? 'rgba(251,146,60,0.3)' : 'rgba(34,211,238,0.3)';
  const accentBg    = isMars ? 'rgba(251,146,60,0.15)' : 'rgba(34,211,238,0.15)';
  const accentDim   = isMars ? '#fed7aa' : '#67e8f9';
  const locationLabel = isMars ? 'MARS SURFACE' : 'LUNAR SURFACE';
  const exitLabel     = isMars ? '← EXIT MARS POV' : '← EXIT LUNAR POV';
  const enterEmoji    = isMars ? '🔴' : '🌕';
  const enterTitle    = isMars ? 'CLICK TO ENTER MARS POV' : 'CLICK TO ENTER LUNAR POV';
  const o2Color       = isMars ? '#fb923c' : '#22d3ee';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* ── TOP-LEFT: Exit strip ── */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          onClick={onExit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(2,6,23,0.88)',
            border: `1.5px solid ${accent}`,
            borderRadius: '999px',
            padding: '7px 16px',
            color: accent,
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            boxShadow: `0 0 12px ${accentGlow}`,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = accentBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(2,6,23,0.88)';
          }}
        >
          {exitLabel}
        </button>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: accentDim,
            paddingLeft: '8px',
            letterSpacing: '0.1em',
          }}
        >
          SOL {currentSol} / 30 · {locationLabel}
        </div>
      </div>

      {/* ── CENTER: Crosshair (only when locked) ── */}
      {isPointerLocked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1.5px',
              background: 'rgba(255,255,255,0.75)',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '1.5px',
              background: 'rgba(255,255,255,0.75)',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}

      {/* ── BOTTOM-LEFT: Controls guide (only when locked) ── */}
      {isPointerLocked && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            background: 'rgba(2,6,23,0.80)',
            border: '1px solid rgba(100,116,139,0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {[
            ['W/A/S/D', 'Move'],
            ['MOUSE', 'Look Around'],
            ['SHIFT', 'Sprint'],
            ['ESC', 'Exit POV'],
          ].map(([key, desc]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '3px',
                fontFamily: 'monospace',
                fontSize: '10px',
              }}
            >
              <span
                style={{
                  color: accent,
                  minWidth: '54px',
                  fontWeight: 'bold',
                }}
              >
                {key}
              </span>
              <span style={{ color: '#94a3b8' }}>{desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM-RIGHT: Resource mini bars ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '16px',
          background: 'rgba(2,6,23,0.85)',
          border: '1px solid rgba(100,116,139,0.4)',
          borderRadius: '10px',
          padding: '10px 14px',
          backdropFilter: 'blur(8px)',
          minWidth: '160px',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#475569',
            letterSpacing: '0.12em',
            marginBottom: '7px',
            textTransform: 'uppercase',
          }}
        >
          Life Support
        </div>
        <ResourceBar label="O₂"  value={oxygenLevel}   color={o2Color} />
        <ResourceBar label="H₂O" value={waterLevel}    color="#3b82f6" />
        <ResourceBar label="PWR" value={batteryCharge}  color="#facc15" />
      </div>

      {/* ── CLICK-TO-LOCK prompt (shown when not locked) ── */}
      {!isPointerLocked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            textAlign: 'center',
          }}
        >
          <button
            onClick={onRequestPointerLock}
            style={{
              background: 'rgba(2,6,23,0.90)',
              border: `1.5px solid ${accent}`,
              borderRadius: '16px',
              padding: '24px 36px',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 0 40px ${accentGlow}, 0 0 80px ${accentGlow}`,
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                marginBottom: '10px',
              }}
            >
              {enterEmoji}
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 'bold',
                color: accent,
                letterSpacing: '0.12em',
                marginBottom: '6px',
              }}
            >
              {enterTitle}
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#64748b',
                letterSpacing: '0.08em',
              }}
            >
              Mouse-look + WASD movement
            </div>
          </button>
        </div>
      )}

      {/* ── EXPLORATION POINT INFO CARD (slide up from bottom) ── */}
      {selectedPoint && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px 16px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              background: 'rgba(2,6,23,0.95)',
              border: `1.5px solid ${accent}`,
              borderRadius: '16px',
              padding: '20px 24px',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 -4px 60px ${accentGlow}`,
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={onDismissPoint}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(100,116,139,0.5)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                color: '#94a3b8',
                fontFamily: 'monospace',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {/* Title */}
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: '14px',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '0.06em',
                marginBottom: '2px',
                paddingRight: '36px',
              }}
            >
              {selectedPoint.title}
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: accent,
                letterSpacing: '0.08em',
                marginBottom: '12px',
              }}
            >
              {selectedPoint.subtitle}
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: 'sans-serif',
                fontSize: '12px',
                color: '#cbd5e1',
                lineHeight: 1.6,
                marginBottom: '10px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {selectedPoint.description}
            </div>

            {/* Interactive fact */}
            <div
              style={{
                background: 'rgba(234,179,8,0.08)',
                border: '1px solid rgba(234,179,8,0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontFamily: 'sans-serif',
                fontSize: '11px',
                color: '#fde68a',
                lineHeight: 1.5,
                marginBottom: '10px',
              }}
            >
              💡 {selectedPoint.interactiveFact}
            </div>

            {/* NASA Connection */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#818cf8' }}>🚀 NASA: </span>
              {selectedPoint.nasaConnection}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
