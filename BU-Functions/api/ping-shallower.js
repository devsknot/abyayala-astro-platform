// functions/api/ping-shallower.js
export async function onRequest(context) {
  return new Response("Pong from /api/ping-shallower!", {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
