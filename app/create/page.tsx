import { Studio } from "../studio";
import { requireNoCanvaViewer } from "../../lib/server/request-auth";

export default async function CreatePage() {
  await requireNoCanvaViewer("/create");
  return <Studio />;
}
