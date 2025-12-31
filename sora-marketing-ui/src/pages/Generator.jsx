import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const FIXED_SIZE = "1024x1024";

function nowLabel() {
  const d = new Date();
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  const type = localStorage.getItem("token_type") || "bearer";
  return token ? { Authorization: `${type} ${token}` } : {};
}

function streamUrl(videoId) {
  return `${API_BASE}/videos/${videoId}/stream`;
}

async function getImageDimensions(file) {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dims = await new Promise((resolve, reject) => {
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = blobUrl;
    });
    return dims;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export default function Generator({ onLogout, user }) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(6);

  // assets (optional image)
  const [assetFile, setAssetFile] = useState(null);
  const [assetError, setAssetError] = useState("");

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const [history, setHistory] = useState([]);

  const charLimit = 1000;

  const canGenerate = useMemo(() => {
    return prompt.trim().length >= 10 && !loading;
  }, [prompt, loading]);

  function reset() {
    setPrompt("");
    setDuration(6);
    setAssetFile(null);
    setAssetError("");
    setLoading(false);
    setVideoUrl(null);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    onLogout();
  }

  async function onPickAsset(e) {
    const file = e.target.files?.[0] || null;
    setAssetError("");
    setAssetFile(null);

    if (!file) return;

    // basic type check
    if (!file.type.startsWith("image/")) {
      setAssetError("Please upload an image file (PNG/JPG/WebP).");
      return;
    }

    // Enforce "only little images" (<= 1024x1024 and square)
    try {
      const { width, height } = await getImageDimensions(file);

      if (width !== height) {
        setAssetError(`Image must be square. Yours is ${width}×${height}.`);
        return;
      }
      if (width > 1024 || height > 1024) {
        setAssetError(`Image must be 1024×1024 or smaller. Yours is ${width}×${height}.`);
        return;
      }

      setAssetFile(file);
    } catch {
      setAssetError("Couldn’t read that image. Try a different file.");
    }
  }

  async function generateVideo() {
    if (!canGenerate) return;

    setLoading(true);
    setVideoUrl(null);

    try {
      const fd = new FormData();
      fd.append("prompt", prompt.trim());
      fd.append("size", FIXED_SIZE); // force 1024x1024
      fd.append("seconds", String(duration));
      if (assetFile) fd.append("image", assetFile);

      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          // NOTE: do NOT set Content-Type for FormData; browser sets boundary
        },
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Generate failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      const id = data.id ?? data.video_id ?? data.videoId;

      if (!id) {
        throw new Error("Generate succeeded but no video id was returned.");
      }

      const url = streamUrl(id);
      setVideoUrl(url);

      setHistory((prev) => [
        {
          id,
          createdAt: nowLabel(),
          prompt: prompt.trim(),
          size: FIXED_SIZE,
          duration,
          url,
        },
        ...prev,
      ]);
    } catch (err) {
      alert(err?.message || "Something went wrong generating the video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      {/* TOP BAR */}
      <div className="topbar">
        <div>
          <h1>Marketing Video Generator</h1>
          <p className="muted">Prompt → generate → preview → stream</p>
        </div>

        <div className="userBar">
          <span className="muted">{user?.email}</span>
          <button className="btn btnSecondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="shell">
        {/* LEFT PANEL */}
        <div className="card">
          <div className="cardHeader">
            <div>
              <h2>Create video</h2>
              <div className="sub">Uses your backend /generate endpoint.</div>
            </div>

            {loading && (
              <span className="badge">
                <span className="spinner" /> Generating…
              </span>
            )}
          </div>

          <div className="cardBody">
            {/* PROMPT */}
            <div style={{ marginBottom: 14 }}>
              <div className="label">Marketing prompt</div>

              <textarea
                className="textarea"
                value={prompt}
                maxLength={charLimit}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: A modern skincare ad, clean white background, soft studio lighting, close-up product shots..."
              />

              <div className="promptMeta">
                <span className="fieldHint">
                  Tips: product, audience, setting, mood, camera style
                </span>
                <span className="charCount">
                  {prompt.length}/{charLimit}
                </span>
              </div>
            </div>

            {/* ASSET IMAGE */}
            <div style={{ marginBottom: 14 }}>
              <div className="label">
                Asset image (optional) <span className="muted">— max 1024×1024</span>
              </div>

              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={onPickAsset}
                disabled={loading}
              />

              {assetFile && (
                <div className="fieldHint">
                  Selected: <strong>{assetFile.name}</strong>
                </div>
              )}

              {assetError && (
                <div className="fieldHint warn">{assetError}</div>
              )}
            </div>

            {/* OPTIONS */}
            <div className="row">
              <div>
                <div className="label">Resolution</div>
                <select className="select" value={FIXED_SIZE} disabled>
                  <option value={FIXED_SIZE}>1024×1024 (fixed)</option>
                </select>
                <div className="fieldHint">
                  Forced to 1024×1024 so only small assets go through.
                </div>
              </div>

              <div>
                <div className="label">Duration (seconds)</div>
                <select
                  className="select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  disabled={loading}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="actions">
              <button
                className="btn btnPrimary"
                disabled={!canGenerate || !!assetError}
                onClick={generateVideo}
              >
                {loading ? "Generating…" : "Generate video"}
              </button>

              <button className="btn btnSecondary" onClick={reset} disabled={loading}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* PREVIEW */}
          <div className="card">
            <div className="cardHeader">
              <h2>Preview</h2>
            </div>

            <div className="cardBody">
              {!videoUrl && !loading && <p className="muted">No video yet.</p>}
              {loading && <p className="muted">Working on it…</p>}

              {videoUrl && (
                <>
                  <video className="video" controls src={videoUrl} />
                  <div className="actions" style={{ marginTop: 12 }}>
                    {/* Streaming URL;*/}
                    <a className="btn btnPrimary" href={videoUrl} target="_blank" rel="noreferrer">
                      Open stream
                    </a>
                    <button
                      className="btn btnSecondary"
                      onClick={() => navigator.clipboard.writeText(prompt.trim())}
                    >
                      Copy prompt
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* HISTORY */}
          <div className="card">
            <div className="cardHeader">
              <h2>History</h2>
              <div className="sub">{history.length ? "Recent videos" : "No videos yet"}</div>
            </div>

            <div className="cardBody">
              {!history.length && (
                <p className="muted">Generated videos will appear here.</p>
              )}

              {!!history.length && (
                <div className="list">
                  {history.slice(0, 5).map((h) => (
                    <div className="item" key={h.id}>
                      <div className="itemTop">
                        <p className="itemTitle">{h.createdAt}</p>
                        <a
                          className="smallLink"
                          href={h.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Stream
                        </a>
                      </div>

                      <p className="itemMeta">
                        {h.prompt.length > 120 ? h.prompt.slice(0, 120) + "…" : h.prompt}
                      </p>

                      <div className="itemMeta">
                        {h.size} · {h.duration}s
                      </div>

                      <a
                        className="smallLink"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrompt(h.prompt);
                          setDuration(h.duration);
                          setVideoUrl(h.url);
                        }}
                      >
                        Preview this
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
