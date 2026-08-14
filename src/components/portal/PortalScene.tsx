/**
 * ESCENA DEL PORTAL — la portada.
 *
 * Una fachada estilizada dibujada en SVG (ligera, sin imágenes, sin 3D) y, debajo, la
 * planta baja con los elementos que SON el menú:
 *
 *   puerta → jugar · telefonillo → salas (Fase 3) · tablón → cómo jugar
 *   ascensor → perfil y progreso · buzones → logros
 *
 * La fachada es decorativa (`aria-hidden`): todo lo interactivo es HTML real, enfocable
 * y con texto. En una tele 16:9 la escena se estira; en un móvil pequeño se apila.
 */

type Ventana = { x: number; y: number; encendida: boolean };

function ventanas(): Ventana[] {
  const filas = [26, 62, 98];
  const columnas = [18, 52, 86, 120, 154];
  const encendidas = new Set(['26-52', '26-120', '62-18', '62-86', '98-154', '98-52']);
  const lista: Ventana[] = [];
  for (const y of filas) {
    for (const x of columnas) {
      lista.push({ x, y, encendida: encendidas.has(`${y}-${x}`) });
    }
  }
  return lista;
}

export function PortalFacade({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 150"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      role="presentation"
    >
      {/* Cielo de tarde */}
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfd8dc" />
          <stop offset="100%" stopColor="#e7e0d2" />
        </linearGradient>
        <linearGradient id="fachada" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#efe7d6" />
          <stop offset="100%" stopColor="#d9cdb6" />
        </linearGradient>
      </defs>

      <rect width="180" height="150" fill="url(#cielo)" />

      {/* Edificios vecinos, al fondo */}
      <rect x="0" y="42" width="26" height="108" fill="#c9bda8" />
      <rect x="156" y="34" width="24" height="116" fill="#c9bda8" />

      {/* Cuerpo del edificio */}
      <rect x="14" y="14" width="152" height="136" fill="url(#fachada)" stroke="#8a8174" strokeWidth="1" />

      {/* Cornisa */}
      <rect x="10" y="8" width="160" height="8" fill="#b7a98f" stroke="#8a8174" strokeWidth="0.8" />

      {/* Ventanas con balcón */}
      {ventanas().map((ventana) => (
        <g key={`${ventana.x}-${ventana.y}`}>
          <rect
            x={ventana.x}
            y={ventana.y}
            width="18"
            height="22"
            fill={ventana.encendida ? '#f2cd76' : '#3f4a52'}
            stroke="#6f6656"
            strokeWidth="1"
          />
          <path
            d={`M${ventana.x + 9} ${ventana.y}v22`}
            stroke="#6f6656"
            strokeWidth="0.7"
            opacity="0.7"
          />
          {/* Barandilla del balcón */}
          <rect
            x={ventana.x - 2}
            y={ventana.y + 20}
            width="22"
            height="4"
            fill="#9aa0a6"
            stroke="#6f6656"
            strokeWidth="0.6"
            opacity="0.85"
          />
        </g>
      ))}

      {/* Planta baja: hueco del portal */}
      <rect x="60" y="118" width="60" height="32" fill="#1e4b3e" stroke="#123329" strokeWidth="1" />
      <rect x="64" y="122" width="52" height="28" fill="#2d6353" />
      <circle cx="90" cy="134" r="2" fill="#e0a32b" />

      {/* Rótulo del número */}
      <rect x="82" y="108" width="16" height="9" fill="#f7f2e6" stroke="#23201b" strokeWidth="0.8" />
      <text
        x="90"
        y="115"
        textAnchor="middle"
        fontSize="7"
        fill="#23201b"
        fontFamily="var(--font-cartel)"
      >
        13
      </text>

      {/* Acera */}
      <rect x="0" y="146" width="180" height="4" fill="#b0a892" />
    </svg>
  );
}
