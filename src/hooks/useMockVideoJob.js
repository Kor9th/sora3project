import { useState } from "react";

export default function useMockVideoJob() {
  const [status, setStatus] = useState("idle"); // idle | queued | running | succeeded | failed
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    setVideoUrl(null);
    setStatus("queued");

    await new Promise((r) => setTimeout(r, 800));
    setStatus("running");

    await new Promise((r) => setTimeout(r, 1800));
    // Demo video URL (placeholder)
    setVideoUrl("https://www.w3schools.com/html/mov_bbb.mp4");
    setStatus("succeeded");
  }

  function reset() {
    setStatus("idle");
    setVideoUrl(null);
    setError("");
  }

  return { status, videoUrl, error, generate, reset };
}
