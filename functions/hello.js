// functions/hello.js
export async function onRequest(context) {
  console.log("--- HELLO.JS INVOCADO DIRECTAMENTE ---"); // Log distintivo
  try {
    console.log("Hello function invoked!");
    return new Response("Hello from the edge, directly from hello.js!", {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (e) {
    console.error("Error en hello.js:", e.message, e.stack);
    return new Response(`Error en hello.js: ${e.message}`, { status: 500 });
  }
}
