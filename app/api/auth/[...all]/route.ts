import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "../../../../lib/server/auth";

function handlers() {
  return toNextJsHandler(getAuth());
}

export async function GET(request: Request) {
  return handlers().GET(request);
}

export async function POST(request: Request) {
  return handlers().POST(request);
}

export async function PATCH(request: Request) {
  return handlers().PATCH(request);
}

export async function PUT(request: Request) {
  return handlers().PUT(request);
}

export async function DELETE(request: Request) {
  return handlers().DELETE(request);
}
