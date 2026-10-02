// src/seed.js
// Runs on every start (see "start" in package.json) and does three things:
//   1. Creates/promotes the admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
//   2. Loads the 8 sample reviews (real films) when the table is empty. If the
//      older made-up sample films are still in the database, they are removed
//      and replaced by the real ones. Reviews written by users are never touched.
//   3. Fetches missing posters for the sample films from OMDb (needs OMDB_API_KEY).
// Safe to run again and again: it never duplicates data.
// Run manually with: npm run seed

const db = require('./db');
const bcrypt = require('bcryptjs');
const { searchMovie } = require('./service/omdb.service');

// The first set of sample films were made up and have no real posters.
// If any of them are still in the database, they get replaced.
const OLD_PLACEHOLDERS = [
  ['The Glass Orchard', 2024], ['Static Hour', 2023], ['Paper Wolves', 2022],
  ['The Understudy', 2024], ['Hollow Choir', 2023], ['Marigold & Steel', 2021],
  ['Low Tide', 2024], ['Nine Red Doors', 2022],
];

// Real films, with short original reviews. Posters are fetched from OMDb.
const REVIEWS = [
  { title:"Past Lives", year:2023, genre:"Drama", director:"Celine Song", runtime:106, rating:4.5,
    blurb:"A tender, restrained story about the lives two childhood friends never got to live together.",
    review:"Past Lives builds its whole case out of small things: a pause on a staircase, a video call that keeps freezing, a conversation carried half in translation. Song never pushes the melodrama, and the three leads play every scene with a careful kindness that makes the ending land harder than any argument could. It is a film about timing, and it understands that nobody is really at fault for it.",
    verdict:"Heartbreak told in a whisper.",
    icon:"orchard", colors:["#3a2a18","#000000"], tags:["Romance","Quiet"],
    critic:"Dana Whitfield", published:"2026-08-24" },
  { title:"Arrival", year:2016, genre:"Sci-Fi", director:"Denis Villeneuve", runtime:116, rating:4.5,
    blurb:"First-contact science fiction that cares more about language and grief than spectacle.",
    review:"Arrival treats first contact as a problem of communication rather than combat, and that choice makes everything feel fresh. Villeneuve keeps the camera patient and the mood hushed, while the story folds time in a way that only reveals its emotional purpose late. It rewards a second viewing even more than the first.",
    verdict:"A thinking person's alien film with a real heart.",
    icon:"radio", colors:["#132a38","#000000"], tags:["Cerebral","Emotional"],
    critic:"Marcus Ihejirika", published:"2026-08-20" },
  { title:"Gone Girl", year:2014, genre:"Thriller", director:"David Fincher", runtime:149, rating:4,
    blurb:"A cold, polished thriller about marriage as a performance, and who is really watching.",
    review:"Fincher's clinical style suits a story about people acting out the lives they think others expect. The first half plays like a mystery and the second like a very dark joke, and the film is smart enough to let both tones coexist. It runs long, but the control never slips.",
    verdict:"Glossy, nasty and very hard to look away from.",
    icon:"wolf", colors:["#331414","#000000"], tags:["Twisty","Dark"],
    critic:"Dana Whitfield", published:"2026-08-16" },
  { title:"The Grand Budapest Hotel", year:2014, genre:"Comedy", director:"Wes Anderson", runtime:99, rating:4,
    blurb:"A pastel caper whose dollhouse precision hides a real sadness underneath.",
    review:"Anderson's meticulous style has rarely been put to better use. The caper plot moves briskly, the ensemble is a pleasure, and beneath the candy-colored surface there is genuine sorrow for a world that was already disappearing. Few comedies are this carefully built and still this light on their feet.",
    verdict:"A confection with a bittersweet center.",
    icon:"mask", colors:["#332c0c","#000000"], tags:["Ensemble Comedy","Stylized"],
    critic:"Sasha Lindqvist", published:"2026-08-12" },
  { title:"Hereditary", year:2018, genre:"Horror", director:"Ari Aster", runtime:127, rating:4,
    blurb:"A family drama about grief that slowly turns into something far more frightening.",
    review:"Hereditary plays as a grief drama for its first half and something much more terrifying for its second, and the join between the two is what makes it work. Aster lets scenes run uncomfortably long, and the performances, especially from the mother, sell every escalation. It is not an easy watch and is not meant to be.",
    verdict:"Grief is the real monster here.",
    icon:"choir", colors:["#1e1030","#000000"], tags:["Slow Dread","Family Horror"],
    critic:"Marcus Ihejirika", published:"2026-08-08" },
  { title:"Spider-Man: Into the Spider-Verse", year:2018, genre:"Animation", director:"Bob Persichetti, Peter Ramsey, Rodney Rothman", runtime:117, rating:5,
    blurb:"An animated film that looks like a comic book that learned to move, with a big heart.",
    review:"The visuals borrow halftone dots, offset colors and on-screen captions and turn them into real style rather than gimmicks. Under all that sits a warm, funny coming-of-age story that earns its biggest emotional moments. It changed what mainstream animation believed it could look like.",
    verdict:"Proof that animation can still surprise.",
    icon:"gear-flower", colors:["#213c18","#000000"], tags:["Stylish","Heartfelt"],
    critic:"Priyanka Osei", published:"2026-08-03" },
  { title:"Moonlight", year:2016, genre:"Drama", director:"Barry Jenkins", runtime:111, rating:4.5,
    blurb:"One life told in three chapters, with an intimacy that is rare in cinema.",
    review:"Moonlight follows one man across three stages of his life, and Jenkins uses color, sound and long looks to say what the characters cannot. The three actors playing the lead feel like a single person, which is a remarkable trick. It is a quiet film that stays with you long after it ends.",
    verdict:"Tender, patient and unforgettable.",
    icon:"wave", colors:["#0e2e33","#000000"], tags:["Character Study","Coming of Age"],
    critic:"Sasha Lindqvist", published:"2026-07-29" },
  { title:"Parasite", year:2019, genre:"Thriller", director:"Bong Joon Ho", runtime:132, rating:5,
    blurb:"A class satire that turns into a tense thriller and then a tragedy, without losing its grip.",
    review:"Bong moves from sly comedy to tense thriller to tragedy without ever letting go, and the house at the center of the story becomes a character of its own. Every detail of the production design is doing narrative work. It is funny, angry and sharply built, and it never lectures.",
    verdict:"A class satire with the pulse of a thriller.",
    icon:"doors", colors:["#2e1010","#000000"], tags:["Social Satire","Twisty"],
    critic:"Priyanka Osei", published:"2026-07-24" }
];

async function main() {
  await db.ready;

  // ── 1. Admin account ─────────────────────────────────────────
  let adminId = 1;
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  if (adminEmail && adminPassword) {
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (existing) {
      await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
      adminId = existing.id;
      console.log(`Admin ready: ${adminEmail} (existing user, role set to admin)`);
    } else {
      const hash = bcrypt.hashSync(adminPassword, 10);
      const info = await db
        .prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')")
        .run(process.env.ADMIN_NAME || 'Admin', adminEmail, hash);
      adminId = Number(info.lastInsertRowid);
      console.log(`Admin ready: created ${adminEmail}`);
    }
  } else {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin setup.');
    const first = await db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
    if (first) adminId = first.id;
  }

  // ── 2. Sample reviews ────────────────────────────────────────
  // Remove the old made-up sample films (only those exact title+year pairs).
  let removed = 0;
  for (const [title, year] of OLD_PLACEHOLDERS) {
    const r = await db.prepare('DELETE FROM reviews WHERE title = ? AND year = ?').run(title, year);
    removed += r.changes || 0;
  }
  if (removed > 0) console.log(`Removed ${removed} old placeholder review(s).`);

  const { n } = await db.prepare('SELECT COUNT(*) AS n FROM reviews').get();

  if (n === 0 || removed > 0) {
    const insertSql = `
      INSERT INTO reviews
        (user_id, title, year, genre, director, runtime, rating, blurb, review, verdict, icon, colors, tags, critic, published)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    let added = 0;
    await db.transaction(async (client) => {
      for (const r of REVIEWS) {
        const dupe = await client.query('SELECT 1 FROM reviews WHERE title = $1 AND year = $2', [r.title, r.year]);
        if (dupe.rows.length) continue;
        await client.query(insertSql, [
          adminId, r.title, r.year, r.genre, r.director, r.runtime, r.rating,
          r.blurb, r.review, r.verdict, r.icon,
          JSON.stringify(r.colors), JSON.stringify(r.tags), r.critic, r.published,
        ]);
        added++;
      }
    });
    console.log(`Seeded ${added} sample reviews.`);
  } else {
    console.log(`Reviews table already has ${n} rows - skipping sample reviews.`);
  }

  // ── 3. Posters for the sample films ──────────────────────────
  await fillPosters();
}

// Looks up missing posters on OMDb. Never stops the server from starting:
// if the key is missing or OMDb is unreachable, it just logs and moves on.
async function fillPosters() {
  if (!process.env.OMDB_API_KEY) {
    console.log('OMDB_API_KEY not set - skipping poster lookup.');
    return;
  }

  let filled = 0;
  for (const r of REVIEWS) {
    try {
      const row = await db
        .prepare("SELECT id, poster FROM reviews WHERE title = ? AND year = ?")
        .get(r.title, r.year);
      if (!row || (row.poster && row.poster.trim())) continue;

      const movie = await Promise.race([
        searchMovie(r.title, r.year),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OMDb timeout')), 10000)),
      ]);

      if (movie && movie.poster && movie.poster !== 'N/A') {
        await db
          .prepare('UPDATE reviews SET poster = ?, imdb_id = ? WHERE id = ?')
          .run(movie.poster, movie.imdbId || null, row.id);
        filled++;
      } else {
        console.log(`No poster found for ${r.title} (${r.year}).`);
      }
    } catch (err) {
      console.log(`Poster lookup failed for ${r.title}: ${err.message}`);
    }
  }
  console.log(`Posters added: ${filled}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
