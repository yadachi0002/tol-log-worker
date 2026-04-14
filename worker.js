// worker.js
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows, headers) {
  const lines = [];
  lines.push(headers.join(","));

  for (const row of rows) {
    lines.push(
      headers.map(h => csvEscape(row[h])).join(",")
    );
  }

  return lines.join("\n");
}
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

if (request.method === "GET" && url.pathname === "/export-all-logs") {
  const studyDayFilter = url.searchParams.get("study_day");
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*"
  }; 

  const all = [];
  let cursor = undefined;

  // 1. Collect all logs from KV
  do {
    const page = await env.LOGS.list({ cursor, limit: 1000 });

    for (const k of page.keys) {
      const raw = await env.LOGS.get(k.name);
      if (!raw) continue;

      try {
        // raw is JSON string like: { at, data }
        const parsed = JSON.parse(raw);
        all.push(parsed);
      } catch {
        // skip malformed records
      }
    }

    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

 // 2. Sort chronologically (oldest -> newest)
  all.sort((a, b) => a.at - b.at);

  // 3. Flatten rows into CSV (one row per criterion if present)
const rows = [];

for (const entry of all) {
  const d = entry.data || {};

  // ✅ Filter by study day if provided
  if (studyDayFilter && d.study_day !== studyDayFilter) {
    continue;
  }

const baseRow = {
  session_id: d.sessionId ?? "",
  study_day: d.study_day ?? "",
  event: d.event ?? "",
  audio_id: d.audio_id ?? "",
  attempt: d.attempt ?? "",
  at: entry.at ?? "",
  timestamp: d.timestamp ?? "",
  section: d.section ?? "",
  button_id: d.buttonId ?? "",
  label: d.label ?? "",
  ms_spent: d.ms_spent ?? "",
  question: d.question ?? "",
  correct: d.correct ?? "",
  answer_raw: d.answer_raw ?? "",
  verdict: d.verdict ?? "",
  perhaps_you_meant: d.perhaps_you_meant ?? ""
};

  // ✅ If this event has criteria_feedback, expand rows
  if (Array.isArray(d.criteria_feedback) && d.criteria_feedback.length > 0) {
    for (const c of d.criteria_feedback) {
      rows.push({
        ...baseRow,
        criterion: c.criterion ?? "",
        met: c.met ?? "",
        comment: c.comment ?? "",
        next_step: d.next_step ?? ""
      });
    }
  } else {
    // ✅ Non-feedback or feedback without criteria
    rows.push({
      ...baseRow,
      criterion: "",
      met: "",
      comment: "",
      next_step: d.next_step ?? ""
    });
  }
}

  // 4. Define CSV column order
  const headers = [
  "session_id",
  "study_day",
  "event",
  "audio_id",
  "attempt",
  "at",
  "timestamp",
  "section",
  "button_id",
  "label",
  "ms_spent",
  "question",
  "correct",
  "answer_raw",
  "verdict",
  "perhaps_you_meant",
  "criterion",
  "met",
  "comment",
  "next_step"
];

  // 5. Convert to CSV
  const csv = toCSV(rows, headers);

  // 6. Return CSV file
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=logs.csv",
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
