import Link from 'next/link';

/**
 * LA FACHADA, PERO SE PUEDE TOCAR.
 *
 * La portada abría con una foto de 26 rem que no hacía nada, y justo debajo estaba el portal
 * interactivo —«cada cosa del portal hace algo»—, que había que bajar para descubrir. La
 * promesa estaba escrita en la página y no se cumplía en lo primero que se ve.
 *
 * Ahora las zonas del edificio son entradas al juego: el telefonillo abre las salas, los
 * buzones llevan a los logros, la placa a la clasificación y la puerta a jugar.
 *
 * ## Cómo está hecho, y por qué así
 *
 * Las zonas van en porcentajes sobre la imagen, no en píxeles: la foto se sirve a anchos
 * distintos según la pantalla y unas coordenadas fijas se descolocarían en cuanto cambiara el
 * recorte.
 *
 * Son enlaces de verdad, no un mapa de imagen ni divs con onclick. Se tabulan, se abren en
 * pestaña nueva con el botón central, funcionan sin JavaScript y un lector de pantalla los
 * lee como lo que son: cuatro enlaces con su nombre. Un `<map>` habría sido más corto y peor.
 *
 * En pantallas pequeñas las zonas se ocultan y quedan los accesos de siempre debajo: cuatro
 * puntos calientes sobre una foto de 200 px de alto no se aciertan con el dedo.
 */

type Zona = {
  href: string;
  titulo: string;
  descripcion: string;
  icono: string;
  /** Porcentajes sobre la imagen: izquierda, arriba, ancho, alto. */
  caja: [number, number, number, number];
};

const ZONAS_CALIENTES: Zona[] = [
  {
    href: '/unirse',
    titulo: 'El telefonillo',
    descripcion: 'Abrir una sala y que entren desde su móvil',
    icono: '📞',
    caja: [6, 46, 13, 26],
  },
  {
    href: '/jugar/solo',
    titulo: 'La puerta',
    descripcion: 'Entrar y jugar una partida',
    icono: '🚪',
    caja: [21, 44, 16, 34],
  },
  {
    href: '/perfil#logros',
    titulo: 'Los buzones',
    descripcion: 'Tus logros',
    icono: '📬',
    caja: [40, 52, 14, 20],
  },
  {
    href: '/ranking',
    titulo: 'La placa',
    descripcion: 'Quién manda en la comunidad',
    icono: '🏅',
    caja: [58, 40, 15, 16],
  },
];

export function FachadaViva({
  src,
  alt,
  credito,
  origen,
}: {
  src: string;
  alt: string;
  credito?: string | null;
  origen?: string | null;
}) {
  return (
    <figure className="relative m-0">
      <img
        src={src}
        alt={alt}
        width={1600}
        height={700}
        className="max-h-[26rem] w-full object-cover"
        fetchPriority="high"
      />

      {/* Las zonas solo en pantallas donde se puedan acertar con el dedo. */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {ZONAS_CALIENTES.map((zona) => (
          <Link
            key={zona.href}
            href={zona.href}
            className="group pointer-events-auto absolute flex flex-col items-center justify-end rounded border-2 border-transparent p-1 transition hover:border-mostaza hover:bg-tinta/25 focus-visible:border-mostaza focus-visible:bg-tinta/25 focus-visible:outline-none"
            style={{
              left: `${zona.caja[0]}%`,
              top: `${zona.caja[1]}%`,
              width: `${zona.caja[2]}%`,
              height: `${zona.caja[3]}%`,
            }}
          >
            <span
              aria-hidden
              className="mb-1 text-xl opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {zona.icono}
            </span>
            <span className="texto-sello rounded bg-tinta/85 px-1.5 py-0.5 text-center text-[0.6rem] leading-tight text-papel opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {zona.titulo}
              <span className="block text-[0.55rem] font-normal opacity-80">
                {zona.descripcion}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* Pista de que la fachada se puede tocar. Sin esto nadie lo descubre. */}
      <p className="texto-sello absolute left-2 top-2 hidden rounded bg-tinta/70 px-2 py-1 text-[0.6rem] text-papel sm:block">
        Toca el edificio
      </p>

      {credito ? (
        <figcaption className="absolute bottom-0 right-0 bg-tinta/70 px-2 py-0.5 text-[0.55rem] text-papel">
          {origen ? (
            <a href={origen} target="_blank" rel="noreferrer noopener" className="underline">
              {credito}
            </a>
          ) : (
            credito
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
