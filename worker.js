export default {
  async fetch(request, env) {
    await env.LOGS.put("debug-test", JSON.stringify({ ok: true }));

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const apiKey = request.headers.get("X-API-Key");
    if (apiKey !== env.LOG_API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    await env.LOGS.put(
      `${data.sessionId}:${crypto.randomUUID()}`,
      JSON.stringify({
        ...data,
        receivedAt: new Date().toISOString()
      })
    );

    return new Response("OK");
  }
};
