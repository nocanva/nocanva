import { Studio } from "./studio";
import { requireNoCanvaViewer } from "../lib/server/request-auth";

export default async function Home() {
  await requireNoCanvaViewer("/");
  return <Studio />;
}
