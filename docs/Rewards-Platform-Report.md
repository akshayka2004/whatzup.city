# Rewards platform: what we have, what is missing, what I recommend

Date: 2026-11-25. This is a read-only review of the whole project. Nothing was changed.

## 1. The idea in one paragraph

Each business decides its own reward. Example: "Spend ₹1,000 with us and get a free dessert."
The customer spends, uploads the bill, the bill is verified, a progress bar fills, and when the
customer reaches the level they claim a code and show it at the counter. Businesses can also
aim a reward at the kind of customer likely to buy from them (for example, people who spend a
lot at cafes). That targeting is the selling point.

## 2. The good news: about half of this already exists

| Piece | Status | Where |
|---|---|---|
| Business creates a "spend ₹X, get reward Y" voucher | Built | Business dashboard > Vouchers |
| Reward types: percent off, amount off, free item | Built | Voucher model |
| Customer spend counted from verified bills only | Built | Verified purchases |
| Progress bar on the business page ("spend ₹X more to unlock") | Built | Business public page |
| Code hidden until the customer crosses the level | Built | Server hides it |
| Customer taps Unlock and gets a unique code | Built | `POST /vouchers/:id/unlock` |
| Staff enter the code at the counter to redeem it | Built | Dashboard > Vouchers |
| Cap on how many can be redeemed, start and end dates | Built | Voucher model |
| Platform-wide points (1 point per ₹1 verified) and platform reward tiers | Built | Profile page, Rewards card |
| Lucky wheel (spin to win a discount) with a code | Built | Business page, `/spin-it` |
| Offers customers can claim and redeem | Built | `/offers` |
| Bill upload, OCR read, owner approval, fraud scoring, escalation to admin | Built | Moderation screens |
| Business customer list with filters (claimed, redeemed, repeat, new this month) and CSV | Built | Dashboard > Customers |
| Plan limits (3 live vouchers per business today) | Built | Entitlements |
| Analytics for businesses and platform | Built | Analytics pages |
| Referral codes, favourites, reviews, events with tickets, buffets, cakes, suggestion box | Built | Various |

So the base "spend and unlock" reward already works end to end. What is missing is mostly the
parts around it that make it feel like a real rewards product, and the targeting.

## 3. How claiming works today (and why it feels confusing)

1. Customer uploads a bill. The business owner approves it. A verified purchase is saved.
2. The business page adds up all verified spend of that customer at that business, for all time.
3. If the total is at or above the voucher level, the "Unlock" button works. The customer taps it and a code appears.
4. The customer shows the code. The owner types it in the dashboard. The voucher is marked used.

Things that are confusing or wrong in this flow:

- **Lifetime spend.** If a business creates a "₹1,000" voucher today, a customer who spent ₹5,000 last year unlocks it instantly. There is no "spend since the reward started" and no "spend this month".
- **One time only.** A customer can claim a voucher once. "Every ₹1,000 you spend" is not possible. Spend is never "used up".
- **No ladder.** A business can add several vouchers, but they are separate, not a "Silver, Gold" ladder.
- **Customer has to tap Unlock.** Nothing tells them they reached the level. No notification, no "you are ₹200 away".
- **The code is only seen on that business's page.** There is an API for "my vouchers", but no screen uses it. There is no wallet.
- **Only the owner can redeem.** Counter staff and moderators cannot. No QR scan either, only typing a code.
- **Small gaps in the rules.** Redemption cap is counted on redeem, not on unlock, so more codes can be unlocked than the cap. Redeeming does not check the voucher end date. Two staff redeeming the same code at the same second could both succeed.
- **`targetCities` is saved on a voucher but never used.**

## 4. What is missing for a real rewards product

**A. Reward rules (the "claiming" part)**
- Spend window: since the reward started, last 30 days, calendar month, or lifetime.
- One-time or repeatable ("every ₹1,000").
- Ladders (₹500, ₹1,000, ₹2,500) in one program.
- Visit-count rewards (stamp card: 5th coffee free) and first-purchase rewards.
- Optional "use up" of spend when claimed, so the progress bar restarts.

**B. Customer experience**
- A "My rewards" wallet: all codes, what is close, what expires soon.
- A rewards-near-you list ("Spend ₹300 more at Cafe X for a free brownie").
- Notifications: bill approved and progress moved, almost there, unlocked, expiring, redeemed.
- QR code for the claim so staff can scan it.
- Customer levels (Bronze, Silver, Gold), streaks, birthday rewards (we already collect date of birth), rewards for referrals and reviews. These are nice to have, not first.

**C. Business tools**
- Staff and moderator redemption, QR scan, record the bill amount at redemption.
- Reward report: how many progressing, unlocked, redeemed, money spent by those customers, estimated cost of rewards.
- Budget cap (stop after N rewards or ₹ amount) with a clear warning before it ends.
- Templates ("spend ₹X get Y") so setting up takes one minute.

**D. Targeting (your selling point)** This is the biggest gap. Today:
- Business customer list only shows people who already interacted with that business.
- Platform segments (active, dormant, high-value) exist, but only for platform admins and only platform-wide.
- Campaigns are platform announcements, not something a business can run.
- Offers and vouchers can only be filtered by city, and for vouchers even that is not applied.

What we need: let a business define an audience and show a reward only to it. See section 6.

**E. Platform and trust**
- Admin screen listing every business voucher, redemption counts and open reward liability.
- Stronger anti-fraud for rewards: the business owner approves bills that unlock rewards they fund, and platform points can be redeemed at any business. A friendly owner could approve fake bills to farm points. Fraud scoring exists, but it needs reward-specific rules (same phone or device, many bills in a short time, round amounts, bills far from the customer's usual places).
- Expiry of points and codes, with clear terms.
- Money side: who pays for targeted reach (included in plan, per reward, per redemption)? Not decided.

## 5. My answer on the claiming part

Use a simple, honest model with three steps and one rule.

**One rule:** a reward belongs to a business and counts only verified spend at that business
(or a group of businesses, see section 6) since the reward started, inside the window the
business chose.

**Three steps:**
1. **Progress.** Every verified bill moves a progress bar. The customer is told after each approved bill.
2. **Ready.** When the level is reached, the reward becomes "Ready to claim" automatically and the customer is notified. No hidden steps.
3. **Claim and use.** The customer taps Claim, gets a code and a QR. Staff scan or type it. The system records the day, the staff member and, optionally, the bill amount. The code can be used once and expires.

**For repeatable rewards**, claiming "uses up" the level. If the reward is "every ₹1,000" and the
customer has ₹2,300 of verified spend, they can claim two and have ₹300 progress left. This is
the same as a points ledger: spend adds, claims subtract. I recommend building it as a ledger
(a table of adds and subtracts) instead of adding up bills each time, because it handles
windows, repeats and reversals (a rejected or refunded bill) cleanly.

**Keep it as milestones, not as spendable points,** for business rewards. Customers understand
"spend ₹1,000, get a dessert" far better than "300 points = a coffee". Keep platform points as
a separate, simple extra.

## 6. How targeting could work (the selling point)

Think of it as: **the business describes the customer it wants; the platform shows the reward
to people who fit; the business never sees a list of strangers.**

Audience rules a business could pick (all based on data we already hold or can compute):
- Spent at least ₹X in a category in the last N days (example: ₹3,000 at cafes and bakeries in 60 days).
- City or area.
- Has visited or saved businesses in a related category.
- New to this business, or returning, or lapsed (no visit for 60 days).
- Birthday month, age band (date of birth is collected at sign-up).
- Is a regular user who has verified bills at all.

How it works for the user: a matching customer sees the reward in their feed, in rewards near
them and in a notification. Non-matching customers do not see it, or see it locked.

How it works for the business: they see a count ("about 420 people match") before they launch
and results after. They never get names, phones or emails from the audience. They only see
customers who actually claim or visit, which the customer list already covers.

Why this matters: it protects customer privacy and keeps us legally safer (India's data
protection law), and it keeps the audience as our asset, not the business's.

What we already have to build on: verified spend per business (so we can compute spend per
category), business category on every business, city on businesses and (optionally) on customer
profiles, date of birth, a notification service, and the segmentation module.

What we need to check first: how many customers have filled in a city. If few, we use the city
of the businesses they spend at.

Important limit: targeting only works well once enough customers upload bills. The category
spend data is as good as the bill upload habit.

## 7. The biggest risk: bill upload friction

The whole system rests on customers uploading bills and owners approving them. That is a lot of
work for both sides, and it is the part most likely to stall the product. Options for later:
- **Counter QR:** the customer shows a QR, staff enters the bill amount, the customer confirms on their phone. No photo, no approval wait. Needs a business-side screen and a customer-confirm step, plus abuse rules.
- **Auto-approve small trusted bills** with OCR and a match against the business bill series, and sample-check the rest.
- Keep bill upload as the proof for large amounts.

I recommend deciding this before building rewards, because it changes how fast progress moves.

## 8. Suggested order of work

**Step 1 (quick, makes today's system trustworthy):**
Fix the rule gaps (cap counted on unlock, expiry on redeem, safe double-redeem), let staff
redeem, add notifications (progress, ready, expiring), build the My rewards wallet, show
progress on a "rewards near you" list.

**Step 2 (the claiming model):**
Spend window and start-date rule, repeatable rewards, ladders, a ledger for spend and claims,
QR claim.

**Step 3 (targeting):**
Audience builder with category and city spend, match count preview, feed placement and
notification, results report for the business.

**Step 4 (growth and safety):**
Admin liability screen, reward fraud rules, customer levels, referral and birthday rewards,
counter QR for bill amount, pricing for targeted reach.

## 9. Decisions I need from you

1. **Spend window:** since the reward starts (recommended), rolling 30 days, calendar month, or let each business pick?
2. **Repeatable rewards ("every ₹1,000")** in the first version, or one-time only?
3. **Audience:** is "spent in cafes and related shops" the main rule? Which categories count as related (a fixed list, or the business picks)?
4. **Who sees the audience:** counts only, as I recommend, or does the business get names? (Privacy and law favour counts only.)
5. **Bill proof:** keep photo bills for now, or plan the counter QR early?
6. **Money:** is targeting included in every plan, limited by plan, or paid per reward or redemption?
7. **Platform points:** keep as they are (a separate, simple extra) or fold into the new model?
8. **Who can redeem:** owner only, or also moderators and staff? (I recommend staff, with a log.)

## 10. Things I did not check and should confirm

- How many customers actually have a city on their profile.
- Whether the admin can already see all business vouchers somewhere (I did not find a screen).
- Real numbers: bills uploaded per day, approval time, how many vouchers exist today.
- Legal review of reward terms (expiry, who bears the cost, tax on free items) for India.
