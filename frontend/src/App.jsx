import { useEffect, useState } from "react";

import { jsPDF } from "jspdf";

import AuthPanel from "./AuthPanel.jsx";



const API_URL = "http://localhost:5000/api/analyze";



const sampleAudit = {

  score: 62,

  summary:

    "This sample report shows how LeadLeak AI highlights website improvements that may help a business build trust and convert more visitors.",

  findings: [

    {

      title: "Limited trust signals",

      description: "Display reviews, testimonials and customer proof.",

      priority: "MEDIUM",

      recommendation:

        "Add genuine customer reviews, testimonials, certifications or other proof that helps visitors trust the business.",

    },

    {

      title: "Contact information visible",

      description: "Visitors can find a way to contact the business.",

      priority: "GOOD",

      recommendation:

        "Keep contact details easy to find and provide a clear next step for potential customers.",

    },

  ],

  strengths: [

    "The website provides a starting point for visitors to learn about the business.",

  ],

  quickWins: [

    "Make the main call to action more prominent.",

    "Ensure contact details are easy to find.",

  ],

};



function getPriorityClass(priority) {

  return String(priority || "MEDIUM").toLowerCase();

}



export default function App() {

  const [token, setToken] = useState(

    () => localStorage.getItem("leadleak-token") || "",

  );



  const [user, setUser] = useState(() => {

    try {

      return JSON.parse(localStorage.getItem("leadleak-user") || "null");

    } catch {

      return null;

    }

  });



  const [authChecking, setAuthChecking] = useState(true);

  const [websiteUrl, setWebsiteUrl] = useState("");

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [showSample, setShowSample] = useState(false);



  // Audit History (loaded from the logged-in user's database records)

  const [history, setHistory] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(false);



  // History Search and Sorting

  const [historySearch, setHistorySearch] = useState("");

  const [historySort, setHistorySort] = useState("newest");



  // Verify the saved session whenever the token changes.

  useEffect(() => {

    let active = true;



    async function verifyLogin() {

      if (!token) {

        if (active) {

          setUser(null);

          setHistory([]);

          setAuthChecking(false);

        }

        return;

      }



      setAuthChecking(true);



      try {

        const response = await fetch("http://localhost:5000/api/auth/me", {

          headers: { Authorization: `Bearer ${token}` },

        });

        const data = await response.json();



        if (!response.ok || !data.success || !data.user) {

          throw new Error(data.message || "Session expired.");

        }



        if (active) {

          setUser(data.user);

          localStorage.setItem("leadleak-user", JSON.stringify(data.user));

        }

      } catch (authError) {

        if (active) {

          localStorage.removeItem("leadleak-token");

          localStorage.removeItem("leadleak-user");

          setToken("");

          setUser(null);

          setHistory([]);

        }

      } finally {

        if (active) setAuthChecking(false);

      }

    }



    verifyLogin();



    return () => {

      active = false;

    };

  }, [token]);



  // Load this user's saved audits from MongoDB.

  useEffect(() => {

    let active = true;



    async function loadHistory() {

      if (!token || !user) {

        setHistory([]);

        return;

      }



      setHistoryLoading(true);



      try {

        const response = await fetch("http://localhost:5000/api/audits", {

          headers: { Authorization: `Bearer ${token}` },

        });

        const data = await response.json();



        if (!response.ok || !data.success) {

          throw new Error(data.message || "Could not load saved reports.");

        }



        if (active) {

          const savedAudits = Array.isArray(data.audits) ? data.audits : [];

          setHistory(savedAudits.map((item) => ({

            id: item._id,

            website: item.website,

            audit: item.audit,

            createdAt: item.createdAt,

          })));

        }

      } catch (historyError) {

        if (active) setError(historyError.message);

      } finally {

        if (active) setHistoryLoading(false);

      }

    }



    loadHistory();



    return () => {

      active = false;

    };

  }, [token, user]);



  function handleAuthSuccess(newToken, newUser) {

    localStorage.setItem("leadleak-token", newToken);

    localStorage.setItem("leadleak-user", JSON.stringify(newUser));

    setToken(newToken);

    setUser(newUser);

    setError("");

    setHistory([]);

  }



  function handleLogout() {

    localStorage.removeItem("leadleak-token");

    localStorage.removeItem("leadleak-user");

    setToken("");

    setUser(null);

    setHistory([]);

    setResult(null);

    setShowSample(false);

    setWebsiteUrl("");

    setError("");

  }



  // Filter and sort history

  const filteredHistory = history

    .filter((item) =>

      String(item.website || "")

        .toLowerCase()

        .includes(historySearch.trim().toLowerCase()),

    )

    .sort((a, b) => {

      switch (historySort) {

        case "oldest":

          return (

            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

          );



        case "highest":

          return (b.audit?.score || 0) - (a.audit?.score || 0);



        case "lowest":

          return (a.audit?.score || 0) - (b.audit?.score || 0);



        case "newest":

        default:

          return (

            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

          );

      }

    });



  // Analyze Website

  async function handleAnalyze(event) {

    event.preventDefault();



    setError("");

    setResult(null);

    setShowSample(false);



    const trimmedUrl = websiteUrl.trim();



    if (!trimmedUrl) {

      setError("Please enter a website URL.");

      return;

    }



    if (!/^https?:\/\//i.test(trimmedUrl)) {

      setError(

        "Please include https:// or http:// before the website address.",

      );

      return;

    }



    setLoading(true);



    try {

      const response = await fetch(API_URL, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({ url: trimmedUrl }),

      });



      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Unable to analyze this website.");

      }



      if (!data.audit || typeof data.audit.score !== "number" || !data.auditId) {

        throw new Error("The server returned an unexpected report format.");

      }



      setResult(data);



      // Save successful audit

      setHistory((previous) => {

        const newReport = {

          id: data.auditId,

          website: data.website || trimmedUrl,

          audit: data.audit,

          createdAt: new Date().toISOString(),

        };



        return [newReport, ...previous].slice(0, 20);

      });

    } catch (err) {

      setError(

        err.message ||

          "Could not connect to LeadLeak AI. Make sure the backend is running on port 5000.",

      );

    } finally {

      setLoading(false);

    }

  }



  // Current report

  const audit = result?.audit || (showSample ? sampleAudit : null);



  // Download PDF

  function downloadReport() {

    if (!audit) return;



    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 18;

    const maxWidth = pageWidth - margin * 2;



    let y = 20;



    function addText(text, options = {}) {

      const {

        size = 10,

        bold = false,

        gap = 5,

        color = [55, 65, 81],

      } = options;



      doc.setFont("helvetica", bold ? "bold" : "normal");

      doc.setFontSize(size);

      doc.setTextColor(...color);



      const lines = doc.splitTextToSize(String(text || ""), maxWidth);



      const height = lines.length * (size * 0.45);



      if (y + height + gap > pageHeight - 18) {

        doc.addPage();

        y = 20;

      }



      doc.text(lines, margin, y);

      y += height + gap;

    }



    function addHeading(text) {

      addText(text, {

        size: 14,

        bold: true,

        gap: 7,

        color: [30, 41, 59],

      });

    }



    // Report title

    addText("LeadLeak AI", {

      size: 22,

      bold: true,

      color: [79, 70, 229],

      gap: 3,

    });



    addText("WEBSITE ANALYSIS REPORT", {

      size: 10,

      bold: true,

      color: [100, 116, 139],

      gap: 8,

    });



    addText(`Website: ${result?.website || "Sample website report"}`, {

      size: 11,

      bold: true,

    });



    addText(`Website Score: ${audit.score}/100`, {

      size: 16,

      bold: true,

      color: [79, 70, 229],

      gap: 10,

    });



    // AI Summary

    addHeading("AI Summary");

    addText(audit.summary);



    // Findings

    addHeading("Findings & Recommendations");



    (audit.findings || []).forEach((finding, index) => {

      addText(`${index + 1}. ${finding.title || "Finding"}`, {

        size: 11,

        bold: true,

        gap: 3,

      });



      if (finding.description) {

        addText(finding.description, { gap: 3 });

      }



      if (finding.recommendation) {

        addText(`Recommendation: ${finding.recommendation}`, {

          color: [79, 70, 229],

          gap: 3,

        });

      }



      addText(`Priority: ${finding.priority || "MEDIUM"}`, {

        size: 9,

        bold: true,

        gap: 7,

      });

    });



    // Strengths

    addHeading("What's Working");



    (audit.strengths || []).forEach((item) => {

      addText(

        `• ${

          typeof item === "string" ? item : item.title || item.description || ""

        }`,

      );

    });



    // Quick Wins

    addHeading("Quick Wins");



    (audit.quickWins || []).forEach((item) => {

      addText(

        `• ${

          typeof item === "string" ? item : item.title || item.description || ""

        }`,

      );

    });



    // Sample disclaimer

    if (showSample) {

      addText("Illustrative sample — this is not a real website analysis.", {

        size: 9,

        color: [120, 120, 120],

        gap: 5,

      });

    }



    doc.save("LeadLeak-AI-Website-Report.pdf");

  }



  // Open saved report

  function openHistoryReport(item) {

    setResult({

      website: item.website,

      audit: item.audit,

    });



    setWebsiteUrl(item.website);

    setShowSample(false);

    setError("");



    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });

  }



  // Delete one saved report from the database.

  async function deleteHistoryReport(id) {

    try {

      const response = await fetch(`http://localhost:5000/api/audits/${id}`, {

        method: "DELETE",

        headers: { Authorization: `Bearer ${token}` },

      });

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(data.message || "Could not delete this report.");

      }



      setHistory((previous) => previous.filter((report) => report.id !== id));

    } catch (deleteError) {

      setError(deleteError.message);

    }

  }



  // Delete all saved reports from the database.

  async function clearAllHistory() {

    if (history.length === 0) return;



    const confirmed = window.confirm(

      "Are you sure you want to delete all saved reports?",

    );



    if (!confirmed) return;



    try {

      const response = await fetch("http://localhost:5000/api/audits", {

        method: "DELETE",

        headers: { Authorization: `Bearer ${token}` },

      });

      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Could not clear saved reports.");

      }



      setHistory([]);

      setHistorySearch("");

      setHistorySort("newest");

    } catch (deleteError) {

      setError(deleteError.message);

    }

  }



  return (

    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">

        <a className="logo" href="#home">

          <span className="logo-icon">L</span>

          <span>

            LeadLeak<span className="logo-accent"> AI</span>

          </span>

        </a>



        <div className="nav-links">

          <a href="#how-it-works">How it works</a>

          <a href="#features">Features</a>

          <a href="#history">History</a>

          <a href="#pricing">Pricing</a>

        </div>



        {user ? (

          <div className="nav-account">

            <span>Hi, {user.name}</span>

            <button type="button" onClick={handleLogout}>Logout</button>

          </div>

        ) : (

          <a className="nav-cta" href="#account">Login / Sign up</a>

        )}

      </nav>



      <main>

        {/* HERO */}

        <section className="hero" id="home">

          <div className="hero-content">

            <div className="eyebrow">

              <span className="status-dot" />

              AI-POWERED WEBSITE AUDITS

            </div>



            <h1>

              Find what's costing websites <span>customers.</span>

            </h1>



            <p className="hero-description">

              Discover website issues, missed opportunities and practical

              improvements with an AI-powered website analysis.

            </p>



            {user ? (

              <form className="url-form" id="analyze" onSubmit={handleAnalyze}>

                <input

                  type="url"

                  value={websiteUrl}

                  onChange={(event) => setWebsiteUrl(event.target.value)}

                  placeholder="https://yourwebsite.com"

                  aria-label="Website URL"

                />



                <button type="submit" disabled={loading}>

                  {loading ? "Analyzing..." : "Analyze website"}

                  {!loading && <span> →</span>}

                </button>

              </form>

            ) : (

              <div className="login-required">

                <p>Login or create a free account to run an audit and save your reports.</p>

                <a href="#account">Login / Create account →</a>

              </div>

            )}



            {error && (

              <p className="error-message" role="alert">

                {error}

              </p>

            )}



            <p className="form-note">

              {user ? "Your audits are saved securely to your account." : "Create a free account to get started."}

            </p>



            <button

              className="sample-link"

              type="button"

              onClick={() => {

                setResult(null);

                setError("");

                setShowSample(true);

              }}

            >

              View a sample report

            </button>

          </div>



          <div className="hero-visual" aria-label="Website audit preview">

            <div className="preview-window">

              <div className="preview-top">

                <span />

                <span />

                <span />

                <small>WEBSITE AUDIT PREVIEW</small>

              </div>



              <div className="preview-body">

                <div className="preview-label">YOUR WEBSITE SCORE</div>



                <div className="preview-score">

                  <strong>62</strong>

                  <span>/ 100</span>

                </div>



                <div className="score-track">

                  <span />

                </div>



                <div className="preview-insight">

                  <span className="insight-icon">✦</span>

                  <div>

                    <strong>Room to improve</strong>

                    <p>Find issues and turn them into opportunities.</p>

                  </div>

                </div>



                <div className="preview-row">

                  <span>Trust signals</span>

                  <b>Needs work</b>

                </div>



                <div className="preview-row">

                  <span>Contact details</span>

                  <b className="good-text">Visible</b>

                </div>



                <div className="preview-row">

                  <span>Calls to action</span>

                  <b>Review</b>

                </div>

              </div>

            </div>



            <div className="floating-tag">✦ AI insights</div>

          </div>

        </section>



        {!authChecking && !user && (

          <div id="account">

            <AuthPanel onSuccess={handleAuthSuccess} />

          </div>

        )}



        {authChecking && (

          <section className="auth-loading">

            Checking your account session...

          </section>

        )}



        {/* AUDIT HISTORY */}

        <section className="history-section" id="history">

          <div className="section-heading">

            <div className="eyebrow">YOUR SAVED REPORTS</div>



            <h2>

              Your audit <span>history.</span>

            </h2>



            <p>Search, manage and access your previous website audits.</p>

          </div>



          <div className="history-container">

            {/* Search and filters */}

            <div className="history-toolbar">

              <input

                type="search"

                className="history-search"

                placeholder="Search website URL..."

                value={historySearch}

                onChange={(event) => setHistorySearch(event.target.value)}

                aria-label="Search saved reports"

              />



              <select

                className="history-sort"

                value={historySort}

                onChange={(event) => setHistorySort(event.target.value)}

                aria-label="Sort saved reports"

              >

                <option value="newest">Latest first</option>

                <option value="oldest">Oldest first</option>

                <option value="highest">Highest score</option>

                <option value="lowest">Lowest score</option>

              </select>



              {user && history.length > 0 && (

                <button

                  type="button"

                  className="history-clear"

                  onClick={clearAllHistory}

                >

                  Clear All

                </button>

              )}

            </div>



            {/* Results count */}

            {history.length > 0 && (

              <p className="history-count">

                Showing {filteredHistory.length} of {history.length} reports

              </p>

            )}



            {/* History list */}

            {historyLoading ? (

              <div className="history-empty">

                <h3>Loading your reports...</h3>

                <p>Please wait while we retrieve your saved audits.</p>

              </div>

            ) : !user ? (

              <div className="history-empty">

                <h3>Login to view your reports</h3>

                <p>Your saved website audits will be available after login.</p>

                <a href="#account">Login / Create account</a>

              </div>

            ) : history.length === 0 ? (

              <div className="history-empty">

                <h3>No saved reports yet</h3>

                <p>Your successful website audits will appear here.</p>

              </div>

            ) : filteredHistory.length === 0 ? (

              <div className="history-empty">

                <h3>No matching reports</h3>

                <p>Try searching with a different website URL.</p>

                <button type="button" onClick={() => setHistorySearch("")}>

                  Clear Search

                </button>

              </div>

            ) : (

              <div className="history-list">

                {filteredHistory.map((item) => (

                  <article className="history-item" key={item.id}>

                    <div className="history-info">

                      <strong>{item.website}</strong>



                      <span>{new Date(item.createdAt).toLocaleString()}</span>



                      <b>Score: {item.audit?.score ?? "N/A"}/100</b>

                    </div>



                    <div className="history-actions">

                      <button

                        type="button"

                        onClick={() => openHistoryReport(item)}

                      >

                        View Report

                      </button>



                      <button

                        type="button"

                        className="history-delete"

                        onClick={() => deleteHistoryReport(item.id)}

                      >

                        Delete

                      </button>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </div>

        </section>



        {/* REPORT */}

        <section className="report-section" id="report">

          {audit && (

            <div className="report-card">

              <div className="report-header">

                <div>

                  <div className="eyebrow">WEBSITE ANALYSIS REPORT</div>



                  <h2>

                    {showSample

                      ? "Sample website report"

                      : "Your website report"}

                  </h2>



                  <p>{result?.website || "Example report preview"}</p>



                  <button

                    type="button"

                    className="pdf-download-btn"

                    onClick={downloadReport}

                  >

                    ↓ Download PDF

                  </button>

                </div>



                <div className="report-score">

                  <strong>{audit.score}</strong>

                  <span>/100</span>

                  <small>Website score</small>

                </div>

              </div>



              <div className="score-track report-track">

                <span

                  style={{

                    width: `${Math.max(0, Math.min(100, audit.score))}%`,

                  }}

                />

              </div>



              <div className="report-summary">

                <h3>AI summary</h3>

                <p>{audit.summary}</p>

              </div>



              <div className="report-columns">

                <div>

                  <h3>Findings & recommendations</h3>



                  {(audit.findings || []).map((finding, index) => (

                    <article

                      className="finding"

                      key={`${finding.title}-${index}`}

                    >

                      <span

                        className={`finding-icon ${getPriorityClass(

                          finding.priority,

                        )}`}

                      >

                        {String(finding.priority).toUpperCase() === "GOOD"

                          ? "✓"

                          : "!"}

                      </span>



                      <div className="finding-content">

                        <strong>{finding.title}</strong>

                        <p>{finding.description}</p>



                        {finding.recommendation && (

                          <p className="recommendation">

                            <b>Recommendation:</b> {finding.recommendation}

                          </p>

                        )}

                      </div>



                      <span

                        className={`priority ${getPriorityClass(

                          finding.priority,

                        )}`}

                      >

                        {finding.priority || "MEDIUM"}

                      </span>

                    </article>

                  ))}

                </div>



                <div className="report-side">

                  <div className="report-list">

                    <h3>What's working</h3>



                    {(audit.strengths || []).map((item, index) => (

                      <p key={index}>✓ {item}</p>

                    ))}



                    {!(audit.strengths || []).length && (

                      <p>No strengths were returned in this report.</p>

                    )}

                  </div>



                  <div className="report-list">

                    <h3>Quick wins</h3>



                    {(audit.quickWins || []).map((item, index) => (

                      <p key={index}>✦ {item}</p>

                    ))}



                    {!(audit.quickWins || []).length && (

                      <p>No quick wins were returned in this report.</p>

                    )}

                  </div>

                </div>

              </div>



              {showSample && (

                <p className="sample-note">

                  Illustrative sample — not a real website analysis.

                </p>

              )}

            </div>

          )}

        </section>



        {/* HOW IT WORKS */}

        <section className="how-section" id="how-it-works">

          <div className="section-heading">

            <div className="eyebrow">SIMPLE PROCESS</div>



            <h2>

              Better websites start with <span>clear insights.</span>

            </h2>



            <p>Get a useful overview in three simple steps.</p>

          </div>



          <div className="steps-grid">

            <div className="step-card">

              <span className="step-number">01</span>

              <h3>Enter a website</h3>

              <p>Paste the URL of the business website you want to review.</p>

            </div>



            <div className="step-card">

              <span className="step-number">02</span>

              <h3>AI reviews the page</h3>

              <p>

                LeadLeak AI extracts website information and analyzes key

                elements.

              </p>

            </div>



            <div className="step-card">

              <span className="step-number">03</span>

              <h3>Get practical insights</h3>

              <p>Review findings, priorities and quick improvements.</p>

            </div>

          </div>

        </section>



        {/* FEATURES */}

        <section className="features-section" id="features">

          <div className="section-heading">

            <div className="eyebrow">WHAT YOU GET</div>



            <h2>

              Spot the gaps. Find the <span>opportunity.</span>

            </h2>

          </div>



          <div className="features-grid">

            <div className="feature-card">

              <span>⌕</span>

              <h3>Website review</h3>

              <p>Analyze visible website content and structure.</p>

            </div>



            <div className="feature-card">

              <span>✦</span>

              <h3>AI recommendations</h3>

              <p>Understand issues with clear, practical suggestions.</p>

            </div>



            <div className="feature-card">

              <span>↗</span>

              <h3>Prioritized findings</h3>

              <p>See which improvements deserve attention first.</p>

            </div>

          </div>

        </section>



        {/* PRICING */}

        <section className="pricing-section" id="pricing">

          <div className="section-heading">

            <div className="eyebrow">EARLY ACCESS</div>



            <h2>

              Start finding website <span>opportunities.</span>

            </h2>



            <p>Try the current website analysis experience.</p>

          </div>



          <div className="pricing-card">

            <div className="eyebrow">STARTER</div>

            <h3>Free preview</h3>

            <p className="price">Free</p>



            <p>Run an analysis and explore the report.</p>



            <a href="#analyze" className="pricing-cta">

              Analyze a website →

            </a>

          </div>

        </section>



        {/* FINAL CTA */}

        <section className="final-cta">

          <div className="eyebrow">READY TO TAKE A CLOSER LOOK?</div>



          <h2>

            Every website has room to <span>grow.</span>

          </h2>



          <p>Find practical ways to make a website work harder.</p>



          <a href="#analyze" className="final-button">

            Try LeadLeak AI →

          </a>

        </section>

      </main>



      {/* FOOTER */}

      <footer className="footer">

        <a className="logo" href="#home">

          <span className="logo-icon">L</span>

          <span>

            LeadLeak<span className="logo-accent"> AI</span>

          </span>

        </a>



        <p>AI-powered website insights for better business websites.</p>



        <small>

          © {new Date().getFullYear()} LeadLeak AI. All rights reserved.

        </small>

      </footer>

    </div>

  );

}
