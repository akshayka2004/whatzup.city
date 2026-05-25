import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the monorepo root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 6001;

// Initialize Prisma Client with direct URL configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/register/individual', async (req, res) => {
  try {
    const { name, email, phone, interests } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const lead = await prisma.launchIndividualInterest.create({
      data: {
        name,
        email,
        phone,
        interests: Array.isArray(interests) ? interests.join(', ') : interests
      }
    });

    return res.status(201).json({ success: true, lead });
  } catch (error: any) {
    console.error('Individual Registration Error:', error);
    return res.status(500).json({ error: 'Failed to save registration. Please try again.' });
  }
});

app.post('/api/register/business', async (req, res) => {
  try {
    const { businessName, category, contactName, email, phone, website, notes } = req.body;
    if (!businessName || !category || !contactName || !email) {
      return res.status(400).json({ error: 'Business name, category, contact name, and email are required.' });
    }

    const lead = await prisma.launchBusinessInterest.create({
      data: {
        businessName,
        category,
        contactName,
        email,
        phone,
        website,
        notes
      }
    });

    return res.status(201).json({ success: true, lead });
  } catch (error: any) {
    console.error('Business Registration Error:', error);
    return res.status(500).json({ error: 'Failed to save registration. Please try again.' });
  }
});

// Single-file webpage rendering
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Whtzup.city — Exclusive Launch Portal</title>
  <!-- SEO Tags -->
  <meta name="description" content="Register interest for the launch of Whtzup.city, the ultimate SaaS listing platform.">
  <!-- Fonts & Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'sans-serif'],
          },
        },
      },
    }
  </script>
  <style>
    body {
      background-color: #030712;
      overflow-x: hidden;
    }
    .gradient-glow {
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(0, 0, 0, 0) 100%);
    }
    .neon-text {
      background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    .glass-input {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-input:focus {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
      outline: none;
    }
  </style>
</head>
<body class="min-h-screen text-slate-100 flex flex-col justify-between relative antialiased selection:bg-indigo-500 selection:text-white">

  <!-- Glow effects -->
  <div class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] gradient-glow pointer-events-none rounded-full"></div>
  <div class="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] gradient-glow pointer-events-none rounded-full"></div>

  <!-- Header -->
  <header class="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
    <div class="flex items-center gap-2">
      <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <i data-lucide="sparkles" class="h-5 w-5 text-white animate-pulse"></i>
      </div>
      <span class="text-xl font-bold tracking-wider uppercase text-white">whtzup<span class="text-indigo-400">.city</span></span>
    </div>
    <div class="flex items-center gap-4 text-xs sm:text-sm text-slate-400">
      <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Launch Event Ready</span>
    </div>
  </header>

  <!-- Main Portal -->
  <main class="w-full max-w-md mx-auto px-6 py-8 flex-grow flex flex-col justify-center z-10">
    
    <div class="text-center mb-8">
      <span class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 inline-block mb-3">EXCLUSIVE PRE-REGISTRATION</span>
      <h1 class="text-4xl font-extrabold tracking-tight text-white mb-2">Be the First to Join</h1>
      <p class="text-slate-400 text-sm max-w-sm mx-auto">Register your interest to stay updated with the latest news, announcements, and platform release details.</p>
    </div>

    <!-- Glassmorphic Card -->
    <div class="glass-card rounded-3xl p-6 sm:p-8 w-full transition-all duration-500 hover:shadow-indigo-500/5 hover:border-white/12">
      
      <!-- Tabs Selector -->
      <div class="flex p-1 bg-slate-900/60 rounded-xl mb-6 border border-white/5 relative">
        <button id="tab-individual" onclick="switchTab('individual')" class="w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-white bg-indigo-600/80 shadow-md">
          As Individual
        </button>
        <button id="tab-business" onclick="switchTab('business')" class="w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-slate-400 hover:text-white">
          As Business
        </button>
      </div>

      <!-- Individual Form -->
      <form id="form-individual" onsubmit="submitIndividual(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
          <div class="relative">
            <i data-lucide="user" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="text" id="ind-name" required placeholder="e.g. John Doe" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
          <div class="relative">
            <i data-lucide="mail" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="email" id="ind-email" required placeholder="e.g. john@example.com" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Phone Number (Optional)</label>
          <div class="relative">
            <i data-lucide="phone" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="tel" id="ind-phone" placeholder="e.g. +91 99999 88888" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Interested In</label>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <label class="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/5 cursor-pointer text-xs hover:bg-white/8 transition duration-200">
              <input type="checkbox" name="interest" value="Finding Businesses" class="rounded border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950">
              <span>Find Places</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/5 cursor-pointer text-xs hover:bg-white/8 transition duration-200">
              <input type="checkbox" name="interest" value="Exclusive Offers" class="rounded border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950">
              <span>Get Offers</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/5 cursor-pointer text-xs hover:bg-white/8 transition duration-200">
              <input type="checkbox" name="interest" value="Civic Alerts" class="rounded border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950">
              <span>Civic Alerts</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/5 cursor-pointer text-xs hover:bg-white/8 transition duration-200">
              <input type="checkbox" name="interest" value="Events" class="rounded border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950">
              <span>Events</span>
            </label>
          </div>
        </div>

        <button type="submit" id="btn-ind" class="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2">
          <span>Claim Launch Access</span>
          <i data-lucide="arrow-right" class="h-4 w-4"></i>
        </button>
      </form>

      <!-- Business Form (hidden by default) -->
      <form id="form-business" onsubmit="submitBusiness(event)" class="space-y-4 hidden">
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Business Name</label>
          <div class="relative">
            <i data-lucide="building" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="text" id="bus-name" required placeholder="e.g. Acme Coffee Roasters" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Category</label>
          <div class="relative">
            <i data-lucide="tag" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <select id="bus-category" required class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm appearance-none bg-slate-950">
              <option value="" disabled selected>Select Category</option>
              <option value="Restaurants">Restaurants & Food</option>
              <option value="Retail">Retail & Shops</option>
              <option value="Services">Professional Services</option>
              <option value="Healthcare">Healthcare & Wellness</option>
              <option value="Technology">Technology & Software</option>
              <option value="Education">Education & Learning</option>
              <option value="Entertainment">Entertainment & Arts</option>
              <option value="Finance">Financial Services</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contact Person Name</label>
          <div class="relative">
            <i data-lucide="user" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="text" id="bus-contact" required placeholder="e.g. Jane Smith" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Work Email Address</label>
          <div class="relative">
            <i data-lucide="mail" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="email" id="bus-email" required placeholder="e.g. partner@acme.com" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Phone Number</label>
          <div class="relative">
            <i data-lucide="phone" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="tel" id="bus-phone" placeholder="e.g. +91 99999 88888" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Website / Social Link (Optional)</label>
          <div class="relative">
            <i data-lucide="globe" class="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500"></i>
            <input type="url" id="bus-website" placeholder="e.g. https://acmecafe.com" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Message / Business Needs (Optional)</label>
          <textarea id="bus-notes" placeholder="Tell us what you'd like to achieve on Whtzup.city..." class="glass-input w-full p-4 rounded-xl text-sm h-20 resize-none"></textarea>
        </div>

        <button type="submit" id="btn-bus" class="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2">
          <span>Apply to List Business</span>
          <i data-lucide="arrow-right" class="h-4 w-4"></i>
        </button>
      </form>

    </div>
  </main>

  <!-- Footer -->
  <footer class="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between z-10 text-xs text-slate-500 border-t border-white/5">
    <p>&copy; 2026 Whtzup.city. Pre-launch exclusive access portal.</p>
    <p class="mt-2 sm:mt-0 flex items-center gap-1"><i data-lucide="shield-check" class="h-4 w-4"></i> Securely stored for launch communication</p>
  </footer>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed top-6 right-6 z-50 flex flex-col gap-3"></div>

  <script>
    // Initialize icons
    lucide.createIcons();

    // Tab switching logic
    function switchTab(type) {
      const tabInd = document.getElementById('tab-individual');
      const tabBus = document.getElementById('tab-business');
      const formInd = document.getElementById('form-individual');
      const formBus = document.getElementById('form-business');

      if (type === 'individual') {
        tabInd.className = "w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-white bg-indigo-600/80 shadow-md";
        tabBus.className = "w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-slate-400 hover:text-white";
        formInd.classList.remove('hidden');
        formBus.classList.add('hidden');
      } else {
        tabBus.className = "w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-white bg-indigo-600/80 shadow-md";
        tabInd.className = "w-1/2 py-2 text-sm font-semibold rounded-lg z-10 transition-all duration-300 text-slate-400 hover:text-white";
        formBus.classList.remove('hidden');
        formInd.classList.add('hidden');
      }
    }

    // Custom toast notifications
    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      
      const bgColor = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';
      const textColor = type === 'success' ? 'text-emerald-400' : 'text-rose-400';
      const icon = type === 'success' ? 'check-circle' : 'alert-circle';
      
      toast.className = \`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md \${bgColor} \${textColor} shadow-lg transition-all duration-300 opacity-0 translate-y-2 max-w-sm\`;
      toast.innerHTML = \`
        <i data-lucide="\${icon}" class="h-5 w-5 flex-shrink-0"></i>
        <p class="text-sm font-medium">\${message}</p>
      \`;
      
      container.appendChild(toast);
      lucide.createIcons();
      
      // Animate entry
      setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
      }, 50);

      // Dismiss after 4 seconds
      setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // Submit individual form
    async function submitIndividual(event) {
      event.preventDefault();
      const btn = document.getElementById('btn-ind');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="h-4 w-4 animate-spin"></i> Processing...';
      lucide.createIcons();

      const name = document.getElementById('ind-name').value;
      const email = document.getElementById('ind-email').value;
      const phone = document.getElementById('ind-phone').value;
      const interestsChecked = Array.from(document.querySelectorAll('input[name="interest"]:checked')).map(el => el.value);

      try {
        const res = await fetch('/api/register/individual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, interests: interestsChecked })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          showToast('Launch access claimed! See you tomorrow.', 'success');
          document.getElementById('form-individual').reset();
        } else {
          showToast(data.error || 'Failed to submit interest.', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        lucide.createIcons();
      }
    }

    // Submit business form
    async function submitBusiness(event) {
      event.preventDefault();
      const btn = document.getElementById('btn-bus');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="h-4 w-4 animate-spin"></i> Processing...';
      lucide.createIcons();

      const businessName = document.getElementById('bus-name').value;
      const category = document.getElementById('bus-category').value;
      const contactName = document.getElementById('bus-contact').value;
      const email = document.getElementById('bus-email').value;
      const phone = document.getElementById('bus-phone').value;
      const website = document.getElementById('bus-website').value;
      const notes = document.getElementById('bus-notes').value;

      try {
        const res = await fetch('/api/register/business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName, category, contactName, email, phone, website, notes })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          showToast('Business registered for listing application!', 'success');
          document.getElementById('form-business').reset();
        } else {
          showToast(data.error || 'Failed to submit business details.', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        lucide.createIcons();
      }
    }
  </script>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`🚀 Launch Page server running on port ${port}`);
});
