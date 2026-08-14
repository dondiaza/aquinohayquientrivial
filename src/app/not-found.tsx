import { LinkButton } from '@/components/ui/Button';
import { Nota, Placa } from '@/components/ui/Surfaces';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Placa tone="roja" className="px-5 py-6 pt-8">
        <h1 className="text-3xl sm:text-4xl">Aquí no vive nadie</h1>
      </Placa>
      <Nota tone="papel" className="mt-4 p-4 text-left">
        <p className="text-sm text-tinta-suave">
          Has llamado a una puerta que no existe. Puede que la partida se haya cerrado o que el
          enlace esté mal copiado.
        </p>
      </Nota>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <LinkButton href="/" tone="verde">
          Volver al portal
        </LinkButton>
        <LinkButton href="/jugar/solo" tone="papel">
          Jugar una partida
        </LinkButton>
      </div>
    </div>
  );
}
