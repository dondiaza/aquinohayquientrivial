/**
 * CONTENIDO DERIVADO DE LA BIBLIA EDITORIAL.
 *
 * El pack cubre de sobra las familias de preguntar-y-responder, pero no trae material
 * para las cuatro familias que se juegan con las manos —memoria del portal, escena del
 * portal, la junta y el portero automático— ni suficientes infiltrados y cronologías.
 * Sin ellas el juego pierde precisamente lo que lo separa de un cuestionario.
 *
 * Todo lo que hay aquí sale de `src/content/serie.ts` (la biblia editorial: quién vive
 * dónde, quién se relaciona con quién y qué pasó en cada temporada), así que se puede
 * comprobar dato por dato contra esa tabla. Dos matices honestos:
 *
 *   · Los minijuegos de MEMORIA y de SECUENCIA no afirman nada: son ejercicios de
 *     memoria ambientados en el portal. Van con `NOTA_MINIJUEGO`.
 *   · LA JUNTA es rol: no hay una respuesta «verdadera», hay decisiones mejores y peores.
 *     También va con `NOTA_MINIJUEGO`, y las consecuencias son de cosecha propia.
 *
 * Los ids llevan prefijo `D` (derivada) para no chocar nunca con los `Q` del pack.
 */

import { NOTA_MINIJUEGO, falta, imp, junta, mem, ord, timbres, who } from '@/content/builders';
import { PERSONAJES, TEMPORADAS, ZONAS, personajesDeZona } from '@/content/serie';
import type { QuestionRecord } from '@/domain/questions/schemas';
import { createRng, shuffle } from '@/domain/rng';

/** Cuatro nombres del mismo sitio y uno de fuera: el infiltrado más limpio que hay. */
function infiltradosPorZona(): QuestionRecord[] {
  const registros: QuestionRecord[] = [];

  ZONAS.forEach((zona, indice) => {
    const propios = personajesDeZona(zona.etiqueta);
    if (propios.length < 3) return;

    const ajenos = PERSONAJES.filter((personaje) => personaje.zona !== zona.etiqueta);
    const rng = createRng(`infiltrado-zona:${zona.id}`);
    const intruso = shuffle(ajenos, rng)[0];
    if (!intruso) return;

    const trio = propios.slice(0, 3).map((personaje) => personaje.corto);
    const cuatro = shuffle([...trio, intruso.corto], rng) as [string, string, string, string];
    const posicion = cuatro.indexOf(intruso.corto) as 0 | 1 | 2 | 3;

    registros.push(
      imp({
        id: `D-INF-${zona.id}`,
        prompt: `Tres de estos vecinos se asocian con ${zona.etiqueta}. ¿Quién es el infiltrado?`,
        explanation: `${intruso.corto} se asocia con ${intruso.zona}, no con ${zona.etiqueta}.`,
        difficulty: 4 + (indice % 3),
        category: 'lugares',
        characters: [...propios.slice(0, 3).map((personaje) => personaje.nombre), intruso.nombre],
        tags: ['tipo:intruso', `lugar:${zona.id}`],
        setLabel: `Vecinos de ${zona.etiqueta}`,
        items: cuatro,
        impostor: posicion,
        variant: 'intruso',
      }),
    );
  });

  return registros;
}

/** Vínculos reales de un personaje frente a uno que no lo es. */
function infiltradosPorRelacion(): QuestionRecord[] {
  const registros: QuestionRecord[] = [];

  PERSONAJES.forEach((personaje) => {
    const vinculos = personaje.relaciones
      .map((corto) => PERSONAJES.find((candidato) => candidato.corto === corto)?.corto ?? corto)
      .slice(0, 3);
    if (vinculos.length < 3) return;

    const ajenos = PERSONAJES.filter(
      (candidato) =>
        candidato.corto !== personaje.corto && !(personaje.relaciones as readonly string[]).includes(candidato.corto),
    );
    const rng = createRng(`infiltrado-rel:${personaje.corto}`);
    const intruso = shuffle(ajenos, rng)[0];
    if (!intruso) return;

    const cuatro = shuffle([...vinculos, intruso.corto], rng) as [string, string, string, string];
    const posicion = cuatro.indexOf(intruso.corto) as 0 | 1 | 2 | 3;

    registros.push(
      imp({
        id: `D-REL-${personaje.corto.replace(/\s+/g, '-').toLowerCase()}`,
        prompt: `Tres de estos nombres son vínculos clave de ${personaje.corto}. ¿Cuál no lo es?`,
        explanation: `Los vínculos clave de ${personaje.corto} son ${vinculos.join(', ')}. ${intruso.corto} no está entre ellos.`,
        difficulty: 5,
        category: 'relaciones',
        characters: [personaje.nombre, intruso.nombre],
        tags: ['tipo:intruso', 'tema:relaciones'],
        setLabel: `Vínculos de ${personaje.corto}`,
        items: cuatro,
        impostor: posicion,
        variant: 'intruso',
      }),
    );
  });

  return registros;
}

/**
 * ¿QUIÉN ES? sobre el reparto. Las pistas van de lo vago a lo evidente —un rasgo, la
 * zona, el papel y por último el intérprete—, que es justo lo que premia la mecánica:
 * responder antes de que caiga la última.
 *
 * La dificultad sale del orden de la biblia, que va de los personajes más centrales a los
 * más secundarios: acertar a Juan Cuesta por un rasgo no es lo mismo que acertar a Paco.
 */
function quienEsDeLaBiblia(): QuestionRecord[] {
  return PERSONAJES.map((personaje, indice) => {
    const rng = createRng(`quien-es:${personaje.corto}`);
    const otros = shuffle(
      PERSONAJES.filter((candidato) => candidato.corto !== personaje.corto),
      rng,
    ).slice(0, 3);

    const opciones = shuffle(
      [personaje, ...otros].map((candidato) => candidato.nombre),
      rng,
    );

    const pistas = [
      `Uno de sus rasgos es «${personaje.rasgos[0] ?? 'de armas tomar'}»`,
      `Se asocia con ${personaje.zona}`,
      personaje.rol,
      `Lo interpreta ${personaje.interprete}`,
    ];

    return who({
      id: `D-QUIEN-${personaje.corto.replace(/\s+/g, '-').toLowerCase()}`,
      prompt: '¿Qué vecino de Desengaño 21 es?',
      explanation: `${personaje.nombre}: ${personaje.rol}, en ${personaje.zona}, interpretado por ${personaje.interprete}.`,
      difficulty: Math.min(10, 3 + Math.floor(indice / 4)),
      category: 'personajes',
      characters: [personaje.nombre],
      tags: ['tipo:pistas', 'tema:reparto'],
      clues: pistas,
      options: opciones,
      correct: opciones.indexOf(personaje.nombre),
      clueIntervalSeconds: 5,
      variant: 'pistas_progresivas',
    });
  });
}

/** Cronología: hitos de temporadas distintas, que es lo único que se puede ordenar sin dudas. */
function cronologias(): QuestionRecord[] {
  const registros: QuestionRecord[] = [];
  const combinaciones: readonly (readonly number[])[] = [
    [1, 2, 3],
    [3, 4, 5],
    [1, 3, 5],
    [2, 3, 4],
    [1, 2, 4, 5],
    [1, 2, 3, 4, 5],
  ];

  combinaciones.forEach((temporadas, indice) => {
    const rng = createRng(`cronologia:${indice}`);
    const pasos = temporadas.map((numero) => {
      const temporada = TEMPORADAS.find((candidata) => candidata.numero === numero);
      const hitos = temporada?.hitos ?? [];
      const elegido = shuffle(hitos, rng)[0] ?? '';
      return `${elegido.charAt(0).toUpperCase()}${elegido.slice(1)}`;
    });

    const conSpoiler = temporadas.includes(5);

    registros.push(
      ord({
        id: `D-CRON-${indice + 1}`,
        prompt: 'Coloca estos hitos de Desengaño 21 del primero al último.',
        explanation: temporadas
          .map((numero) => `${pasos[temporadas.indexOf(numero)]} → temporada ${numero}`)
          .join(' · '),
        difficulty: 5 + indice,
        category: 'temporadas',
        tags: ['tipo:ordenar', 'tema:cronologia'],
        steps: pasos,
        firstLabel: 'Antes',
        lastLabel: 'Después',
        variant: 'ordenar',
        spoiler: conSpoiler ? 'major' : 'light',
      }),
    );
  });

  return registros;
}

/** Memoria: se enseñan vecinos de dos plantas y se pregunta por uno que no estaba. */
function memoriasDelPortal(): QuestionRecord[] {
  const registros: QuestionRecord[] = [];
  const parejas: readonly (readonly [string, string])[] = [
    ['1.º A', '1.º B'],
    ['2.º A', '2.º B'],
    ['3.º A', '3.º B'],
    ['Portería', '2.º A'],
    ['Videoclub', '3.º B'],
    ['1.º A', '3.º A'],
  ];

  parejas.forEach(([primera, segunda], indice) => {
    const vecinos = [...personajesDeZona(primera), ...personajesDeZona(segunda)];
    if (vecinos.length < 4) return;

    const rng = createRng(`memoria:${indice}`);
    const mostrados = shuffle(vecinos, rng).slice(0, Math.min(6, vecinos.length));
    const fuera = PERSONAJES.filter(
      (personaje) => !mostrados.some((mostrado) => mostrado.corto === personaje.corto),
    );
    const ausente = shuffle(fuera, rng)[0];
    if (!ausente) return;

    const presentes = shuffle(mostrados, rng).slice(0, 3).map((personaje) => personaje.corto);
    const opciones = shuffle([ausente.corto, ...presentes], rng) as [string, string, string, string];
    const posicion = opciones.indexOf(ausente.corto) as 0 | 1 | 2 | 3;

    registros.push(
      mem({
        id: `D-MEM-${indice + 1}`,
        prompt: `Rellano de ${primera} y ${segunda}: fíjate en quién está.`,
        explanation: `${ausente.corto} no estaba en la lista: se asocia con ${ausente.zona}.`,
        difficulty: 4 + (indice % 3),
        category: 'situaciones',
        tags: ['tipo:memoria', 'tema:portal'],
        items: mostrados.map((personaje) => personaje.corto),
        question: '¿Cuál de estos vecinos NO estaba en la lista?',
        options: opciones,
        correct: posicion,
        studySeconds: 6,
        variant: 'memoria_portal',
        sourceNote: NOTA_MINIJUEGO,
      }),
    );
  });

  return registros;
}

/** Escena: los vecinos que sí se asocian a una zona y uno que no. */
function escenasDelPortal(): QuestionRecord[] {
  const registros: QuestionRecord[] = [];

  ZONAS.forEach((zona, indice) => {
    const propios = personajesDeZona(zona.etiqueta);
    if (propios.length < 3) return;

    const rng = createRng(`escena:${zona.id}`);
    const ajenos = PERSONAJES.filter((personaje) => personaje.zona !== zona.etiqueta);
    const ausente = shuffle(ajenos, rng)[0];
    if (!ausente) return;

    const presentes = propios.slice(0, Math.min(4, propios.length)).map((personaje) => personaje.corto);
    const senuelos = shuffle(presentes, rng).slice(0, 3);
    const opciones = shuffle([ausente.corto, ...senuelos], rng) as [string, string, string, string];
    const posicion = opciones.indexOf(ausente.corto) as 0 | 1 | 2 | 3;

    registros.push(
      falta({
        id: `D-ESC-${zona.id}`,
        prompt: `Escena en ${zona.etiqueta}. ¿Quién NO aparece por aquí?`,
        explanation: `${ausente.corto} se asocia con ${ausente.zona}. En ${zona.etiqueta} están ${presentes.join(', ')}.`,
        difficulty: 3 + (indice % 4),
        category: 'lugares',
        tags: ['tipo:escena', `lugar:${zona.id}`],
        sceneLabel: `${zona.etiqueta} — ${zona.idea}`,
        present: presentes,
        options: opciones,
        correct: posicion,
        variant: 'escena_portal',
      }),
    );
  });

  return registros;
}

/**
 * LA JUNTA. Situaciones de la comunidad escritas para este juego: el material de partida
 * es el de la serie (la presidencia de Juan, la portería de Emilio, Radio Patio, PUF, el
 * videoclub, las termitas), pero las decisiones y sus consecuencias son de cosecha propia.
 */
function juntas(): QuestionRecord[] {
  const situaciones: readonly {
    id: string;
    situacion: string;
    prompt: string;
    dificultad: number;
    spoiler?: 'none' | 'light' | 'major';
    decisiones: readonly { texto: string; peso: number; consecuencia: string }[];
  }[] = [
    {
      id: 'derrama',
      prompt: 'Hay que aprobar una derrama y nadie quiere pagarla.',
      situacion:
        'El presupuesto de la reparación no llega. La mitad del portal dice que ya pagó lo suyo el año pasado y la otra mitad no aparece por las juntas.',
      dificultad: 5,
      decisiones: [
        {
          texto: 'Repartirla por coeficiente y ponerlo por escrito en el acta',
          peso: 1,
          consecuencia: 'Protestan igual, pero el acta aguanta cualquier reclamación.',
        },
        {
          texto: 'Dividirla a partes iguales para acabar antes',
          peso: 0.4,
          consecuencia: 'Los bajos se plantan: el reparto no se sostiene.',
        },
        {
          texto: 'Dejarla para la próxima junta',
          peso: 0.2,
          consecuencia: 'La obra sigue parada y la derrama sale más cara.',
        },
        {
          texto: 'Pagarla de la reserva sin decir nada',
          peso: 0,
          consecuencia: 'La comunidad se queda sin fondo y alguien lo va a contar.',
        },
      ],
    },
    {
      id: 'porteria',
      prompt: 'El portero lleva tres días con el cuarto de contadores abierto.',
      situacion:
        'Alguien ha visto la puerta del cuarto de contadores abierta otra vez. El portero jura que fue el técnico. El técnico no ha venido.',
      dificultad: 4,
      decisiones: [
        {
          texto: 'Pedir el parte del técnico y una llave con registro de entradas',
          peso: 1,
          consecuencia: 'Se acaba el misterio y nadie queda señalado sin pruebas.',
        },
        {
          texto: 'Cambiar la cerradura y quedarse la única llave',
          peso: 0.5,
          consecuencia: 'Se arregla el acceso pero el portero no puede hacer su trabajo.',
        },
        {
          texto: 'Sacarlo en la próxima junta como punto del orden del día',
          peso: 0.4,
          consecuencia: 'Se convierte en un juicio público de dos horas.',
        },
        {
          texto: 'Dejarlo pasar, que ya se cansarán',
          peso: 0,
          consecuencia: 'A la semana falta un contador entero.',
        },
      ],
    },
    {
      id: 'radio-patio',
      prompt: 'Radio Patio ha difundido algo que no es verdad.',
      situacion:
        'En el primero se ha decidido que una vecina se muda. La vecina no lo sabe. Ya lo sabe todo el portal.',
      dificultad: 4,
      decisiones: [
        {
          texto: 'Hablar primero con la vecina y desmentirlo en el tablón',
          peso: 1,
          consecuencia: 'El bulo se apaga en un día y nadie pierde la cara.',
        },
        {
          texto: 'Desmentirlo en el grupo de la comunidad',
          peso: 0.6,
          consecuencia: 'Se desmiente, pero con doscientos mensajes de propina.',
        },
        {
          texto: 'Ignorarlo: los bulos se caen solos',
          peso: 0.3,
          consecuencia: 'Al tercer día el bulo ya tiene fecha de mudanza y camión.',
        },
        {
          texto: 'Preguntar en el primero de dónde ha salido',
          peso: 0.1,
          consecuencia: 'Lo niegan las tres y ahora el bulo eres tú.',
        },
      ],
    },
    {
      id: 'obras',
      prompt: 'Las obras del segundo empiezan a las siete de la mañana.',
      situacion:
        'Reforma integral, dos meses de plazo, martillo a las siete. Hay tres firmas pidiendo que se pare y una comunidad que necesita el ascensor arreglado.',
      dificultad: 5,
      decisiones: [
        {
          texto: 'Acordar horario por escrito: de nueve a seis y sábados no',
          peso: 1,
          consecuencia: 'Nadie sale contento y todo el mundo puede dormir.',
        },
        {
          texto: 'Denunciar el ruido directamente',
          peso: 0.3,
          consecuencia: 'La obra se para un mes y el ascensor sigue igual.',
        },
        {
          texto: 'Dejarlo estar: son solo dos meses',
          peso: 0.2,
          consecuencia: 'Los dos meses se convierten en catorce.',
        },
        {
          texto: 'Empezar tú otra obra para compensar',
          peso: 0,
          consecuencia: 'Ahora hay dos martillos y ninguna junta que valga.',
        },
      ],
    },
    {
      id: 'videoclub',
      prompt: 'El local de abajo quiere poner terraza en el portal.',
      situacion:
        'El negocio del bajo pide dos mesas en la entrada. Trae clientela, ocupa el paso y el portal no es suyo.',
      dificultad: 4,
      decisiones: [
        {
          texto: 'Autorizar una mesa con paso libre y revisión a los tres meses',
          peso: 1,
          consecuencia: 'Se prueba, se mide y se puede deshacer sin bronca.',
        },
        {
          texto: 'Autorizar las dos y cobrar por el uso',
          peso: 0.5,
          consecuencia: 'Entra dinero y ya no cabe un carrito de la compra.',
        },
        {
          texto: 'Negarse en redondo',
          peso: 0.4,
          consecuencia: 'El local sobrevive, pero pierdes al único aliado del bajo.',
        },
        {
          texto: 'No contestar y ver qué pasa',
          peso: 0,
          consecuencia: 'A la semana hay cuatro mesas y una sombrilla.',
        },
      ],
    },
    {
      id: 'termitas',
      prompt: 'El informe técnico habla de termitas en la estructura.',
      situacion:
        'El técnico dice que la madera del forjado está comida. Arreglarlo cuesta más que el edificio. Nadie quiere leer el informe entero.',
      dificultad: 6,
      spoiler: 'major',
      decisiones: [
        {
          texto: 'Segunda opinión técnica y junta extraordinaria con el informe encima de la mesa',
          peso: 1,
          consecuencia: 'Duele, pero se decide sabiendo lo que hay.',
        },
        {
          texto: 'Empezar el tratamiento por plantas, según el dinero',
          peso: 0.5,
          consecuencia: 'Las termitas no entienden de plazos de pago.',
        },
        {
          texto: 'Pedir un crédito comunitario y arreglarlo todo ya',
          peso: 0.4,
          consecuencia: 'Rápido y carísimo, y sin saber si hacía falta tanto.',
        },
        {
          texto: 'Guardar el informe en el cajón',
          peso: 0,
          consecuencia: 'El cajón también es de madera.',
        },
      ],
    },
    {
      id: 'presidencia',
      prompt: 'Nadie quiere ser presidente de la comunidad este año.',
      situacion:
        'Toca renovar. El presidente saliente lleva tres mandatos, hay dos vecinos que se niegan y una lista que nadie ha mirado.',
      dificultad: 4,
      decisiones: [
        {
          texto: 'Turno rotatorio por puerta, con la lista a la vista de todos',
          peso: 1,
          consecuencia: 'Refunfuñan, pero el orden no se discute.',
        },
        {
          texto: 'Que repita el saliente un año más',
          peso: 0.5,
          consecuencia: 'Cómodo hoy, y dentro de un año el mismo problema más grande.',
        },
        {
          texto: 'Contratar un administrador y quitarse el marrón',
          peso: 0.6,
          consecuencia: 'Funciona y cuesta: la cuota sube para todos.',
        },
        {
          texto: 'Sorteo a mano alzada',
          peso: 0.2,
          consecuencia: 'Sale el que no estaba en la junta. Vuelta a empezar.',
        },
      ],
    },
    {
      id: 'puf',
      prompt: 'Una vecina ha montado su negocio de moda en el rellano.',
      situacion:
        'Cajas hasta el techo, dos maniquíes y un desfile el sábado. Dice que es temporal y que la comunidad debería apoyar el talento local.',
      dificultad: 4,
      decisiones: [
        {
          texto: 'Plazo de una semana para vaciar el rellano y ofrecerle el trastero',
          peso: 1,
          consecuencia: 'Sale el género del paso y la vecina no queda como enemiga.',
        },
        {
          texto: 'Dejar el rellano como está hasta el desfile',
          peso: 0.4,
          consecuencia: 'El desfile se repite. Y el siguiente. Y el otro.',
        },
        {
          texto: 'Retirar las cajas tú mismo',
          peso: 0.1,
          consecuencia: 'Junta extraordinaria, esta vez sobre ti.',
        },
        {
          texto: 'Pedirle un porcentaje para la comunidad',
          peso: 0.2,
          consecuencia: 'Ahora la comunidad es socia de un negocio en un rellano.',
        },
      ],
    },
  ];

  return situaciones.map((entrada) =>
    junta({
      id: `D-JUNTA-${entrada.id}`,
      prompt: entrada.prompt,
      explanation:
        'No hay respuesta absurda: hay decisiones que dejan acta y decisiones que dejan bronca.',
      difficulty: entrada.dificultad,
      category: 'situaciones',
      tags: ['tipo:junta', 'tema:comunidad'],
      situation: entrada.situacion,
      decisiones: entrada.decisiones,
      variant: 'junta_vecinos',
      sourceNote: NOTA_MINIJUEGO,
      ...(entrada.spoiler ? { spoiler: entrada.spoiler } : {}),
    }),
  );
}

/** Portero automático: memoria pura sobre los timbres reales del edificio. */
function porteroAutomatico(): QuestionRecord[] {
  const pads = ['1.º A', '1.º B', '2.º A', '2.º B', '3.º A', '3.º B'];
  const largos = [3, 3, 4, 4, 5, 5, 6, 6];

  return largos.map((largo, indice) => {
    const rng = createRng(`timbres:${indice}`);
    const secuencia = Array.from({ length: largo }, () => rng.int(0, pads.length - 1));

    return timbres({
      id: `D-TIMBRE-${indice + 1}`,
      prompt: 'Alguien ha llamado a estos timbres. Repite el orden exacto.',
      explanation: `La secuencia era ${secuencia.map((posicion) => pads[posicion]).join(' → ')}.`,
      difficulty: Math.min(10, 3 + indice),
      category: 'situaciones',
      tags: ['tipo:secuencia', 'tema:portal'],
      pads,
      secuencia,
      stepMs: Math.max(340, 700 - indice * 45),
      variant: 'telefonillo',
      sourceNote: NOTA_MINIJUEGO,
    });
  });
}

/** Todo el contenido derivado de la biblia, en un solo sitio. */
export function preguntasDerivadas(): QuestionRecord[] {
  return [
    ...infiltradosPorZona(),
    ...infiltradosPorRelacion(),
    ...quienEsDeLaBiblia(),
    ...cronologias(),
    ...memoriasDelPortal(),
    ...escenasDelPortal(),
    ...juntas(),
    ...porteroAutomatico(),
  ];
}
