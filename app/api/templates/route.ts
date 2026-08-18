import { listTemplates } from "../../../lib/server/media-repository";

export async function GET() {
  try {
    return Response.json({ templates: await listTemplates() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list templates." }, { status: 500 });
  }
}
