# Guía de importación · Expansión II

## Qué añade este paquete

- 600 preguntas nuevas (Q0359–Q0958).
- 180 retos/minijuegos nuevos (P081–P260).
- 48 modos de juego de alto nivel.
- 120 rondas preconstruidas de 10 preguntas.
- Maestros combinados con el contenido anterior.

## Totales combinados

- Preguntas: 958.
- Retos/pruebas: 260.
- Tarjetas existentes: 174.

## Nuevos tipos de pregunta

{
  "opcion_multiple": 212,
  "respuesta_corta": 70,
  "pistas_progresivas": 26,
  "verdadero_falso": 83,
  "emparejar": 40,
  "intruso": 35,
  "clasificacion": 22,
  "ordenar": 4,
  "inferencia": 25,
  "doble_pista": 26,
  "comparacion": 3,
  "seleccion_multiple": 18,
  "cadena_relacional": 18,
  "ficha_rapida": 18
}

## Categorías de la expansión

{
  "Reparto": 76,
  "Lugares": 104,
  "Personajes": 151,
  "Relaciones": 128,
  "Cronología": 48,
  "Producción": 36,
  "Curiosidades": 12,
  "Ecosistema": 21,
  "Adaptaciones": 15,
  "Audiencias": 9
}

## Prompt recomendado para Claude

```text
Toma preguntas_master_v2.json, pruebas_master_v2.json, tarjetas_master.json, modos_juego_v2.json y rondas_preconstruidas_v2.json como corpus de importación para una app de Aquí no hay quien viva.

1. Conserva IDs exactamente.
2. Convierte tags a array si alguna entrada legacy viene como string separado por comas.
3. Mantén spoiler, confidence y source_hint.
4. Para opcion_multiple, valida que answer esté exactamente una vez en options.
5. Implementa renderers separados para: opcion_multiple, respuesta_corta, verdadero_falso, pistas_progresivas, emparejar, clasificacion, ordenar, intruso, inferencia, seleccion_multiple, cadena_relacional y ficha_rapida.
6. Usa modos_juego_v2.json como configuración de producto, no como preguntas.
7. Usa rondas_preconstruidas_v2.json para pruebas rápidas; en producción genera rondas por filtros de dificultad/categoría/spoiler evitando repetición reciente.
8. No transformes source_hint en texto visible al jugador; úsalo para revisión editorial.
9. No muestres spoiler=major si el usuario activa modo sin spoilers.
10. Si detectas contradicciones entre datos legacy y v2, marca needs_review=true y conserva ambas entradas hasta revisión humana.
```

## Recomendación de arquitectura de contenido

- `questions`: banco canónico.
- `challenges`: reglas de minijuegos.
- `game_modes`: configuración de sesiones/campañas/eventos.
- `round_presets`: lotes de prueba y QA.
- `cards`: coleccionables y microcontenido.
- `user_question_history`: evita repetición.
- `content_flags`: spoiler, confidence, needs_review, source_hint.

## Fuentes de la ampliación

La ampliación factual usa principalmente la biblia editorial previa, Antena 3 y FormulaTV. Los datos más delicados de producción, casting, adaptaciones, campanadas y audiencias conservan `source_hint` para revisión.
