import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple in‑memory rate limiter (per IP)
const requests = new Map();

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain");
    res.end("Method Not Allowed");
    return;
  }

  // Identify IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();

  // Clean old entries
  if (requests.has(ip)) {
    requests.set(ip, requests.get(ip).filter(ts => now - ts < 10 * 60 * 1000));
  } else {
    requests.set(ip, []);
  }

  const history = requests.get(ip);
  if (history.length >= 10) {
    res.statusCode = 429;
    res.setHeader("Content-Type", "text/plain");
    res.end("Too many requests, try again later.");
    return;
  }

  history.push(now);

  // Collect body
  let body = "";
  req.on("data", chunk => {
    body += chunk;
  });

  req.on("end", async () => {
    if (!body || Buffer.byteLength(body, "utf8") > 1200) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Text exceeds 1.2KB limit or is empty.");
      return;
    }

    const filename = `entry_${Date.now()}.txt`;

    const { error } = await supabase.storage
      .from("texts")
      .upload(filename, body, { contentType: "text/plain" });

    if (error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end("Error uploading to storage");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end(`Stored as ${filename}`);
  });
}
