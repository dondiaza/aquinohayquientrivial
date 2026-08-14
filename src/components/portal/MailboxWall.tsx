'use client';

/**
 * PARED DE BUZONES — interactiva (el jugador decide qué buzones abre), así que vive en
 * el cliente. Se usa en el minijuego de pistas y, sin interacción, en la portada.
 */

export function MailboxWall({
  buzones,
  onAbrir,
  className = '',
}: {
  buzones: {
    id: string;
    numero: string;
    abierto: boolean;
    contenido?: string;
    deshabilitado?: boolean;
  }[];
  onAbrir?: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className}`}>
      {buzones.map((buzon) => (
        <div key={buzon.id}>
          {buzon.abierto ? (
            <div className="buzon buzon-abierto min-h-24 p-2">
              <p className="texto-sello text-[0.55rem] opacity-80">{buzon.numero}</p>
              <p className="mt-1 text-xs leading-snug">{buzon.contenido}</p>
            </div>
          ) : (
            <button
              type="button"
              className="buzon min-h-24 w-full p-2 text-left hover:-translate-y-0.5"
              onClick={() => onAbrir?.(buzon.id)}
              disabled={buzon.deshabilitado}
              aria-label={`Abrir el buzón ${buzon.numero}`}
            >
              <p className="texto-sello text-[0.55rem] opacity-80">{buzon.numero}</p>
              <p className="mt-6 text-center text-lg" aria-hidden>
                ✉
              </p>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
