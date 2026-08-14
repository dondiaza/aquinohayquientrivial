# Guía de importación y expansión con Claude

Objetivo: que Claude transforme y expanda contenido controlado, no que improvise una “verdad” nueva.

## Esquema recomendado

```json
{
  "id": "Q0001",
  "type": "multiple_choice | true_false | short_answer | order | match",
  "difficulty": "1..5",
  "category": "Personajes | Reparto | Tramas | Serie | Producción | Curiosidades | Frases | Audiencias",
  "question": "Texto de la pregunta",
  "options": [
    "A",
    "B",
    "C",
    "D"
  ],
  "answer": "Respuesta canónica",
  "explanation": "Explicación breve",
  "tags": [
    "personaje:emilio",
    "temporada:2"
  ],
  "spoiler": "none | light | major",
  "confidence": "high | medium",
  "source_hint": "Antena 3 | FormulaTV | IMDb | Wikipedia contrastada"
}
```

## Prompt maestro para Claude

```text
Usa los documentos adjuntos como fuente de verdad editorial para una app de quiz de Aquí no hay quien viva.

1. Extrae todas las entradas con sus IDs.
2. Normaliza personajes, actores, lugares y etiquetas.
3. Devuelve JSON válido siguiendo el esquema indicado.
4. No inventes datos de episodios, fechas, parentescos o actores si no aparecen en la fuente.
5. Puedes crear variantes de redacción de una misma pregunta, pero conserva la respuesta y explicación.
6. Evita duplicados semánticos dentro del mismo lote.
7. Marca spoiler=major para muertes, desenlace final, bodas decisivas y destinos del último episodio.
8. Para nuevas preguntas, usa solo inferencias directas de la Biblia de contenido. Si una respuesta requiere información externa, marca needs_review=true.
9. Mantén las citas de diálogos en fragmentos muy breves; prioriza paráfrasis.
10. Produce lotes de 50-100 elementos y valida IDs, opciones únicas y que la respuesta esté presente entre las opciones en preguntas de opción múltiple.
```

## Controles de calidad

- La respuesta correcta aparece exactamente una vez entre las opciones.
- Los distractores son plausibles pero inequívocamente incorrectos.
- No hay dos preguntas con el mismo significado y distinta respuesta.
- Los nombres de personajes están normalizados.
- Los spoilers se pueden ocultar.
- Las preguntas expertas no dependen de rumores.
- Las frases de diálogo se mantienen muy cortas.
- Si las fuentes discrepan en numeraciones de episodios/especiales, no formular preguntas que dependan de esa discrepancia.
- `explanation` aporta contexto.
- Los IDs nunca se reciclan.

## Nota sobre episodios

Las fuentes públicas no siempre cuentan igual especiales y numeraciones. Define una convención única antes de construir una tabla episodio-a-episodio y mantenla en toda la plataforma.