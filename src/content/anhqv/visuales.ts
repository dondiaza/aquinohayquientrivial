/**
 * PREGUNTAS VISUALES — las que enseñan una cara.
 *
 * Estaban en el pliego desde el principio y no se pudieron hacer porque no había imágenes.
 * Ahora hay veintiséis caras y el motor ya sabe pintar `media`, así que no hace falta un
 * tipo de pregunta nuevo: basta con generar preguntas que la lleven.
 *
 * Tres familias, todas sacadas del catálogo y de lo que hay en disco:
 *
 *   · **¿Quién es?** — una cara, cuatro nombres.
 *   · **¿Dónde vive?** — una cara, cuatro viviendas del portal.
 *   · **¿Quién lo interpreta?** — una cara, cuatro intérpretes.
 *
 * ## Solo se generan si la cara existe DE VERDAD
 *
 * Una pregunta visual sin imagen es peor que no tenerla: sale un hueco y la pregunta deja de
 * tener sentido, porque lo que se pregunta es precisamente lo que se ve. Por eso se consulta
 * el disco y se descartan los personajes que caen al dibujo — el dibujo no identifica a
 * nadie, que es justamente su gracia en otros sitios y su problema aquí.
 *
 * SOLO PARA NODE (seed y tests): lee el disco.
 */

import { huecoDeVecino, imagenDe } from '../imagenes';
import { PERSONAJES, ZONAS } from '../serie';
import { mc } from '@/content/builders';
import type { QuestionRecord } from '@/domain/questions/schemas';

/** Generador determinista: el mismo banco en cada seed. */
function rng(semilla: string): () => number {
  let valor = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i += 1) {
    valor ^= semilla.charCodeAt(i);
    valor = Math.imul(valor, 0x01000193);
  }
  return () => {
    valor = (Math.imul(valor, 1103515245) + 12345) & 0x7fffffff;
    return valor / 0x7fffffff;
  };
}

function barajar<T>(lista: readonly T[], siguiente: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(siguiente() * (i + 1));
    const a = copia[i];
    const b = copia[j];
    if (a !== undefined && b !== undefined) {
      copia[i] = b;
      copia[j] = a;
    }
  }
  return copia;
}

/** Personajes que tienen una fotografía servible en disco. */
function conCara(): { personaje: (typeof PERSONAJES)[number]; src: string }[] {
  const salida: { personaje: (typeof PERSONAJES)[number]; src: string }[] = [];
  for (const personaje of PERSONAJES) {
    const src = imagenDe(huecoDeVecino(personaje.nombre));
    if (src) salida.push({ personaje, src });
  }
  return salida;
}

/**
 * Arma una de opción múltiple con imagen.
 *
 * La correcta va en la posición que le toca por turno, no al azar: el banco ya tuvo un sesgo
 * del 33 % en la opción A y no vamos a reintroducirlo por la puerta de atrás.
 */
function conImagen(entrada: {
  id: string;
  prompt: string;
  explanation: string;
  difficulty: number;
  category: 'personajes' | 'lugares' | 'reparto';
  characters: string[];
  tags: string[];
  src: string;
  alt: string;
  opciones: string[];
  correcta: string;
  turno: number;
}): QuestionRecord {
  const otras = entrada.opciones.filter((opcion) => opcion !== entrada.correcta);
  const destino = (entrada.turno % 4) as 0 | 1 | 2 | 3;
  const colocadas: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    colocadas.push(i === destino ? entrada.correcta : (otras.shift() ?? '—'));
  }

  return {
    ...mc({
      id: entrada.id,
      prompt: entrada.prompt,
      explanation: entrada.explanation,
      difficulty: entrada.difficulty,
      category: entrada.category,
      characters: entrada.characters,
      tags: [...entrada.tags, 'visual'],
      time: 18,
      variant: 'visual',
      options: colocadas as [string, string, string, string],
      correct: destino,
    }),
    // El motor ya sabía pintar `media`; lo que faltaba era generarla.
    media: { kind: 'image', placeholder: entrada.alt, src: entrada.src, alt: entrada.alt },
  };
}

/** ¿QUIÉN ES? Una cara, cuatro nombres. */
function quienEs(): QuestionRecord[] {
  const disponibles = conCara();
  return disponibles.map(({ personaje, src }, indice) => {
    const siguiente = rng(`visual-quien:${personaje.nombre}`);
    const otros = barajar(
      disponibles.filter((otro) => otro.personaje.nombre !== personaje.nombre),
      siguiente,
    )
      .slice(0, 3)
      .map((otro) => otro.personaje.nombre);

    return conImagen({
      id: `V-QUIEN-${indice}`,
      prompt: '¿Quién es este vecino?',
      explanation: `${personaje.nombre}: ${personaje.rol}, en ${personaje.zona}.`,
      difficulty: 2,
      category: 'personajes',
      characters: [personaje.nombre],
      tags: ['tipo:quien-es', 'tema:reparto'],
      src,
      alt: 'Retrato de un vecino de Desengaño 21',
      opciones: [personaje.nombre, ...otros],
      correcta: personaje.nombre,
      turno: indice,
    });
  });
}

/** ¿DÓNDE VIVE? Una cara, cuatro viviendas. */
function dondeVive(): QuestionRecord[] {
  const disponibles = conCara();
  const etiquetas = ZONAS.map((zona) => zona.etiqueta);

  return disponibles.map(({ personaje, src }, indice) => {
    const siguiente = rng(`visual-donde:${personaje.nombre}`);
    const otras = barajar(
      etiquetas.filter((etiqueta) => etiqueta !== personaje.zona),
      siguiente,
    ).slice(0, 3);

    return conImagen({
      id: `V-DONDE-${indice}`,
      prompt: '¿En qué parte del portal vive?',
      explanation: `${personaje.nombre} vive en ${personaje.zona}.`,
      difficulty: 4,
      category: 'lugares',
      characters: [personaje.nombre],
      tags: ['tipo:donde', 'tema:lugares'],
      src,
      alt: 'Retrato de un vecino de Desengaño 21',
      opciones: [personaje.zona, ...otras],
      correcta: personaje.zona,
      turno: indice + 1,
    });
  });
}

/** ¿QUIÉN LO INTERPRETA? Una cara, cuatro intérpretes. La más difícil de las tres. */
function quienLoInterpreta(): QuestionRecord[] {
  const disponibles = conCara();
  return disponibles.map(({ personaje, src }, indice) => {
    const siguiente = rng(`visual-interprete:${personaje.nombre}`);
    const otros = barajar(
      disponibles.filter((otro) => otro.personaje.interprete !== personaje.interprete),
      siguiente,
    )
      .slice(0, 3)
      .map((otro) => otro.personaje.interprete);

    return conImagen({
      id: `V-INTERPRETE-${indice}`,
      prompt: '¿Qué intérprete da vida a este personaje?',
      explanation: `${personaje.interprete} interpreta a ${personaje.nombre}.`,
      difficulty: 6,
      category: 'reparto',
      characters: [personaje.nombre],
      tags: ['tipo:interprete', 'tema:reparto'],
      src,
      alt: 'Retrato de un vecino de Desengaño 21',
      opciones: [personaje.interprete, ...otros],
      correcta: personaje.interprete,
      turno: indice + 2,
    });
  });
}

export function preguntasVisuales(): QuestionRecord[] {
  return [...quienEs(), ...dondeVive(), ...quienLoInterpreta()];
}

/** Cuántas se pueden generar ahora mismo. Lo enseña el panel. */
export function resumenVisuales(): { personajesConCara: number; preguntas: number } {
  const cuantos = conCara().length;
  return { personajesConCara: cuantos, preguntas: cuantos * 3 };
}
