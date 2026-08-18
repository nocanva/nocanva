import { createTemplate, listTemplates } from "../../../lib/server/media-repository";

export async function GET() {
  try {
    return Response.json({ templates: await listTemplates() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to list templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json({ template: await createTemplate(await request.json()) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create template." }, { status: 400 });
  }
}
