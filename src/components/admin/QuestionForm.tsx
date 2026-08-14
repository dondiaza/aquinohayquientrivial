'use client';

import { useActionState, useState } from 'react';

import { Field, Checkbox, Select, TextInput, Textarea } from '@/components/ui/Form';
import { Chip, Nota, Papel } from '@/components/ui/Surfaces';
import { ErrorNote } from '@/components/ui/Feedback';
import { QUESTION_CATEGORIES } from '@/domain/questions/categories';
import { QUESTION_TYPE_LIST, questionTypeMeta } from '@/domain/questions/registry';
import { QUESTION_STATUSES, type Question, type QuestionType } from '@/domain/questions/types';
import type { SaveState } from '@/app/admin/preguntas/actions';

const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa (se juega)',
  DRAFT: 'Borrador (no se juega)',
  ARCHIVED: 'Archivada (no se juega)',
};

type FormAction = (state: SaveState, formData: FormData) => Promise<SaveState>;

/** Valores iniciales derivados de una pregunta existente (o vacíos si es nueva). */
function initialFor(question?: Question) {
  const options =
    question &&
    (question.type === 'MULTIPLE_CHOICE' ||
      question.type === 'WHO_IS_IT' ||
      question.type === 'FINAL_BET' ||
      question.type === 'MEMORY_GRID' ||
      question.type === 'MISSING_ITEM')
      ? question.options
      : undefined;
  const items = question?.type === 'IMPOSTOR' ? question.items : undefined;

  return {
    type: question?.type ?? ('MULTIPLE_CHOICE' as QuestionType),
    optionTexts: OPTION_IDS.map((id) => options?.find((option) => option.id === id)?.text ?? ''),
    itemTexts: OPTION_IDS.map((id) => items?.find((item) => item.id === id)?.text ?? ''),
    correctOptionId: options ? question && 'correctOptionId' in question ? question.correctOptionId : 'a' : 'a',
    impostorItemId: question?.type === 'IMPOSTOR' ? question.impostorItemId : 'a',
    clues: question?.type === 'WHO_IS_IT' ? question.clues.join('\n') : '',
    steps: question?.type === 'ORDER_CHAOS' ? question.steps.map((step) => step.text).join('\n') : '',
    items:
      question?.type === 'MEMORY_GRID'
        ? question.items.map((item) => `${item.icon ?? 'caja'}:${item.text}`).join('\n')
        : '',
    present:
      question?.type === 'MISSING_ITEM'
        ? question.present.map((item) => `${item.icon ?? 'caja'}:${item.text}`).join('\n')
        : '',
    decisiones:
      question?.type === 'DECISION'
        ? question.options
            .map((opcion) => `${opcion.weight} | ${opcion.text} | ${opcion.outcome}`)
            .join('\n')
        : '',
    pads: question?.type === 'SEQUENCE' ? question.pads.map((pad) => pad.text).join('\n') : '',
    secuencia:
      question?.type === 'SEQUENCE'
        ? question.sequence
            .map((id) => question.pads.findIndex((pad) => pad.id === id) + 1)
            .join(', ')
        : '',
  };
}

/**
 * Formulario de pregunta. Los campos comunes son fijos y los propios del tipo cambian
 * al cambiar el selector: un componente por tipo habría sido más código sin más valor,
 * pero la VALIDACIÓN sí es por tipo (Zod, en el servidor) y es la que manda.
 */
export function QuestionForm({
  action,
  question,
  savedNotice,
}: {
  action: FormAction;
  question?: Question;
  savedNotice?: boolean;
}) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(action, {
    status: savedNotice ? 'saved' : 'idle',
  });

  const initial = initialFor(question);
  const [type, setType] = useState<QuestionType>(initial.type);
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [optionTexts, setOptionTexts] = useState<string[]>(initial.optionTexts);
  const [itemTexts, setItemTexts] = useState<string[]>(initial.itemTexts);
  const [correctOptionId, setCorrectOptionId] = useState(initial.correctOptionId);
  const [impostorItemId, setImpostorItemId] = useState(initial.impostorItemId);
  const [correctValue, setCorrectValue] = useState(
    question?.type === 'TRUE_FALSE' ? String(question.correctValue) : 'true',
  );
  const [clues, setClues] = useState(initial.clues);
  const [steps, setSteps] = useState(initial.steps);
  const [items, setItems] = useState(initial.items);
  const [present, setPresent] = useState(initial.present);
  const [decisiones, setDecisiones] = useState(initial.decisiones);
  const [pads, setPads] = useState(initial.pads);
  const [secuencia, setSecuencia] = useState(initial.secuencia);

  const meta = questionTypeMeta(type);
  const errorFor = (key: string) => state.errors?.[key];
  const usesOptions =
    type === 'MULTIPLE_CHOICE' ||
    type === 'WHO_IS_IT' ||
    type === 'FINAL_BET' ||
    type === 'MEMORY_GRID' ||
    type === 'MISSING_ITEM';

  const setOption = (index: number, value: string) =>
    setOptionTexts((current) => current.map((text, position) => (position === index ? value : text)));
  const setItem = (index: number, value: string) =>
    setItemTexts((current) => current.map((text, position) => (position === index ? value : text)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
      <form action={formAction} className="space-y-5">
        {question ? <input type="hidden" name="id" value={question.id} /> : null}

        {state.status === 'error' ? (
          <ErrorNote titulo="No se ha guardado">
            {state.message}
            {state.errors ? (
              <ul className="mt-2 list-inside list-disc">
                {Object.entries(state.errors).map(([key, message]) => (
                  <li key={key}>
                    <code>{key}</code>: {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </ErrorNote>
        ) : null}

        {state.status === 'saved' ? (
          <Nota tone="verde" className="p-3 text-sm">
            ✓ Guardada correctamente.
          </Nota>
        ) : null}

        <Papel className="space-y-4 p-4">
          <Field label="Tipo de prueba" htmlFor="type" error={errorFor('type')}>
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as QuestionType)}
            >
              {QUESTION_TYPE_LIST.map((entry) => (
                <option key={entry.type} value={entry.type}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Enunciado" htmlFor="prompt" error={errorFor('prompt')}>
            <Textarea
              id="prompt"
              name="prompt"
              rows={3}
              required
              maxLength={400}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </Field>

          <Field
            label="Explicación (se muestra al revelar)"
            htmlFor="explanation"
            error={errorFor('explanation')}
          >
            <Textarea
              id="explanation"
              name="explanation"
              rows={2}
              maxLength={600}
              defaultValue={question?.explanation ?? ''}
            />
          </Field>
        </Papel>

        {/* ── Campos propios del tipo ─────────────────────────────────────────── */}
        <Papel className="space-y-4 p-4">
          <p className="texto-cartel">{meta.label}</p>
          <p className="text-xs text-tinta-suave">{meta.instruction}</p>

          {usesOptions ? (
            <fieldset className="space-y-2">
              <legend className="etiqueta">Opciones (marca la correcta)</legend>
              {OPTION_IDS.map((id, index) => (
                <div key={id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOptionId"
                    value={id}
                    checked={correctOptionId === id}
                    onChange={() => setCorrectOptionId(id)}
                    className="h-5 w-5 flex-none accent-verde-portal"
                    aria-label={`Opción ${id.toUpperCase()} es la correcta`}
                  />
                  <TextInput
                    name={`option-${id}`}
                    placeholder={`Opción ${id.toUpperCase()}`}
                    required
                    value={optionTexts[index] ?? ''}
                    onChange={(event) => setOption(index, event.target.value)}
                  />
                </div>
              ))}
              {errorFor('payload.options') || errorFor('payload.correctOptionId') ? (
                <p className="text-xs font-semibold text-rojo-buzon">
                  {errorFor('payload.options') ?? errorFor('payload.correctOptionId')}
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {type === 'TRUE_FALSE' ? (
            <fieldset className="flex gap-4">
              <legend className="etiqueta">Respuesta correcta</legend>
              {[
                { value: 'true', label: 'Verdadero' },
                { value: 'false', label: 'Falso' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctValue"
                    value={option.value}
                    checked={correctValue === option.value}
                    onChange={() => setCorrectValue(option.value)}
                    className="h-5 w-5 accent-verde-portal"
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ) : null}

          {type === 'WHO_IS_IT' ? (
            <>
              <Field
                label="Pistas (una por línea, de más vaga a más evidente)"
                htmlFor="clues"
                error={errorFor('payload.clues')}
              >
                <Textarea
                  id="clues"
                  name="clues"
                  rows={4}
                  value={clues}
                  onChange={(event) => setClues(event.target.value)}
                />
              </Field>
              <Field label="Segundos entre pistas" htmlFor="clueIntervalSeconds">
                <TextInput
                  id="clueIntervalSeconds"
                  name="clueIntervalSeconds"
                  type="number"
                  min={3}
                  max={15}
                  defaultValue={question?.type === 'WHO_IS_IT' ? question.clueIntervalSeconds : 5}
                />
              </Field>
            </>
          ) : null}

          {type === 'IMPOSTOR' ? (
            <>
              <Field
                label="Qué tienen en común los tres correctos"
                htmlFor="setLabel"
                error={errorFor('payload.setLabel')}
              >
                <TextInput
                  id="setLabel"
                  name="setLabel"
                  defaultValue={question?.type === 'IMPOSTOR' ? question.setLabel : ''}
                  required
                />
              </Field>
              <fieldset className="space-y-2">
                <legend className="etiqueta">Elementos (marca el infiltrado)</legend>
                {OPTION_IDS.map((id, index) => (
                  <div key={id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="impostorItemId"
                      value={id}
                      checked={impostorItemId === id}
                      onChange={() => setImpostorItemId(id)}
                      className="h-5 w-5 flex-none accent-rojo-buzon"
                      aria-label={`Elemento ${id.toUpperCase()} es el infiltrado`}
                    />
                    <TextInput
                      name={`item-${id}`}
                      placeholder={`Elemento ${id.toUpperCase()}`}
                      required
                      value={itemTexts[index] ?? ''}
                      onChange={(event) => setItem(index, event.target.value)}
                    />
                  </div>
                ))}
              </fieldset>
            </>
          ) : null}

          {type === 'ORDER_CHAOS' ? (
            <>
              <Field
                label="Hechos EN ORDEN CORRECTO (uno por línea, de 3 a 5)"
                htmlFor="steps"
                error={errorFor('payload.steps')}
              >
                <Textarea
                  id="steps"
                  name="steps"
                  rows={5}
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Etiqueta del primero" htmlFor="firstLabel">
                  <TextInput
                    id="firstLabel"
                    name="firstLabel"
                    defaultValue={question?.type === 'ORDER_CHAOS' ? question.firstLabel : 'Primero'}
                  />
                </Field>
                <Field label="Etiqueta del último" htmlFor="lastLabel">
                  <TextInput
                    id="lastLabel"
                    name="lastLabel"
                    defaultValue={question?.type === 'ORDER_CHAOS' ? question.lastLabel : 'Último'}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {type === 'MEMORY_GRID' ? (
            <>
              <Field
                label="Objetos que se muestran (uno por linea, «icono:Texto»)"
                htmlFor="items"
                error={errorFor('payload.items')}
                hint="Iconos: buzon, felpudo, extintor, maceta, bombilla, escoba, cubo, silla, paraguas, llave, sobre, periodico, taza, radio, telefonillo, reloj, bicicleta, bolsa, caja, contador, papelera, gato"
              >
                <Textarea
                  id="items"
                  name="items"
                  rows={5}
                  value={items}
                  onChange={(event) => setItems(event.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Segundos de memorizacion" htmlFor="studySeconds">
                  <TextInput
                    id="studySeconds"
                    name="studySeconds"
                    type="number"
                    min={2}
                    max={15}
                    defaultValue={question?.type === 'MEMORY_GRID' ? question.studySeconds : 5}
                  />
                </Field>
                <Field
                  label="Pregunta posterior"
                  htmlFor="question"
                  error={errorFor('payload.question')}
                >
                  <TextInput
                    id="question"
                    name="question"
                    defaultValue={question?.type === 'MEMORY_GRID' ? question.question : ''}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {type === 'MISSING_ITEM' ? (
            <>
              <Field label="Escena" htmlFor="sceneLabel" error={errorFor('payload.sceneLabel')}>
                <TextInput
                  id="sceneLabel"
                  name="sceneLabel"
                  defaultValue={question?.type === 'MISSING_ITEM' ? question.sceneLabel : ''}
                  placeholder="El portal un lunes por la manana"
                />
              </Field>
              <Field
                label="Objetos presentes (uno por linea, «icono:Texto»)"
                htmlFor="present"
                error={errorFor('payload.present')}
                hint="El objeto que falta NO debe estar en esta lista"
              >
                <Textarea
                  id="present"
                  name="present"
                  rows={5}
                  value={present}
                  onChange={(event) => setPresent(event.target.value)}
                />
              </Field>
              <p className="text-xs text-tinta-suave">
                En las cuatro opciones puedes usar tambien «icono:Texto» para que salga dibujado.
              </p>
            </>
          ) : null}

          {type === 'DECISION' ? (
            <>
              <Field label="Situacion" htmlFor="situation" error={errorFor('payload.situation')}>
                <Textarea
                  id="situation"
                  name="situation"
                  rows={3}
                  defaultValue={question?.type === 'DECISION' ? question.situation : ''}
                />
              </Field>
              <Field
                label="Decisiones (una por linea: peso | texto | consecuencia)"
                htmlFor="decisiones"
                error={errorFor('payload.options')}
                hint="El peso va de 0 a 1 y la mejor decision debe valer exactamente 1"
              >
                <Textarea
                  id="decisiones"
                  name="decisiones"
                  rows={5}
                  value={decisiones}
                  onChange={(event) => setDecisiones(event.target.value)}
                />
              </Field>
            </>
          ) : null}

          {type === 'SEQUENCE' ? (
            <>
              <Field
                label="Botones del portero (uno por linea)"
                htmlFor="pads"
                error={errorFor('payload.pads')}
              >
                <Textarea
                  id="pads"
                  name="pads"
                  rows={4}
                  value={pads}
                  onChange={(event) => setPads(event.target.value)}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Secuencia (numeros de boton separados por comas)"
                  htmlFor="secuencia"
                  error={errorFor('payload.sequence')}
                  hint="Ejemplo: 1, 3, 2 - se pueden repetir"
                >
                  <TextInput
                    id="secuencia"
                    name="secuencia"
                    value={secuencia}
                    onChange={(event) => setSecuencia(event.target.value)}
                  />
                </Field>
                <Field label="Milisegundos por paso" htmlFor="stepMs">
                  <TextInput
                    id="stepMs"
                    name="stepMs"
                    type="number"
                    min={300}
                    max={1500}
                    step={50}
                    defaultValue={question?.type === 'SEQUENCE' ? question.stepMs : 650}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {type === 'FINAL_BET' ? (
            <Field
              label="Fracción máxima del marcador que se puede apostar (0.1 - 1)"
              htmlFor="maxWagerRatio"
            >
              <TextInput
                id="maxWagerRatio"
                name="maxWagerRatio"
                type="number"
                step={0.05}
                min={0.1}
                max={1}
                defaultValue={question?.type === 'FINAL_BET' ? question.maxWagerRatio : 0.5}
              />
            </Field>
          ) : null}
        </Papel>

        {/* ── Metadatos ───────────────────────────────────────────────────────── */}
        <Papel className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="category" error={errorFor('category')}>
              <Select id="category" name="category" defaultValue={question?.category ?? 'general'}>
                {QUESTION_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Estado" htmlFor="status">
              <Select id="status" name="status" defaultValue={question?.status ?? 'ACTIVE'}>
                {QUESTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status] ?? status}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Dificultad (1-10)"
              htmlFor="difficulty"
              error={errorFor('difficulty')}
              hint="1 muy fácil · 10 muy difícil"
            >
              <TextInput
                id="difficulty"
                name="difficulty"
                type="number"
                min={1}
                max={10}
                required
                defaultValue={question?.difficulty ?? 5}
              />
            </Field>

            <Field label="Tiempo (segundos)" htmlFor="timeLimitSeconds" error={errorFor('timeLimitSeconds')}>
              <TextInput
                id="timeLimitSeconds"
                name="timeLimitSeconds"
                type="number"
                min={5}
                max={120}
                required
                defaultValue={question?.timeLimitSeconds ?? meta.defaultTimeLimitSeconds}
              />
            </Field>

            <Field label="Puntos base" htmlFor="basePoints" error={errorFor('basePoints')}>
              <TextInput
                id="basePoints"
                name="basePoints"
                type="number"
                min={100}
                max={5000}
                step={50}
                defaultValue={question?.basePoints ?? meta.defaultBasePoints}
              />
            </Field>

            <Field label="Temporada" htmlFor="season">
              <TextInput
                id="season"
                name="season"
                type="number"
                min={1}
                max={20}
                defaultValue={question?.season ?? ''}
              />
            </Field>

            <Field label="Episodio" htmlFor="episode">
              <TextInput
                id="episode"
                name="episode"
                type="number"
                min={1}
                max={400}
                defaultValue={question?.episode ?? ''}
              />
            </Field>

            <Field label="Personajes (separados por coma)" htmlFor="characters">
              <TextInput
                id="characters"
                name="characters"
                defaultValue={question?.characters.join(', ') ?? ''}
              />
            </Field>

            <Field label="Etiquetas (separadas por coma)" htmlFor="tags">
              <TextInput id="tags" name="tags" defaultValue={question?.tags.join(', ') ?? ''} />
            </Field>

            <Field label="Placeholder de media (opcional)" htmlFor="mediaPlaceholder">
              <TextInput
                id="mediaPlaceholder"
                name="mediaPlaceholder"
                placeholder="Ilustración original del portal"
                defaultValue={question?.media?.placeholder ?? ''}
              />
            </Field>

            <Field label="Tipo de media" htmlFor="mediaKind">
              <Select id="mediaKind" name="mediaKind" defaultValue={question?.media?.kind ?? 'image'}>
                <option value="image">Imagen</option>
                <option value="audio">Audio</option>
                <option value="video">Vídeo</option>
              </Select>
            </Field>
          </div>

          <Field
            label="Nota de fuente"
            htmlFor="sourceNote"
            hint="De dónde sale el dato. Imprescindible para marcarla como verificada."
          >
            <TextInput id="sourceNote" name="sourceNote" defaultValue={question?.sourceNote ?? ''} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              name="verified"
              label="Verificada con fuente fiable"
              hint="Si no está marcada, el juego la muestra con el sello de contenido demo."
              defaultChecked={question?.verified ?? false}
            />
            <Checkbox
              name="featured"
              label="Destacada"
              hint="Para las preguntas que quieres que salgan más a menudo."
              defaultChecked={question?.featured ?? false}
            />
          </div>

          {/* Compatibilidad: la declara el registro de tipos, no se escribe a mano */}
          <p className="texto-sello text-tinta-tenue">
            {meta.supportsOptionElimination ? 'Admite descarte de opción' : 'Sin descarte de opción'}
            {meta.supportsPartialCredit ? ' · admite acierto parcial' : ''}
            {meta.hasStudyPhase ? ' · tiene fase de memoria' : ''}
          </p>
        </Papel>

        <button type="submit" className="btn btn-verde btn-lg" disabled={pending}>
          {pending ? 'Guardando…' : question ? 'Guardar cambios' : 'Crear pregunta'}
        </button>
      </form>

      {/* ── Previsualización ──────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-4">
        <p className="texto-sello mb-2 text-tinta-suave">Previsualización</p>
        <Nota tone="papel" className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1">
            <Chip>
              <span aria-hidden>{meta.icon}</span> {meta.label}
            </Chip>
          </div>
          <p className="text-lg leading-snug">{prompt || 'Escribe el enunciado…'}</p>

          {usesOptions ? (
            <ul className="space-y-1.5">
              {optionTexts.map((text, index) => {
                const id = OPTION_IDS[index] ?? 'a';
                const isCorrect = correctOptionId === id;
                return (
                  <li
                    key={id}
                    className={`flex items-center gap-2 border-2 p-2 text-sm ${
                      isCorrect ? 'border-verde-portal bg-verde-azulejo/40' : 'border-linea-fuerte'
                    }`}
                  >
                    <span className="indice-respuesta">{id.toUpperCase()}</span>
                    <span className="flex-1">{text || '—'}</span>
                    {isCorrect ? <span aria-hidden>✔</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {type === 'TRUE_FALSE' ? (
            <p className="text-sm">
              Respuesta correcta: <strong>{correctValue === 'true' ? 'Verdadero' : 'Falso'}</strong>
            </p>
          ) : null}

          {type === 'WHO_IS_IT' && clues.trim().length > 0 ? (
            <ol className="list-inside list-decimal space-y-1 text-sm text-tinta-suave">
              {clues
                .split('\n')
                .filter((clue) => clue.trim().length > 0)
                .map((clue, index) => (
                  <li key={`${index}-${clue}`}>{clue}</li>
                ))}
            </ol>
          ) : null}

          {type === 'IMPOSTOR' ? (
            <ul className="space-y-1.5">
              {itemTexts.map((text, index) => {
                const id = OPTION_IDS[index] ?? 'a';
                const isImpostor = impostorItemId === id;
                return (
                  <li
                    key={id}
                    className={`flex items-center gap-2 border-2 p-2 text-sm ${
                      isImpostor ? 'border-rojo-buzon bg-rojo-claro/20' : 'border-linea-fuerte'
                    }`}
                  >
                    <span className="flex-1">{text || '—'}</span>
                    {isImpostor ? <span className="texto-sello">infiltrado</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {type === 'DECISION' && decisiones.trim().length > 0 ? (
            <ul className="space-y-1 text-sm">
              {decisiones
                .split('\n')
                .filter((linea) => linea.trim().length > 0)
                .map((linea, index) => {
                  const partes = linea.split('|').map((parte) => parte.trim());
                  const esMejor = partes[0] === '1';
                  return (
                    <li
                      key={`${index}-${linea}`}
                      className={`border-2 p-2 ${esMejor ? 'border-verde-portal bg-verde-azulejo/40' : 'border-linea-fuerte'}`}
                    >
                      <span className="block">{partes[1] ?? '-'}</span>
                      <span className="block text-xs text-tinta-suave">
                        peso {partes[0] ?? '0'} · {partes[2] ?? ''}
                      </span>
                    </li>
                  );
                })}
            </ul>
          ) : null}

          {type === 'SEQUENCE' && pads.trim().length > 0 ? (
            <div className="text-sm">
              <p className="texto-sello text-tinta-tenue">Botones</p>
              <p>{pads.split('\n').filter(Boolean).join(' · ')}</p>
              <p className="texto-sello mt-2 text-tinta-tenue">Secuencia</p>
              <p>{secuencia || '-'}</p>
            </div>
          ) : null}

          {(type === 'MEMORY_GRID' || type === 'MISSING_ITEM') &&
          (items.trim().length > 0 || present.trim().length > 0) ? (
            <div className="text-sm">
              <p className="texto-sello text-tinta-tenue">
                {type === 'MEMORY_GRID' ? 'Objetos que se muestran' : 'Objetos de la escena'}
              </p>
              <p>
                {(type === 'MEMORY_GRID' ? items : present)
                  .split('\n')
                  .filter(Boolean)
                  .map((linea) => linea.split(':').pop())
                  .join(' · ')}
              </p>
            </div>
          ) : null}

          {type === 'ORDER_CHAOS' && steps.trim().length > 0 ? (
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {steps
                .split('\n')
                .filter((step) => step.trim().length > 0)
                .map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
            </ol>
          ) : null}
        </Nota>
      </aside>
    </div>
  );
}
