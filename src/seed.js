// src/seed.js
// Seeds the reviews table with the same 8 reviews used on the front end,
// so the API returns real data immediately. Run with: npm run seed
// Safe to re-run — it skips seeding if rows already exist.

const db = require('./db');
const bcrypt = require('bcryptjs');

// ── Admin account ──────────────────────────────────────────────
// Because the database can be reset on hosts like Render's free plan,
// the admin is created (or promoted) from environment variables on every
// start. Set ADMIN_EMAIL and ADMIN_PASSWORD (optionally ADMIN_NAME).
let adminId = 1;
const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || '';

if (adminEmail && adminPassword) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    adminId = existing.id;
    console.log(`Admin ready: promoted existing user ${adminEmail}`);
  } else {
    const hash = bcrypt.hashSync(adminPassword, 10);
    const info = db
      .prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')")
      .run(process.env.ADMIN_NAME || 'Admin', adminEmail, hash);
    adminId = Number(info.lastInsertRowid);
    console.log(`Admin ready: created ${adminEmail}`);
  }
} else {
  console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin setup.');
}

const REVIEWS = [
  { title:"The Glass Orchard", year:2024, genre:"Drama", director:"Mira Kess", runtime:118, rating:4.5,
    blurb:"A quiet inheritance drama that trusts silence more than dialogue, and is better for it.",
    review:"The Glass Orchard spends its first act saying almost nothing, and that turns out to be the point. Three estranged siblings return to their late father's greenhouse business and circle each other with the caution of people who used to know each other well. Kess directs with a patient camera that lingers on hands more than faces. By the time the film allows itself an actual confrontation, it has earned every second of the quiet that preceded it.",
    verdict:"Proof that silence can carry more weight than any script line.",
    icon:"orchard", colors:["#3a2a18","#000000"], tags:["Slow Burn","Family Drama"],
    critic:"Dana Whitfield", published:"2026-08-24" },
  { title:"Static Hour", year:2023, genre:"Sci-Fi", director:"Julian Voss", runtime:132, rating:4,
    blurb:"A time-loop premise used sparingly, in service of a genuinely melancholy story about grief.",
    review:"Static Hour wears its central gimmick lightly — a radio technician keeps reliving the same sixty minutes the night his station goes dark. The sound design does a lot of the heavy lifting; frequencies drift in and out like memory itself.",
    verdict:"A time loop used to explore grief, not gimmickry.",
    icon:"radio", colors:["#132a38","#000000"], tags:["Melancholy","Puzzle Box"],
    critic:"Marcus Ihejirika", published:"2026-08-20" },
  { title:"Paper Wolves", year:2022, genre:"Thriller", director:"Anke Reyes", runtime:104, rating:3.5,
    blurb:"A corporate-espionage thriller with sharp dialogue that outruns its predictable back half.",
    review:"For an hour, Paper Wolves is one of the smarter workplace thrillers in recent memory. Reyes has a good ear for the specific cruelty of office language. The third act stumbles into a car chase it never earns tonally.",
    verdict:"Sharp for an hour, then swerves into genre autopilot.",
    icon:"wolf", colors:["#331414","#000000"], tags:["Corporate","Twisty"],
    critic:"Dana Whitfield", published:"2026-08-16" },
  { title:"The Understudy", year:2024, genre:"Comedy", director:"Noel Farraday", runtime:97, rating:3,
    blurb:"A backstage comedy that gets great mileage from its cast, less from its script.",
    review:"The Understudy leans entirely on its ensemble, and thankfully that ensemble is very funny. The structure around the best scenes is thinner, and the film rushes its ending rather than earning one.",
    verdict:"The cast is doing back-flips the script never asked for.",
    icon:"mask", colors:["#332c0c","#000000"], tags:["Ensemble Comedy","Backstage"],
    critic:"Sasha Lindqvist", published:"2026-08-12" },
  { title:"Hollow Choir", year:2023, genre:"Horror", director:"Priya Chandrasekar", runtime:109, rating:4.5,
    blurb:"A rural folk-horror film that earns its dread through sound design rather than jump scares.",
    review:"Hollow Choir builds an entire atmosphere around a wrong note in a hymn that shouldn't exist. The choir itself — heard more than seen — is one of the most unsettling uses of sound in recent horror.",
    verdict:"Dread you can't name is the scariest kind.",
    icon:"choir", colors:["#1e1030","#000000"], tags:["Folk Horror","Atmospheric"],
    critic:"Marcus Ihejirika", published:"2026-08-08" },
  { title:"Marigold & Steel", year:2021, genre:"Animation", director:"Tomas Ruiz-Bell", runtime:95, rating:5,
    blurb:"A hand-painted animated feature about a scrapyard and the friendships built inside it.",
    review:"Marigold & Steel is the kind of animated film that reminds you the medium doesn't need photorealism to feel true. The final ten minutes, set to almost no dialogue, is as moving as anything released that year.",
    verdict:"Animation that still believes in painting every frame by hand.",
    icon:"gear-flower", colors:["#213c18","#000000"], tags:["Hand-Painted","Heartfelt"],
    critic:"Priyanka Osei", published:"2026-08-03" },
  { title:"Low Tide", year:2024, genre:"Drama", director:"Ingrid Solheim", runtime:121, rating:3.5,
    blurb:"A coastal-town drama about a returning sister, undercut slightly by an overwritten score.",
    review:"Low Tide has a strong sense of place and a lead performance that carries long stretches of near-silent walking and watching. A score that insists on telling you how to feel undercuts scenes that were already working.",
    verdict:"Turn the score down and this quietly excels.",
    icon:"wave", colors:["#0e2e33","#000000"], tags:["Character Study","Coastal"],
    critic:"Sasha Lindqvist", published:"2026-07-29" },
  { title:"Nine Red Doors", year:2022, genre:"Thriller", director:"Kenji Osato", runtime:141, rating:4,
    blurb:"A sprawling heist-thriller across nine apartments that mostly justifies its long runtime.",
    review:"Nine Red Doors asks a lot of patience up front, but Osato's control of parallel structure makes the sprawl feel intentional. The back half, where all nine threads intersect in real time, is a genuine achievement of staging.",
    verdict:"Nine rooms, one very patient payoff.",
    icon:"doors", colors:["#2e1010","#000000"], tags:["Heist","Ensemble"],
    critic:"Priyanka Osei", published:"2026-07-24" }
];

const count = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n;
if (count > 0) {
  console.log(`Reviews table already has ${count} rows — skipping seed.`);
  process.exit(0);
}

const insert = db.prepare(`
  INSERT INTO reviews (user_id, title, year, genre, director, runtime, rating, blurb, review, verdict, icon, colors, tags, critic, published)
  VALUES (@user_id, @title, @year, @genre, @director, @runtime, @rating, @blurb, @review, @verdict, @icon, @colors, @tags, @critic, @published)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    insert.run({ ...r, user_id: adminId, colors: JSON.stringify(r.colors), tags: JSON.stringify(r.tags) });
  }
});

insertMany(REVIEWS);
console.log(`Seeded ${REVIEWS.length} reviews into ${process.env.DB_FILE || './data/reelmark.db'}`);