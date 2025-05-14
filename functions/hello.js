// functions/hello.js
export async function onRequest(context) {
  console.log("Hello function invoked!");
  return new Response("Hello from the edge!", {
    headers: { 'Content-Type': 'text/plain' },
  });
}
