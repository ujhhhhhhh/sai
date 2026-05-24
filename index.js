import express from "express";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import serverless from "serverless-http";

const app = express();
app.use(express.text({ limit: "2kb" }));

// Rate limiter: 10 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many requests, try again later."
});
app.use(limiter);

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/store", async (req, res) => {
  try {
    const text = req.body;

    if (Buffer.byteLength(text, "utf8") > 1200) {
      return res.status(400).send("Text exceeds 1.2KB limit");
    }

    const filename = `entry_${Date.now()}.txt`;

    const { error } = await supabase.storage
      .from("texts")
      .upload(filename, text, { contentType: "text/plain" });

    if (error) {
      console.error(error);
      return res.status(500).send("Error uploading to storage");
    }

    res.send(`Stored as ${filename}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Export as a serverless function
export default serverless(app);
