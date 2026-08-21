import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/signin-with-chatgpt/route.ts";

test("legacy ChatGPT sign-in links return to a safe local page", async () => {
  const response = await GET(new Request("https://nocanva.example/signin-with-chatgpt?return_to=%2Fdrafts%3Fbrand%3Dblindspot"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://nocanva.example/drafts?brand=blindspot");
});

test("legacy ChatGPT sign-in links reject external and recursive redirects", async () => {
  const external = await GET(new Request("https://nocanva.example/signin-with-chatgpt?return_to=https%3A%2F%2Fevil.example"));
  const recursive = await GET(new Request("https://nocanva.example/signin-with-chatgpt?return_to=%2Fsignin-with-chatgpt"));
  assert.equal(external.headers.get("location"), "https://nocanva.example/");
  assert.equal(recursive.headers.get("location"), "https://nocanva.example/");
});
