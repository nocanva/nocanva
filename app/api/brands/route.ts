import { createBrand, listBrands } from "../../../lib/server/media-repository";

export async function GET() {
  try {
    return Response.json({ brands: await listBrands() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list brands." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json({ brand: await createBrand(await request.json()) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create brand." }, { status: 400 });
  }
}
