const baseUrl = process.env.NOCANVA_BASE_URL ?? "http://localhost:3000";
const response = await fetch(new URL("/api/health", baseUrl));
const body = await response.json();
if (!response.ok) throw new Error(`NoCanva initialization failed: ${JSON.stringify(body)}`);
console.log(JSON.stringify({ initialized: true, baseUrl, health: body }, null, 2));
