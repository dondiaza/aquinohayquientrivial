import { LinkButton } from '@/components/ui/Button';
import { ApartmentPlaque, DoorCard, PaperNotice } from '@/components/portal/Estructuras';

/** 404 — «puerta equivocada»: primero se explica qué ha pasado, después el chiste. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <ApartmentPlaque
        vivienda="Error 404"
        titulo="Puerta equivocada"
        subtitulo="Esta página no existe"
        tono="roja"
      />

      <PaperNotice tono="papel" giro="izq" sujecion="cinta" className="mt-4 p-4">
        <p className="text-sm text-tinta-suave">
          Has llamado a una puerta que no está en el portal. Puede que la partida se haya cerrado,
          que el enlace esté mal copiado o que esa sección todavía no exista.
        </p>
      </PaperNotice>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DoorCard numero="1" titulo="Volver al portal" descripcion="La portada" href="/" />
        <DoorCard
          numero="2"
          titulo="Jugar una partida"
          descripcion="Directo al setup"
          href="/jugar/solo"
          tono="granate"
        />
      </div>

      <p className="mt-5">
        <LinkButton href="/como-jugar" tone="fantasma" size="sm">
          Cómo jugar
        </LinkButton>
      </p>
    </div>
  );
}
