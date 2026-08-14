import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { signInAdminAction } from '@/app/admin/preguntas/actions';
import { Field, TextInput } from '@/components/ui/Form';
import { ErrorNote } from '@/components/ui/Feedback';
import { Papel, Placa } from '@/components/ui/Surfaces';
import { adminGateEnabled, isAdmin } from '@/server/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar al panel' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!adminGateEnabled() || (await isAdmin())) redirect('/admin');
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Placa className="px-5 py-5 pt-7">
        <h1 className="text-2xl">Portería cerrada</h1>
      </Placa>

      <Papel className="mt-4 space-y-4 p-5">
        {error ? <ErrorNote titulo="Contraseña incorrecta">Vuelve a intentarlo.</ErrorNote> : null}
        <p className="text-sm text-tinta-suave">
          El panel está protegido con <code>ADMIN_PASSWORD</code>.
        </p>
        <form action={signInAdminAction} className="space-y-3">
          <Field label="Contraseña" htmlFor="password">
            <TextInput id="password" name="password" type="password" required autoFocus />
          </Field>
          <button type="submit" className="btn btn-verde w-full">
            Entrar
          </button>
        </form>
      </Papel>
    </div>
  );
}
