// functions/test-endpoint.js
export async function onRequest(context) {
  console.log('[test-endpoint.js] onRequest invoked');
  return new Response(JSON.stringify({ message: 'Test endpoint successful!' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // Basic CORS for testing
    }
  });
}
