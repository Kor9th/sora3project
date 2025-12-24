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

export default function Generator() {
  const MAX_CHARS = 1000;

  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [history, setHistory] = useState([]);

  const charCount = prompt.length;
  const warn = charCount > MAX_CHARS * 0.85;

  const canGenerate = useMemo(
    () => prompt.trim().length >= 10 && !loading,
    [prompt, loading]
  );

  function reset() {
    setPrompt("");
    setDuration(5);
    setAspectRatio("16:9");
    setLoading(false);
    setVideoUrl(null);
  }

  function generateFake() {
    setLoading(true);
    setVideoUrl(null);

    setTimeout(() => {
      const url = "https://www.w3schools.com/html/mov_bbb.mp4"; // placeholder, replace this later
      setVideoUrl(url);
      setLoading(false);

      setHistory((prev) => [
        { id: crypto.randomUUID(), createdAt: nowLabel(), prompt: prompt.trim(), url },
        ...prev,
      ]);
    }, 1800);
  }

  return (
    <div className="container">
      {/* Top bar */}
      <div className="topbar">
        <div className="brand">
          <div>
            <h1>Sora Marketing Studio</h1>
            <p>Prompt → generate → preview → download</p>
          </div>
        </div>

        <a className="smallLink" href="#" onClick={(e) => e.preventDefault()}>
          Settings
        </a>
      </div>

      <div className="shell">
        {/* LEFT: Generator */}
        <div className="card">
          <div className="cardHeader">
            <div>
              <h2>Generator</h2>
              <div className="sub">Write a prompt and choose output settings.</div>
            </div>

            {loading && (
              <span className="badge">
                <span className="spinner" />
                Generating…
              </span>
            )}
          </div>

          <div className="cardBody">
            {/* Prompt */}
            <div>
              <div className="label">Marketing prompt</div>
              <textarea
                className="textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Ex: A bright, modern skincare ad with soft studio lighting, clean white background, close-up product shots, and an upbeat tone."
              />

              <div className="promptMeta">
                <span className={warn ? "hint warn" : "hint"}>
                  Tips: include product, audience, setting, mood, camera style.
                </span>
                <span className={warn ? "counter warn" : "counter"}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Settings */}
            <div className="row">
              <div>
                <div className="label">Aspect ratio</div>
                <select
                  className="select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <option value="16:9">16:9 (landscape)</option>
                  <option value="9:16">9:16 (vertical)</option>
                  <option value="1:1">1:1 (square)</option>
                </select>
              </div>

              <div>
                <div className="label">Duration (seconds)</div>
                <select
                  className="select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="actions">
              <button
                className="btn btnPrimary"
                disabled={!canGenerate}
                onClick={generateFake}
              >
                {loading ? "Generating..." : "Generate video"}
              </button>
              <button className="btn btnSecondary" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview + History */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Preview */}
          <div className="card">
            <div className="cardHeader">
              <h2>Preview</h2>
            </div>

            <div className="cardBody">
              {!videoUrl && !loading && (
                <p className="muted">No video yet. Generate to preview here.</p>
              )}
              {loading && <p className="muted">Working on it…</p>}

              {videoUrl && (
                <>
                  <video className="video" controls src={videoUrl} />
                  <div className="actions" style={{ marginTop: 12 }}>
                    <a className="btn btnPrimary" href={videoUrl} download>
                      Download
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

          {/* History */}
          <div className="card">
            <div className="cardHeader">
              <h2>History</h2>
              <div className="sub">{history.length ? "Recent runs" : "No runs yet"}</div>
            </div>

            <div className="cardBody">
              {!history.length && (
                <p className="muted">Your generated videos will appear here.</p>
              )}

              {!!history.length && (
                <div className="list">
                  {history.slice(0, 5).map((h) => (
                    <div className="item" key={h.id}>
                      <div className="itemTop">
                        <p className="itemTitle">{h.createdAt}</p>
                        <a className="smallLink" href={h.url} download>
                          Download
                        </a>
                      </div>

                      <p className="itemMeta">
                        {h.prompt.length > 120
                          ? h.prompt.slice(0, 120) + "…"
                          : h.prompt}
                      </p>

                      <a
                        className="smallLink"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrompt(h.prompt.slice(0, MAX_CHARS));
                        }}
                      >
                        Use this prompt
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
