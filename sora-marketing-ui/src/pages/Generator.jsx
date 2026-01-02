import { useEffect, useMemo, useRef, useState } from "react";

function nowLabel() {
  const d = new Date();
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 

export default function Generator({ onLogout, user }) {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [duration, setDuration] = useState(10);

  const [assets, setAssets] = useState([]);
  const [assetPreviews, setAssetPreviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const fileInputRef = useRef(null);
  const charLimit = 1000;

  const canGenerate = useMemo(
    () => prompt.trim().length >= 10 && !loading,
    [prompt, loading]
  );

  useEffect(() => {
    const urls = assets.map((f) => URL.createObjectURL(f));
    setAssetPreviews(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [assets]);

  function reset() {
    setPrompt("");
    setResolution("1920x1080");
    setDuration(10);
    setAssets([]);
    setLoading(false);
    setVideoUrl(null);
    setStatusMessage("");
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    if (typeof onLogout === "function") onLogout();
  }

  function onPickAssets() {
    fileInputRef.current?.click();
  }

  function onAssetsSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setAssets((prev) => {
      const next = [...prev];
      for (const f of files) {
        const exists = next.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
        );
        if (!exists) next.push(f);
      }
      return next;
    });

    e.target.value = "";
  }

  function removeAsset(idx) {
    setAssets((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAssets() {
    setAssets([]);
  }

  async function pollVideoStatus(videoId, token) {
    const maxAttempts = 180;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusRes = await fetch(`http://127.0.0.1:8000/videos/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statusRes.status === 401) return { success: false, error: "Unauthorized" };
        if (!statusRes.ok) throw new Error("Status check failed");

        const statusData = await statusRes.json();
        const status = (statusData.status || "").toLowerCase();

        if (status === "completed") return { success: true, data: statusData };
        if (status === "failed") return { success: false, error: "Video generation failed" };

        setStatusMessage(`Status: ${status || "processing"}...`);
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }
    }

    return { success: false, error: "Video generation timed out" };
  }

  async function generateVideo() {
    setLoading(true);
    setVideoUrl(null);
    setStatusMessage("Submitting request...");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found. Please log in again.");

      const formData = new FormData();
      formData.append("prompt", prompt.trim());
      formData.append("size_str", resolution);
      formData.append("sec", String(duration));

      assets.forEach((file) => {
        formData.append("assets", file);
      });

      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Generation failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      const id = data.id ?? data.video_id ?? data.videoId;

      if (!id) throw new Error("Generate succeeded but backend did not return a video id.");

      setStatusMessage("Video generation started. Waiting for completion...");

      const pollResult = await pollVideoStatus(id, token);
      if (!pollResult.success) {
        if (pollResult.error === "Unauthorized") {
          logout();
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(pollResult.error || "Video generation failed");
      }

      setStatusMessage("Video ready! Downloading...");

      const streamEndpoint = `http://127.0.0.1:8000/videos/${id}/stream`;
      const videoRes = await fetch(streamEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!videoRes.ok) throw new Error(`Failed to fetch video stream (${videoRes.status})`);

      const videoBlob = await videoRes.blob();
      if (videoBlob.size === 0) throw new Error("Received empty video file");

      const blobUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(blobUrl);
      setStatusMessage("");

      setHistory((prev) => [
        {
          id,
          createdAt: nowLabel(),
          prompt: prompt.trim(),
          resolution,
          duration,
          url: blobUrl,
          streamEndpoint,
          assetNames: assets.map((a) => a.name),
          assetCount: assets.length,
        },
        ...prev,
      ]);
    } catch (err) {
      setStatusMessage("");
      alert(err?.message || "Something went wrong generating the video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Marketing Video Generator</h1>
          <p className="muted">Prompt → assets → generate → preview</p>
        </div>

        <div className="userBar">
          <span className="muted">{user?.email}</span>
          <button className="btn btnSecondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="shell">
        <div className="card">
          <div className="cardHeader">
            <div>
              <h2>Create video</h2>
              <div className="sub">Add optional images as assets for context.</div>
            </div>

            {loading && (
              <span className="badge">
                <span className="spinner" /> Generating…
              </span>
            )}
          </div>

          <div className="cardBody">
            <div style={{ marginBottom: 14 }}>
              <div className="label">Marketing prompt</div>

              <textarea
                className="textarea"
                value={prompt}
                maxLength={charLimit}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: A modern skincare ad, clean white background, soft studio lighting, close-up product shots, minimal motion graphics, calm luxury vibe."
                disabled={loading}
              />

              <div className="promptMeta">
                <span className="fieldHint">Tips: product, audience, setting, mood, camera style</span>
                <span className="charCount">
                  {prompt.length}/{charLimit}
                </span>
              </div>
            </div>

            <div className="row">
              <div>
                <div className="label">Resolution</div>
                <select
                  className="select"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={loading}
                >
                  <option value="1920x1080">1920×1080 (Full HD)</option>
                  <option value="1280x720">1280×720 (HD)</option>
                  <option value="1080x1920">1080×1920 (Vertical / Shorts)</option>
                  <option value="1024x1024">1024×1024 (Square)</option>
                </select>
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
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="label">Assets (optional)</div>

              <div className="actions" style={{ gap: 10 }}>
                <button className="btn btnSecondary" onClick={onPickAssets} disabled={loading}>
                  Add assets
                </button>

                <button
                  className="btn btnSecondary"
                  onClick={clearAssets}
                  disabled={loading || assets.length === 0}
                >
                  Clear
                </button>

                <span className="muted" style={{ alignSelf: "center" }}>
                  {assets.length ? `${assets.length} selected` : "None selected"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={onAssetsSelected}
              />

              {assets.length > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {assetPreviews.map((src, i) => (
                      <div
                        key={src}
                        style={{
                          width: 120,
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <img
                          src={src}
                          alt={assets[i]?.name || "asset"}
                          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                        />
                        <div style={{ padding: 8, display: "grid", gap: 6 }}>
                          <div className="muted" style={{ fontSize: 12, lineHeight: 1.2 }}>
                            {(assets[i]?.name || "").slice(0, 22)}
                            {(assets[i]?.name || "").length > 22 ? "…" : ""}
                          </div>
                          <button className="smallLink" onClick={() => removeAsset(i)} disabled={loading}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn btnPrimary" disabled={!canGenerate} onClick={generateVideo}>
                {loading ? "Generating…" : "Generate video"}
              </button>

              <button className="btn btnSecondary" onClick={reset} disabled={loading}>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <div className="cardHeader">
              <h2>Preview</h2>
            </div>

            <div className="cardBody">
              {!videoUrl && !loading && <p className="muted">No video yet.</p>}

              {loading && (
                <div>
                  <p className="muted">Working on it…</p>
                  {statusMessage && (
                    <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                      {statusMessage}
                    </p>
                  )}
                </div>
              )}

              {videoUrl && (
                <>
                  <video className="video" controls src={videoUrl} />
                  <div className="actions" style={{ marginTop: 12 }}>
                    <button
                      className="btn btnPrimary"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = videoUrl;
                        a.download = `video-${Date.now()}.mp4`;
                        a.click();
                      }}
                    >
                      Download video
                    </button>
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

          <div className="card">
            <div className="cardHeader">
              <h2>History</h2>
              <div className="sub">{history.length ? "Recent videos" : "No videos yet"}</div>
            </div>

            <div className="cardBody">
              {!history.length && <p className="muted">Generated videos will appear here.</p>}

              {!!history.length && (
                <div className="list">
                  {history.slice(0, 5).map((h) => (
                    <div className="item" key={h.id}>
                      <div className="itemTop">
                        <p className="itemTitle">{h.createdAt}</p>
                        <button
                          className="smallLink"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = h.url;
                            a.download = `video-${h.id}.mp4`;
                            a.click();
                          }}
                        >
                          Download
                        </button>
                      </div>

                      <p className="itemMeta">
                        {h.prompt.length > 120 ? h.prompt.slice(0, 120) + "…" : h.prompt}
                      </p>

                      <div className="itemMeta">
                        {h.resolution} · {h.duration}s
                        {typeof h.assetCount === "number" ? ` · ${h.assetCount} asset(s)` : ""}
                      </div>

                      <a
                        className="smallLink"
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          setPrompt(h.prompt);
                          setResolution(h.resolution);
                          setDuration(h.duration);

                          if (h.streamEndpoint) {
                            try {
                              const token = localStorage.getItem("access_token");
                              const videoRes = await fetch(h.streamEndpoint, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (videoRes.ok) {
                                const videoBlob = await videoRes.blob();
                                const blobUrl = URL.createObjectURL(videoBlob);
                                setVideoUrl(blobUrl);
                                return;
                              }
                            } catch {}
                          }

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