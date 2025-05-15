// functions/api/content/debug/ping.js
export async function onRequest(context) {
  return new Response("Pong from /api/content/debug/ping!", {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
