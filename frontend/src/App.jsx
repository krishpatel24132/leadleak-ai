
import { useState } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    let websiteUrl = url.trim();

    if (!websiteUrl) {
      setMessage("Please enter a website URL.");
      return;
    }

    if (!/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    try {
      const parsed = new URL(websiteUrl);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid URL");
      }

      setMessage(
        "Your audit workspace is coming soon. Stay tuned!"
      );
    } catch {
      setMessage("Please enter a valid website URL.");
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#" className="logo">
          <span className="logo-icon">L</span>
          LeadLeak<span>AI</span>
        </a>

        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>

        <a href="#audit" className="nav-button">
          Try free →
        </a>
      </nav>

      <main>
        <section className="hero">
          <div className="badge">
            <span></span>
            AI-powered website conversion insights
          </div>

          <h1>
            Find what's costing websites
            <span> customers.</span>
          </h1>

          <p className="hero-text">
            Turn any prospect's website into an actionable
            conversion audit. Discover missed opportunities
            and show businesses exactly what they can improve.
          </p>

          <form id="audit" className="url-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Enter a website URL (example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <button type="submit">
              Analyse website →
            </button>
          </form>

          {message && <p className="form-message">{message}</p>}

          <p className="free-note">
            3 free reports · No credit card required
          </p>

          <div className="report-card">
            <div className="report-header">
              <div>
                <span className="report-label">SAMPLE AUDIT</span>
                <h3>Website Conversion Report</h3>
              </div>

              <div className="score">
                68<span>/100</span>
              </div>
            </div>

            <div className="progress">
              <div></div>
            </div>

            <div className="finding">
              <span className="finding-icon red">!</span>
              <div>
                <strong>Weak primary call-to-action</strong>
                <p>Make the next step clearer for potential customers.</p>
              </div>
              <span className="priority high">HIGH</span>
            </div>

            <div className="finding">
              <span className="finding-icon yellow">!</span>
              <div>
                <strong>Limited trust signals</strong>
                <p>Display reviews, testimonials and customer proof.</p>
              </div>
              <span className="priority medium">MEDIUM</span>
            </div>

            <div className="finding">
              <span className="finding-icon green">✓</span>
              <div>
                <strong>Contact information visible</strong>
                <p>Visitors can find a way to contact the business.</p>
              </div>
              <span className="priority good">GOOD</span>
            </div>

            <p className="sample-note">
              Illustrative sample — not a real website analysis.
            </p>
          </div>
        </section>

        <section id="how" className="section">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Three steps. Better insights.</h2>
          <p className="section-subtitle">
            Make website research easier and more useful.
          </p>

          <div className="three-grid">
            <article className="info-card">
              <span className="number">01</span>
              <h3>Enter a website</h3>
              <p>Submit the public homepage of a potential client.</p>
            </article>

            <article className="info-card">
              <span className="number">02</span>
              <h3>AI reviews the page</h3>
              <p>Identify visible conversion issues and opportunities.</p>
            </article>

            <article className="info-card">
              <span className="number">03</span>
              <h3>Get your report</h3>
              <p>Receive prioritised findings and practical recommendations.</p>
            </article>
          </div>
        </section>

        <section id="features" className="section features">
          <span className="eyebrow">WHY LEADLEAK AI</span>
          <h2>Insights you can actually use.</h2>

          <div className="three-grid">
            <article className="info-card">
              <h3>Conversion opportunities</h3>
              <p>Spot unclear messaging, weak calls-to-action and contact friction.</p>
            </article>

            <article className="info-card">
              <h3>Prioritised recommendations</h3>
              <p>Understand which improvements deserve attention first.</p>
            </article>

            <article className="info-card">
              <h3>Client-friendly reports</h3>
              <p>Turn website observations into useful prospect conversations.</p>
            </article>
          </div>
        </section>

        <section id="pricing" className="section pricing">
          <span className="eyebrow">SIMPLE PRICING</span>
          <h2>Start free. Upgrade when ready.</h2>

          <div className="price-card">
            <span className="plan-label">STARTER</span>
            <h3>$9<span>/month</span></h3>
            <p>For freelancers and independent web designers.</p>

            <ul>
              <li>30 website reports per month</li>
              <li>Prioritised conversion findings</li>
              <li>Actionable recommendations</li>
              <li>Report history</li>
            </ul>

            <a href="#audit" className="price-button">
              Get started →
            </a>

            <p className="price-note">
              Planned pricing. Payments are not enabled yet.
            </p>
          </div>
        </section>

        <section className="final-cta">
          <h2>Make every prospect conversation count.</h2>
          <p>
            Discover the opportunities hiding in your next prospect's website.
          </p>
          <a href="#audit" className="nav-button">
            Try LeadLeak AI →
          </a>
        </section>
      </main>

      <footer>
        <a href="#" className="logo">
          <span className="logo-icon">L</span>
          LeadLeak<span>AI</span>
        </a>

        <p>Website conversion insights for web professionals.</p>

        <span>© {new Date().getFullYear()} LeadLeak AI</span>
      </footer>
    </div>
  );
}

export default App;
