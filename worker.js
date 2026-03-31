export default {
  async fetch(request, env) {
    // ✅ CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // ✅ Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // ✅ Enforce POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    // ✅ API key check
    const apiKey = request.headers.get("X-API-Key");
    if (apiKey !== env.LOG_API_KEY) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders
      });
    }

    // ✅ Parse body
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders
      });
    }

    // ✅ KV write (awaited)
    await env.LOGS.put(
      `${data.sessionId}:${crypto.randomUUID()}`,
      JSON.stringify({
        ...data,
        receivedAt: new Date().toISOString()
      })
    );

    return new Response("OK", {
      status: 200,
      headers: corsHeaders
    });
  }
};
