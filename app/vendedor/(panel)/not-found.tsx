import Link from 'next/link';

export default function ResellerNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-ink">No encontramos ese negocio</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        O no existe, o lo dio de alta otro vendedor. Solo puedes abrir los negocios que están a tu nombre.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04]"
      >
        Ver mis negocios
      </Link>
    </div>
  );
}
