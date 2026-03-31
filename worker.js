export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    console.log("REQUEST METHOD:", request.method);

    if (request.method === "OPTIONS") {
      console.log("CORS PREFLIGHT RECEIVED");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      console.log("NON-POST REJECTED");
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    console.log("POST RECEIVED");

    const apiKey = request.headers.get("X-API-Key");
    console.log("API KEY PRESENT:", !!apiKey);

    if (apiKey !== env.LOG_API_KEY) {
      console.log("API KEY MISMATCH");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log("API KEY OK");

    let data;
    try {
      data = await request.json();
      console.log("JSON PARSED");
    } catch {
      console.log("JSON PARSE FAILED");
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    console.log("WRITING TO KV");

    await env.LOGS.put(
      "kv-final-proof",
      JSON.stringify({ at: Date.now(), data })
    );

    console.log("KV WRITE COMPLETE");

    return new Response("OK", { status: 200, headers: corsHeaders });
  }
};
