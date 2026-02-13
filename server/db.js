const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath =
  process.env.DB_PATH || path.resolve(__dirname, "database.sqlite");

// Ensure directory exists
const fs = require("fs");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Copy initial database from image if using a separate DB_PATH (e.g. in Docker volume)
const sourceDb = path.resolve(__dirname, "database.sqlite");
if (!fs.existsSync(dbPath) && fs.existsSync(sourceDb) && dbPath !== sourceDb) {
  try {
    console.log(`Initializing database: Copying from ${sourceDb} to ${dbPath}`);
    fs.copyFileSync(sourceDb, dbPath);
  } catch (err) {
    console.error("Error copying initial database:", err);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database");
    db.run("PRAGMA foreign_keys = ON");
  }
});

function initDb() {
  db.serialize(() => {
    // Opravneni
    db.run(`CREATE TABLE IF NOT EXISTS opravneni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT UNIQUE NOT NULL
    )`);

    // Insert default roles if they don't exist
    db.run(`INSERT OR IGNORE INTO opravneni (id, nazev) VALUES (0, 'zak')`);
    db.run(`INSERT OR IGNORE INTO opravneni (id, nazev) VALUES (1, 'ucitel')`);
    db.run(
      `INSERT OR IGNORE INTO opravneni (id, nazev) VALUES (2, 'administrator')`
    );

    // Ucty
    db.run(`CREATE TABLE IF NOT EXISTS ucty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      jmeno TEXT,
      prijmeni TEXT,
      obrazek_url TEXT,
      id_opravneni INTEGER NOT NULL DEFAULT 0,
      google_drive_refresh_token TEXT,
      FOREIGN KEY (id_opravneni) REFERENCES opravneni (id)
    )`);

    // Form
    db.run(`CREATE TABLE IF NOT EXISTS form (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      datum_vytvoreni TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      datum_odevzdani DATE,
      id_ucet INTEGER NOT NULL,
      FOREIGN KEY (id_ucet) REFERENCES ucty (id)
    )`);

    // Nove Oznameni
    db.run(`CREATE TABLE IF NOT EXISTS nove_oznameni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      datum_vytvoreni TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      datum_odevzdani DATE,
      id_ucet INTEGER NOT NULL,
      FOREIGN KEY (id_ucet) REFERENCES ucty (id)
    )`);

    // Soubory
    db.run(`CREATE TABLE IF NOT EXISTS soubory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_file_id TEXT UNIQUE NOT NULL,
      nazev_souboru TEXT,
      id_vlastnika_uctu INTEGER NOT NULL,
      id_form INTEGER NOT NULL,
      FOREIGN KEY (id_vlastnika_uctu) REFERENCES ucty (id),
      FOREIGN KEY (id_form) REFERENCES form (id)
    )`);

    // Trida
    db.run(
      `CREATE TABLE IF NOT EXISTS trida (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT,
      vlastnik_id INTEGER NOT NULL,
      predmet TEXT,
      rocnik TEXT,
      ucebna TEXT,
      barva TEXT,
      kod TEXT UNIQUE,
      FOREIGN KEY (vlastnik_id) REFERENCES ucty (id)
    )`,
      (err) => {
        if (!err) {
          // Attempt to add columns if they don't exist (migration for existing tables)
          const columnsToAdd = [
            { name: "predmet", type: "TEXT" },
            { name: "rocnik", type: "TEXT" },
            { name: "ucebna", type: "TEXT" },
            { name: "barva", type: "TEXT" },
            { name: "kod", type: "TEXT" },
          ];

          columnsToAdd.forEach((col) => {
            db.run(
              `ALTER TABLE trida ADD COLUMN ${col.name} ${col.type}`,
              (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes("duplicate column name")) {
                  console.error(`Error adding column ${col.name}:`, err);
                }
              }
            );
          });
        }
      }
    );

    // Ukoly
    db.run(
      `CREATE TABLE IF NOT EXISTS ukoly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT,
      popis TEXT,
      datum_odevzdani DATE,
      id_tridy INTEGER NOT NULL,
      typ TEXT DEFAULT 'classic', -- 'classic', 'test', 'outcome', 'predefined_test'
      test_id INTEGER, -- Link to testy_sablony
      FOREIGN KEY (id_tridy) REFERENCES trida (id) ON DELETE CASCADE,
      FOREIGN KEY (test_id) REFERENCES testy_sablony (id) ON DELETE SET NULL
    )`,
      (err) => {
        if (!err) {
          const columnsToAdd = [
            { name: "typ", type: "TEXT DEFAULT 'classic'" },
          ];
          columnsToAdd.forEach((col) => {
            db.run(
              `ALTER TABLE ukoly ADD COLUMN ${col.name} ${col.type}`,
              (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                }
              }
            );
          });
          db.run("ALTER TABLE ukoly ADD COLUMN test_id INTEGER", (err) => { });
        }
      }
    );

    // Test Sablony (Templates)
    db.run(`CREATE TABLE IF NOT EXISTS testy_sablony (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ucitel_id INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      popis TEXT,
      typ TEXT DEFAULT 'test', -- 'test', 'outcome'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ucitel_id) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Prilohy Ukolu (Attachments for Task)
    db.run(`CREATE TABLE IF NOT EXISTS prilohy_ukolu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ukol_id INTEGER NOT NULL,
      nazev TEXT,
      url TEXT,
      typ TEXT, -- 'link', 'file'
      FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE
    )`);

    // Migration for otazky: Allow NULL ukol_id for templates
    db.all("PRAGMA table_info(otazky)", (err, columns) => {
      if (err) return;
      const ukolIdCol = columns.find((c) => c.name === "ukol_id");
      if (ukolIdCol && ukolIdCol.notnull === 1) {
        // We must recreate the table because SQLite doesn't support DROP NOT NULL
        db.serialize(() => {
          // Backup data
          db.run("CREATE TABLE otazky_backup AS SELECT * FROM otazky");
          db.run("DROP TABLE otazky");
          // Recreate with correct constraints (ukol_id is NULLable)
          db.run(`CREATE TABLE otazky (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ukol_id INTEGER,
            test_id INTEGER,
            text TEXT NOT NULL,
            typ TEXT DEFAULT 'multiple_choice',
            poradi INTEGER,
            body REAL DEFAULT 1.0,
            FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE,
            FOREIGN KEY (test_id) REFERENCES testy_sablony (id) ON DELETE CASCADE
          )`);

          // Identify columns that exist in backup to copy them back
          db.all("PRAGMA table_info(otazky_backup)", (err, backupCols) => {
            if (err) return;
            const bCols = backupCols.map(c => c.name);
            const targetCols = ['id', 'ukol_id', 'test_id', 'text', 'typ', 'poradi', 'body'].filter(c => bCols.includes(c));
            const colList = targetCols.join(', ');
            db.run(`INSERT INTO otazky (${colList}) SELECT ${colList} FROM otazky_backup`);
            db.run("DROP TABLE otazky_backup");
          });
        });
      }
    });

    // Otazky (Questions for Tests) - original CREATE (kept for fresh installs)
    db.run(`CREATE TABLE IF NOT EXISTS otazky (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ukol_id INTEGER,
      test_id INTEGER, -- NEW: can belong to a template
      text TEXT NOT NULL,
      typ TEXT DEFAULT 'multiple_choice',
      poradi INTEGER,
      body REAL DEFAULT 1.0,
      FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE,
      FOREIGN KEY (test_id) REFERENCES testy_sablony (id) ON DELETE CASCADE
    )`, (err) => {
      if (!err) {
        db.run("ALTER TABLE otazky ADD COLUMN body REAL DEFAULT 1.0", (err) => { });
        db.run("ALTER TABLE otazky ADD COLUMN test_id INTEGER", (err) => { });
      }
    });

    // Moznosti (Options for Questions)
    db.run(`CREATE TABLE IF NOT EXISTS moznosti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      otazka_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      je_spravna INTEGER DEFAULT 0, -- 0 or 1
      FOREIGN KEY (otazka_id) REFERENCES otazky (id) ON DELETE CASCADE
    )`);

    // Odevzdani (Submissions)
    db.run(`CREATE TABLE IF NOT EXISTS odevzdani (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ukol_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      datum_odevzdani TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      stav TEXT DEFAULT 'submitted', -- 'submitted', 'graded'
      hodnoceni TEXT, -- Grade or points
      poznamka TEXT,
      FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Student Odpovedi (Answers to Test Questions)
    db.run(`CREATE TABLE IF NOT EXISTS student_odpovedi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      odevzdani_id INTEGER NOT NULL,
      otazka_id INTEGER NOT NULL,
      moznost_id INTEGER, -- For multiple choice
      text_odpovedi TEXT, -- For open questions (future proofing)
      FOREIGN KEY (odevzdani_id) REFERENCES odevzdani (id) ON DELETE CASCADE,
      FOREIGN KEY (otazka_id) REFERENCES otazky (id) ON DELETE CASCADE,
      FOREIGN KEY (moznost_id) REFERENCES moznosti (id) ON DELETE CASCADE
    )`);

    // Migration for ukol_vysledky: Allow NULL ukol_id for templates
    db.all("PRAGMA table_info(ukol_vysledky)", (err, columns) => {
      if (err) return;
      const ukolIdCol = columns.find((c) => c.name === "ukol_id");
      if (ukolIdCol && ukolIdCol.notnull === 1) {
        db.serialize(() => {
          db.run("CREATE TABLE ukol_vysledky_backup AS SELECT * FROM ukol_vysledky");
          db.run("DROP TABLE ukol_vysledky");
          db.run(`CREATE TABLE ukol_vysledky (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ukol_id INTEGER,
            test_id INTEGER,
            nazev TEXT NOT NULL,
            FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE,
            FOREIGN KEY (test_id) REFERENCES testy_sablony (id) ON DELETE CASCADE
          )`);

          db.all("PRAGMA table_info(ukol_vysledky_backup)", (err, backupCols) => {
            if (err) return;
            const bCols = backupCols.map(c => c.name);
            const targetCols = ['id', 'ukol_id', 'test_id', 'nazev'].filter(c => bCols.includes(c));
            const colList = targetCols.join(', ');
            db.run(`INSERT INTO ukol_vysledky (${colList}) SELECT ${colList} FROM ukol_vysledky_backup`);
            db.run("DROP TABLE ukol_vysledky_backup");
          });
        });
      }
    });

    // Ukol Vysledky (For Outcome Quizzes)
    db.run(`CREATE TABLE IF NOT EXISTS ukol_vysledky (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ukol_id INTEGER,
      test_id INTEGER, -- NEW: can belong to a template
      nazev TEXT NOT NULL,
      FOREIGN KEY (ukol_id) REFERENCES ukoly (id) ON DELETE CASCADE,
      FOREIGN KEY (test_id) REFERENCES testy_sablony (id) ON DELETE CASCADE
    )`, (err) => {
      if (!err) {
        db.run("ALTER TABLE ukol_vysledky ADD COLUMN test_id INTEGER", (err) => { });
      }
    });

    // Moznost Vysledek Body (For mapping options to outcomes)
    db.run(`CREATE TABLE IF NOT EXISTS moznost_vysledek_body (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moznost_id INTEGER NOT NULL,
      vysledek_id INTEGER NOT NULL,
      body REAL DEFAULT 0.0,
      FOREIGN KEY (moznost_id) REFERENCES moznosti (id) ON DELETE CASCADE,
      FOREIGN KEY (vysledek_id) REFERENCES ukol_vysledky (id) ON DELETE CASCADE
    )`);

    // Odevzdani Prilohy (Files/Links submitted by student for Classic tasks)
    db.run(`CREATE TABLE IF NOT EXISTS odevzdani_prilohy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      odevzdani_id INTEGER NOT NULL,
      nazev TEXT,
      url TEXT,
      typ TEXT,
      FOREIGN KEY (odevzdani_id) REFERENCES odevzdani (id) ON DELETE CASCADE
    )`);

    // Trida Zaci
    db.run(`CREATE TABLE IF NOT EXISTS trida_zaci (
      id_tridy INTEGER,
      id_uctu INTEGER,
      PRIMARY KEY (id_tridy, id_uctu),
      FOREIGN KEY (id_tridy) REFERENCES trida (id) ON DELETE CASCADE,
      FOREIGN KEY (id_uctu) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Trida Ucitele (Invited Teachers)
    db.run(`CREATE TABLE IF NOT EXISTS trida_ucitele (
      id_tridy INTEGER,
      id_uctu INTEGER,
      PRIMARY KEY (id_tridy, id_uctu),
      FOREIGN KEY (id_tridy) REFERENCES trida (id) ON DELETE CASCADE,
      FOREIGN KEY (id_uctu) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Notisek Topics
    db.run(`CREATE TABLE IF NOT EXISTS notisek_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      poradi INTEGER DEFAULT 0,
      FOREIGN KEY (teacher_id) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Migration for notisek_topics (remove class_id, add poradi)
    db.all("PRAGMA table_info(notisek_topics)", (err, columns) => {
      if (!err && columns) {
        const hasClassId = columns.some(c => c.name === 'class_id');
        const hasPoradi = columns.some(c => c.name === 'poradi');

        if (hasClassId) {
          console.log("Migrating notisek_topics: Removing class_id and adding poradi...");
          db.serialize(() => {
            db.run("PRAGMA foreign_keys = OFF");
            db.run("CREATE TABLE notisek_topics_new (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER NOT NULL, title TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, poradi INTEGER DEFAULT 0, FOREIGN KEY (teacher_id) REFERENCES ucty (id) ON DELETE CASCADE)");
            db.run("INSERT INTO notisek_topics_new (id, teacher_id, title, created_at, updated_at) SELECT id, teacher_id, title, created_at, updated_at FROM notisek_topics");
            db.run("DROP TABLE notisek_topics");
            db.run("ALTER TABLE notisek_topics_new RENAME TO notisek_topics");
            db.run("PRAGMA foreign_keys = ON");
          });
        } else if (!hasPoradi) {
          db.run("ALTER TABLE notisek_topics ADD COLUMN poradi INTEGER DEFAULT 0");
        }
      }
    });

    // Notisek Cards
    db.run(`CREATE TABLE IF NOT EXISTS notisek_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      link_url TEXT,
      link_text TEXT,
      image_url TEXT,
      ord INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES notisek_topics (id) ON DELETE CASCADE
    )`);

    // Skoly (Universities/Schools for teacher contacts)
    db.run(`CREATE TABLE IF NOT EXISTS skoly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      adresa TEXT,
      fakulta TEXT,
      obor TEXT,
      web TEXT,
      email TEXT,
      poznamka TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES ucty (id) ON DELETE CASCADE
    )`);

    // Kontakty (Contacts for teachers - people from universities)
    db.run(`CREATE TABLE IF NOT EXISTS kontakty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      skola_id INTEGER,
      jmeno TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      pozice TEXT,
      poznamka TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES ucty (id) ON DELETE CASCADE,
      FOREIGN KEY (skola_id) REFERENCES skoly (id) ON DELETE SET NULL
    )`);

    // Portfolio (Student Portfolio Files)
    db.run(`CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      popis TEXT,
      google_file_id TEXT,
      google_file_url TEXT,
      mime_type TEXT,
      velikost INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES ucty (id) ON DELETE CASCADE
    )`);
  });
}

module.exports = { db, initDb };
