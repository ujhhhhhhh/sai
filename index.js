// server.js
import express from "express";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.text({ limit: "2kb" })); // enforce ~2KB body size

// Rate limiter: 10 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,                  // limit each IP to 10 requests per windowMs
  message: "Too many requests, try again later."
});
app.use(limiter);

// Supabase client (use your Vercel env vars)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // use service role for storage writes
);

app.post("/store", async (req, res) => {
  try {
    const text = req.body;

    // Enforce max 1.2KB text
    if (Buffer.byteLength(text, "utf8") > 1200) {
      return res.status(400).send("Text exceeds 1.2KB limit");
    }

    // Generate unique filename
    const filename = `entry_${Date.now()}.txt`;

    // Upload to Supabase Storage bucket "texts"
    const { error } = await supabase.storage
      .from("texts")
      .upload(filename, text, {
        contentType: "text/plain"
      });

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
