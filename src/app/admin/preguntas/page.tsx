import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { duplicateQuestionAction, setStatusAction } from './actions';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Chip, Papel, Placa, Sello } from '@/components/ui/Surfaces';
import { Select, TextInput } from '@/components/ui/Form';
import { QUESTION_CATEGORIES, categoryLabel } from '@/domain/questions/categories';
import { QUESTION_TYPE_LIST, questionTypeMeta } from '@/domain/questions/registry';
import { QUESTION_STATUSES, QUESTION_TYPES, type QuestionStatus, type QuestionType } from '@/domain/questions/types';
import { isAdmin } from '@/server/admin';
import { listQuestions, type QuestionFilters } from '@/server/questions/repository';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Banco de preguntas' };

type SearchParams = {
  q?: string;
  tipo?: string;
  categoria?: string;
  estado?: string;
  temporada?: string;
  verificada?: string;
  pagina?: string;
};

function toFilters(params: SearchParams): QuestionFilters {
  const type = QUESTION_TYPES.find((candidate) => candidate === params.tipo);
  const status = QUESTION_STATUSES.find((candidate) => candidate === params.estado);
  const season = params.temporada ? Number.parseInt(params.temporada, 10) : undefined;
  const page = params.pagina ? Number.parseInt(params.pagina, 10) : 1;

  return {
    ...(params.q ? { search: params.q } : {}),
    ...(type ? { type: type as QuestionType } : {}),
    ...(params.categoria ? { category: params.categoria } : {}),
    ...(status ? { status: status as QuestionStatus } : {}),
    ...(season && Number.isFinite(season) ? { season } : {}),
    ...(params.verificada === 'si'
      ? { verified: true }
      : params.verificada === 'no'
        ? { verified: false }
        : {}),
    page: Number.isFinite(page) ? page : 1,
    pageSize: 20,
  };
}

function queryString(params: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!(await isAdmin())) redirect('/admin/entrar');

  const params = await searchParams;
  const filters = toFilters(params);
  const { entries, total, page, pageSize } = await listQuestions(filters);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Placa className="px-5 py-4 pt-6">
          <h1 className="text-2xl sm:text-3xl">Banco de preguntas</h1>
        </Placa>
        <div className="flex gap-2">
          <LinkButton href="/admin/preguntas/nueva" tone="rojo">
            + Nueva pregunta
          </LinkButton>
          <LinkButton href="/admin" tone="fantasma" size="sm">
            Portería
          </LinkButton>
        </div>
      </div>

      {/* ── Filtros (GET, funcionan sin JavaScript) ─────────────────────────── */}
      <Papel className="mt-5 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
          <label className="lg:col-span-2">
            <span className="etiqueta">Buscar</span>
            <TextInput
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Enunciado, etiqueta o personaje"
            />
          </label>
          <label>
            <span className="etiqueta">Tipo</span>
            <Select name="tipo" defaultValue={params.tipo ?? ''}>
              <option value="">Todos</option>
              {QUESTION_TYPE_LIST.map((meta) => (
                <option key={meta.type} value={meta.type}>
                  {meta.short}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="etiqueta">Categoría</span>
            <Select name="categoria" defaultValue={params.categoria ?? ''}>
              <option value="">Todas</option>
              {QUESTION_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="etiqueta">Estado</span>
            <Select name="estado" defaultValue={params.estado ?? ''}>
              <option value="">Todos</option>
              <option value="ACTIVE">Activa</option>
              <option value="DRAFT">Borrador</option>
              <option value="ARCHIVED">Archivada</option>
            </Select>
          </label>
          <label>
            <span className="etiqueta">Verificada</span>
            <Select name="verificada" defaultValue={params.verificada ?? ''}>
              <option value="">Todas</option>
              <option value="si">Sí</option>
              <option value="no">No (demo)</option>
            </Select>
          </label>
          <label>
            <span className="etiqueta">Temporada</span>
            <TextInput name="temporada" type="number" min={1} max={20} defaultValue={params.temporada ?? ''} />
          </label>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button type="submit" className="btn btn-verde">
              Filtrar
            </button>
            <Link href="/admin/preguntas" className="btn btn-fantasma btn-sm">
              Limpiar
            </Link>
          </div>
        </form>
      </Papel>

      <p className="texto-sello mt-4 text-tinta-suave">
        {total} pregunta{total === 1 ? '' : 's'} · página {page} de {pages}
      </p>

      {/* ── Listado ─────────────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            titulo="No hay preguntas con esos filtros"
            descripcion="Prueba a limpiar los filtros o crea una pregunta nueva."
            accion={{ href: '/admin/preguntas/nueva', label: 'Crear pregunta' }}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(({ question, stat }) => {
            const meta = questionTypeMeta(question.type);
            return (
              <li key={question.id}>
                <Papel className="p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip>
                          <span aria-hidden>{meta.icon}</span> {meta.short}
                        </Chip>
                        <Chip>{categoryLabel(question.category)}</Chip>
                        <Chip>dif. {question.difficulty}</Chip>
                        {question.season ? <Chip>T{question.season}</Chip> : null}
                        <Chip
                          className={
                            question.status === 'ACTIVE'
                              ? 'border-verde-portal text-verde-portal'
                              : 'border-tinta-tenue text-tinta-tenue'
                          }
                        >
                          {question.status}
                        </Chip>
                        {question.verified ? <Sello tone="ok">Verificada</Sello> : <Sello>Demo</Sello>}
                      </div>

                      <Link
                        href={`/admin/preguntas/${question.id}`}
                        className="mt-1.5 block text-base font-semibold underline decoration-linea-fuerte hover:decoration-tinta"
                      >
                        {question.prompt}
                      </Link>

                      <p className="texto-sello mt-1 text-tinta-tenue">
                        mostrada {stat.timesShown} · acierto{' '}
                        {stat.successRate === null ? '—' : `${stat.successRate} %`} · media{' '}
                        {stat.averageResponseMs === null ? '—' : `${(stat.averageResponseMs / 1000).toFixed(1)} s`} ·
                        dif. estimada {stat.estimatedDifficulty ?? '—'}
                      </p>
                    </div>

                    <div className="flex flex-none flex-wrap gap-1.5">
                      <LinkButton href={`/admin/preguntas/${question.id}`} tone="papel" size="sm">
                        Editar
                      </LinkButton>
                      <form action={setStatusAction}>
                        <input type="hidden" name="id" value={question.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={question.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'}
                        />
                        <button type="submit" className="btn btn-fantasma btn-sm">
                          {question.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                      <form action={duplicateQuestionAction}>
                        <input type="hidden" name="id" value={question.id} />
                        <button type="submit" className="btn btn-fantasma btn-sm">
                          Duplicar
                        </button>
                      </form>
                    </div>
                  </div>
                </Papel>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Paginación ──────────────────────────────────────────────────────── */}
      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Paginación">
          {page > 1 ? (
            <Link
              href={`/admin/preguntas${queryString(params, { pagina: String(page - 1) })}`}
              className="btn btn-papel btn-sm"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          {page < pages ? (
            <Link
              href={`/admin/preguntas${queryString(params, { pagina: String(page + 1) })}`}
              className="btn btn-papel btn-sm"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
