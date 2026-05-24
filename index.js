// index.js
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple in‑memory rate limiter (per IP)
const requests = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

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
    return res.status(429).send("Too many requests, try again later.");
  }

  history.push(now);

  const text = req.body;
  if (!text || Buffer.byteLength(text, "utf8") > 1200) {
    return res.status(400).send("Text exceeds 1.2KB limit or is empty.");
  }

  const filename = `entry_${Date.now()}.txt`;

  const { error } = await supabase.storage
    .from("texts")
    .upload(filename, text, { contentType: "text/plain" });

  if (error) {
    console.error(error);
    return res.status(500).send("Error uploading to storage");
  }

  return res.status(200).send(`Stored as ${filename}`);
}
