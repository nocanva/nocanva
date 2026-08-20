import { checkMediaHealth } from "@/lib/server/media-repository";

export async function GET() {
  try {
    const dependencies = await checkMediaHealth();
    return Response.json({ status: "ok", service: "nocanva", version: "0.4.0-rc.1", dependencies }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json({
      status: "error",
      service: "nocanva",
      error: error instanceof Error ? error.message : "Unknown health-check failure.",
    }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
