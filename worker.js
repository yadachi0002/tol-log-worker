// worker.js
var worker_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    const url = new URL(request.url);

    console.log("REQUEST METHOD:", request.method);

    if (request.method === "OPTIONS") {
      console.log("CORS PREFLIGHT RECEIVED");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Export all logs as one JSON file
    if (request.method === "GET" && url.pathname === "/export-all-logs") {
      console.log("EXPORT ALL LOGS REQUESTED");

      const all = [];
      let cursor = undefined;

      do {
        const page = await env.LOGS.list({ cursor, limit: 1000 });

        for (const k of page.keys) {
          const rawValue = await env.LOGS.get(k.name);
          let parsedValue = rawValue;

          try {
            parsedValue = JSON.parse(rawValue);
          } catch (e) {
            // keep raw string if not valid JSON
          }

          all.push({
            key: k.name,
            value: parsedValue
          });
        }

        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);

      return new Response(JSON.stringify(all, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
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

    const key = `${data.sessionId || "no-session"}:${Date.now()}:${crypto.randomUUID()}`;

    await env.LOGS.put(
      key,
      JSON.stringify({
        at: Date.now(),
        data
      })
    );

    console.log("KV WRITE COMPLETE");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
};

export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
