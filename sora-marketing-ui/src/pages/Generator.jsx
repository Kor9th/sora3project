import { useMemo, useState } from "react";

function nowLabel() {
  const d = new Date();
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Generator({ onLogout, user }) {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [duration, setDuration] = useState(6);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const charLimit = 1000;

  const canGenerate = useMemo(
    () => prompt.trim().length >= 10 && !loading,
    [prompt, loading]
  );

  function reset() {
    setPrompt("");
    setResolution("1920x1080");
    setDuration(6);
    setLoading(false);
    setVideoUrl(null);
    setStatusMessage("");
  }

  async function pollVideoStatus(videoId, token) {
    const maxAttempts = 180; // 180 * 2 seconds = 6 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusRes = await fetch(`http://127.0.0.1:8000/videos/${videoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (statusRes.status === 401) {
          throw new Error("Unauthorized: Please log in again.");
        }

        if (!statusRes.ok) {
          throw new Error(`Status check failed (${statusRes.status})`);
        }

        const statusData = await statusRes.json();
        const status = statusData.status?.toLowerCase();

        if (status === "completed") {
          return { success: true, data: statusData };
        } else if (status === "failed") {
          return { success: false, error: "Video generation failed" };
        } else {
          // Still processing - update status message
          setStatusMessage(`Status: ${status}...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
        }
      } catch (err) {
        console.error("Error polling status:", err);
        if (err.message.includes("Unauthorized")) {
          return { success: false, error: "Unauthorized" };
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      formData.append("size_str", resolution);      // backend expects size_str
      formData.append("sec", String(duration));     // backend expects sec

      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // IMPORTANT: do not set Content-Type for FormData
        },
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Generation failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      const id = data.id ?? data.video_id ?? data.videoId;

      if (!id) {
        throw new Error("Generate succeeded but backend did not return a video id.");
      }

      setStatusMessage("Video generation started. Waiting for completion...");

      // Poll for video completion
      const pollResult = await pollVideoStatus(id, token);

      if (!pollResult.success) {
        if (pollResult.error === "Unauthorized") {
          logout();
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(pollResult.error || "Video generation failed");
      }

      setStatusMessage("Video ready! Downloading...");

      // Fetch video with authentication and create blob URL
      const streamEndpoint = `http://127.0.0.1:8000/videos/${id}/stream`;
      const videoRes = await fetch(streamEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!videoRes.ok) {
        throw new Error(`Failed to fetch video stream (${videoRes.status})`);
      }

      console.log('Video response headers:', videoRes.headers.get('content-type'));
      const videoBlob = await videoRes.blob();
      console.log('Video blob size:', videoBlob.size, 'type:', videoBlob.type);
      
      if (videoBlob.size === 0) {
        throw new Error("Received empty video file");
      }

      const blobUrl = URL.createObjectURL(videoBlob);
      console.log('Created blob URL:', blobUrl);
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
          streamEndpoint, // Keep endpoint for re-fetching if needed
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

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    onLogout();
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
              <div className="sub">
                Describe the marketing video you want to generate.
              </div>
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
                placeholder="Example: A modern skincare ad, clean white background, soft studio lighting, close-up product shots, minimal motion graphics, calm luxury vibe."
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

            {/* OPTIONS */}
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
                </select>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="actions">
              <button
                className="btn btnPrimary"
                disabled={!canGenerate}
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
              {loading && (
                <div>
                  <p className="muted">Working on it…</p>
                  {statusMessage && <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>{statusMessage}</p>}
                </div>
              )}

              {videoUrl && (
                <>
                  <video 
                    className="video" 
                    controls 
                    src={videoUrl}
                    onError={(e) => {
                      console.error('Video error:', e);
                      console.error('Video error code:', e.target.error?.code);
                      console.error('Video error message:', e.target.error?.message);
                      alert('Failed to load video. Error code: ' + (e.target.error?.code || 'unknown'));
                    }}
                    onLoadedData={() => {
                      console.log('Video loaded successfully');
                    }}
                  />
                  <div className="actions" style={{ marginTop: 12 }}>
                    <button
                      className="btn btnPrimary"
                      onClick={() => {
                        // Download video with proper filename
                        const a = document.createElement('a');
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

          {/* HISTORY */}
          <div className="card">
            <div className="cardHeader">
              <h2>History</h2>
              <div className="sub">
                {history.length ? "Recent videos" : "No videos yet"}
              </div>
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
                        <button
                          className="smallLink"
                          onClick={async () => {
                            // Download this video
                            const a = document.createElement('a');
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
                      </div>

                      <a
                        className="smallLink"
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          setPrompt(h.prompt);
                          setResolution(h.resolution);
                          setDuration(h.duration);
                          
                          // Re-fetch video with auth if streamEndpoint is available
                          if (h.streamEndpoint) {
                            try {
                              const token = localStorage.getItem("access_token");
                              const videoRes = await fetch(h.streamEndpoint, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              });
                              if (videoRes.ok) {
                                const videoBlob = await videoRes.blob();
                                const blobUrl = URL.createObjectURL(videoBlob);
                                setVideoUrl(blobUrl);
                                return;
                              }
                            } catch (err) {
                              console.error("Failed to re-fetch video:", err);
                            }
                          }
                          
                          // Fallback to existing URL
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
