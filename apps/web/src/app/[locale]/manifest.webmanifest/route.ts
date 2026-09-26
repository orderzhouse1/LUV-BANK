import { assertLocaleOrNull, buildWebManifest } from "@/lib/pwa-manifest";

export const dynamic = "force-static";

export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await context.params;
  const locale = assertLocaleOrNull(raw);
  if (!locale) {
    return new Response("Not found", { status: 404 });
  }

  const manifest = buildWebManifest(locale);
  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
