import express from 'express';

const app = express();
const port = process.env.PORT || 6001;

// Where each product lives — override locally (e.g. http://localhost:5173 /
// http://localhost:3000) without touching the page markup.
const FLOOD_RELIEF_URL = process.env.FLOOD_RELIEF_URL || 'https://floodrelief.whtzup.city';
const MARKETPLACE_URL = process.env.MARKETPLACE_URL || 'https://app.whtzup.city';

// Single-file webpage rendering — front door for whtzup.city, routes visitors to
// one of the two independently-deployed products.
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>whtzup.city</title>
  <meta name="description" content="whtzup.city — choose Kerala Flood Relief information or the business listing platform.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F7F5F2;
      --surface: #FFFFFF;
      --border: #EAE5DE;
      --primary: #B86F50;
      --primary-hover: #A56045;
      --ink: #20242F;
      --muted: #667085;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2.5rem;
      padding: 1.5rem;
      background: var(--bg);
      color: var(--ink);
      font-family: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
      text-align: center;
    }
    .brand {
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: -0.02em;
    }
    .brand span { color: var(--primary); }
    h1 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem;
    }
    p.subtitle {
      color: var(--muted);
      font-size: 0.9375rem;
      margin: 0;
      max-width: 32rem;
    }
    .choices {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      width: 100%;
      max-width: 30rem;
    }
    @media (min-width: 560px) {
      .choices { grid-template-columns: 1fr 1fr; }
    }
    .choice {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1.5rem;
      border-radius: 1.25rem;
      border: 1px solid var(--border);
      background: var(--surface);
      text-decoration: none;
      color: var(--ink);
      text-align: left;
      transition: transform 150ms cubic-bezier(0.23,1,0.32,1), box-shadow 150ms ease, border-color 150ms ease;
    }
    .choice:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
      box-shadow: 0 8px 24px rgba(184, 111, 80, 0.12);
    }
    .choice:active { transform: translateY(0) scale(0.98); }
    .choice-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.875rem;
      background: rgba(184, 111, 80, 0.1);
      color: var(--primary);
      font-size: 1.375rem;
    }
    .choice-title { font-weight: 600; font-size: 1rem; }
    .choice-desc { color: var(--muted); font-size: 0.8125rem; line-height: 1.4; }
    .choice-cta {
      margin-top: auto;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
    }
    footer {
      color: var(--muted);
      font-size: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="brand">whtzup<span>.city</span></div>

  <div>
    <h1>Where would you like to go?</h1>
    <p class="subtitle">whtzup.city hosts two independent products. Pick one to continue.</p>
  </div>

  <div class="choices">
    <a class="choice" href="${FLOOD_RELIEF_URL}">
      <span class="choice-icon" aria-hidden="true">&#9888;</span>
      <span class="choice-title">Kerala Flood Relief Portal</span>
      <span class="choice-desc">Official alerts, relief camps, collection centres, volunteer groups and emergency contacts.</span>
      <span class="choice-cta">Open portal &rarr;</span>
    </a>
    <a class="choice" href="${MARKETPLACE_URL}">
      <span class="choice-icon" aria-hidden="true">&#127970;</span>
      <span class="choice-title">Business Listings</span>
      <span class="choice-desc">Discover and list local businesses on the whtzup.city marketplace.</span>
      <span class="choice-cta">Open platform &rarr;</span>
    </a>
  </div>

  <footer>&copy; 2026 whtzup.city</footer>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`Launch page server running on port ${port}`);
});
