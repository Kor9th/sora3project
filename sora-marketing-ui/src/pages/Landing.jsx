export default function Landing({ onStart }) {
  return (
    <div className="landingSplit">
      {/* LEFT SIDE */}
      <div className="splitSide splitLeft">
        <div className="splitContent">
          <div className="landingBrand">Marketing Video Generator</div>

          <h1>Create Marketing Videos in Seconds</h1>

          <p className="muted">
            Generate short marketing videos using AI. Add assets, choose
            resolution, preview instantly.
          </p>

          <div className="actions">
            <button className="btn btnPrimary" onClick={onStart}>
              Get started
            </button>
            <a className="btn btnSecondary" href="#features">
              See features
            </a>
          </div>

          <div className="landingBadges">
            <span className="pill">Fast</span>
            <span className="pill">Asset-friendly</span>
            <span className="pill">Stream preview</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="splitSide splitRight">
        <div className="splitContent rightContent">
          <div className="miniCardTitle">How it works</div>

          <ol className="steps">
            <li>Write a marketing prompt</li>
            <li>Add an image asset (optional)</li>
            <li>Choose resolution & duration</li>
            <li>Generate, preview, stream</li>
          </ol>

          <div className="miniHint">
            Tip: Start with 1024×1024 to keep assets consistent.
          </div>
        </div>
      </div>
    </div>
  );
}
