import { LinkButton } from '@/components/ui/Button';
import { Chip, Nota, Papel, Placa } from '@/components/ui/Surfaces';
import { PHASE3 } from '@/domain/copy/ui';
import { ENGINE_EVENT_TYPES } from '@/domain/engine/engine-events';

/**
 * Pantalla común de las rutas reservadas para Fase 3 (/unirse, /sala/[code],
 * /host/[code]). No son botones decorativos: explican qué harán y qué parte ya existe.
 */
export function Fase3Placeholder({
  titulo,
  descripcion,
  codigo,
}: {
  titulo: string;
  descripcion: string;
  codigo?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Placa tone="azul" className="px-5 py-5 pt-7">
        <h1 className="text-3xl sm:text-4xl">{titulo}</h1>
        {codigo ? <p className="texto-sello mt-2">Código: {codigo}</p> : null}
      </Placa>

      <Papel className="mt-4 p-5">
        <p className="texto-cartel text-lg">{PHASE3.title}</p>
        <p className="mt-2 text-sm text-tinta-suave">{descripcion}</p>
        <p className="mt-3 text-sm text-tinta-suave">{PHASE3.line}</p>

        <p className="texto-sello mt-4 text-tinta-tenue">Eventos del motor ya definidos</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {ENGINE_EVENT_TYPES.map((type) => (
            <Chip key={type}>{type}</Chip>
          ))}
        </div>
      </Papel>

      <Nota tone="azul" className="mt-4 p-3 text-xs">
        Estas rutas existen a propósito desde la Fase 1: así el enrutado, los enlaces y los
        contratos de eventos no cambian cuando llegue el multijugador.
      </Nota>

      <p className="mt-6">
        <LinkButton href="/jugar/solo" tone="rojo">
          {PHASE3.cta}
        </LinkButton>
      </p>
    </div>
  );
}
