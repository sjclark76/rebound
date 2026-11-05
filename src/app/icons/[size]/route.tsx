import { brandIcon } from "@/lib/brand-icon";

const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  return brandIcon(Number(size));
}
