import { listBrands } from "../../../lib/server/media-repository";

export async function GET() {
  try {
    return Response.json({ brands: await listBrands() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list brands." }, { status: 500 });
  }
}
