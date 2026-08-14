'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isAdmin, signInAdmin } from '@/server/admin';
import { parseQuestionForm } from '@/server/questions/form';
import {
  createQuestion,
  deleteQuestion,
  duplicateQuestion,
  setQuestionStatus,
  updateQuestion,
} from '@/server/questions/repository';
import type { QuestionStatus } from '@/domain/questions/types';

export type SaveState = {
  status: 'idle' | 'error' | 'saved';
  message?: string;
  errors?: Record<string, string>;
};

const NOT_ALLOWED: SaveState = {
  status: 'error',
  message: 'Sesión de administración no válida. Vuelve a entrar.',
};

/** Crea una pregunta. Devuelve errores por campo si la validación falla. */
export async function createQuestionAction(
  _previous: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const parsed = parseQuestionForm(formData);
  if (!parsed.ok) return { status: 'error', message: parsed.message, errors: parsed.errors };

  const question = await createQuestion(parsed.input);
  revalidatePath('/admin/preguntas');
  redirect(`/admin/preguntas/${question.id}?guardada=1`);
}

/** Actualiza una pregunta existente. */
export async function updateQuestionAction(
  _previous: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return { status: 'error', message: 'Falta el identificador de la pregunta.' };
  }

  const parsed = parseQuestionForm(formData);
  if (!parsed.ok) return { status: 'error', message: parsed.message, errors: parsed.errors };

  await updateQuestion(id, parsed.input);
  revalidatePath('/admin/preguntas');
  revalidatePath(`/admin/preguntas/${id}`);
  // Se redirige (en vez de devolver estado) porque `revalidatePath` vuelve a montar el
  // formulario y el estado de la acción se perdería: el aviso de "guardada" llega por
  // querystring y así sobrevive al refresco.
  redirect(`/admin/preguntas/${id}?guardada=1`);
}

/** Activa / desactiva / archiva. */
export async function setStatusAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as QuestionStatus;
  if (!id) return;
  await setQuestionStatus(id, status);
  revalidatePath('/admin/preguntas');
  revalidatePath(`/admin/preguntas/${id}`);
}

/** Duplica una pregunta como borrador. */
export async function duplicateQuestionAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const copy = await duplicateQuestion(id);
  revalidatePath('/admin/preguntas');
  if (copy) redirect(`/admin/preguntas/${copy.id}`);
}

/** Borra definitivamente. Para retirar una pregunta del juego, mejor archivarla. */
export async function deleteQuestionAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await deleteQuestion(id);
  revalidatePath('/admin/preguntas');
  redirect('/admin/preguntas');
}

/** Entrada al panel cuando ADMIN_PASSWORD está definida. */
export async function signInAdminAction(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const ok = await signInAdmin(password);
  redirect(ok ? '/admin/preguntas' : '/admin/entrar?error=1');
}
