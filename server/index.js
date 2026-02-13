const fs = require("fs");
const path = require("path");

// Load .env.local if it exists, otherwise .env
const envPath = fs.existsSync(path.resolve(__dirname, ".env.local"))
  ? ".env.local"
  : ".env";
require("dotenv").config({ path: envPath });

console.log(`Loaded environment from ${envPath}`);
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "Set" : "Not Set");
console.log("CLIENT_SECRET:", process.env.CLIENT_SECRET ? "Set" : "Not Set");
console.log("REDIRECT_URI (env):", process.env.REDIRECT_URI);

const fastify = require("fastify")({
  logger: true,
  trustProxy: true, // Důležité pro Cloudflare/Proxy
});
const { google } = require("googleapis");
const { db, initDb } = require("./db");

// Initialize Database
initDb();

// Check for admin override from admin.txt on startup
const promoteAdminFromTextFile = () => {
  const adminFile = path.resolve(__dirname, "admin.txt");
  if (fs.existsSync(adminFile)) {
    const adminEmail = fs.readFileSync(adminFile, "utf-8").trim();
    if (adminEmail) {
      db.get(
        "SELECT id, id_opravneni FROM ucty WHERE email = ?",
        [adminEmail],
        (err, row) => {
          if (row && row.id_opravneni !== 2) {
            db.run(
              "UPDATE ucty SET id_opravneni = 2 WHERE id = ?",
              [row.id],
              (err) => {
                if (!err)
                  console.log(`Startup: Promoted ${adminEmail} to admin.`);
                else console.error("Startup: Failed to promote admin", err);
              }
            );
          }
        }
      );
    }
  }
};

// Run the check shortly after startup to ensure DB is ready
setTimeout(promoteAdminFromTextFile, 1000);

// Register Plugins
fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/cookie"));
fastify.register(require("@fastify/session"), {
  secret:
    process.env.SESSION_SECRET ||
    "a_very_long_secret_key_that_should_be_in_env",
  cookie: {
    secure: process.env.NODE_ENV === "production", // Automaticky detekuje HTTPS (díky trustProxy)
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
  saveUninitialized: false,
});
fastify.register(require("@fastify/cors"), {
  origin: process.env.ALLOWED_ORIGIN, // Allow frontend
  credentials: true,
});

fastify.register(require("@fastify/multipart"), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const baseUrl = process.env.BASE_URL;

// Google OAuth2 Client
const redirectUri =
  process.env.REDIRECT_URI || `${baseUrl}/auth/google/callback`;
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  redirectUri
);
console.log("Google Auth Configured with Redirect URI:", redirectUri);

// Helper to get user from DB
const getUserByGoogleId = (googleId) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM ucty WHERE google_id = ?", [googleId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const createUser = (googleId, email, name, picture, refreshToken) => {
  return new Promise((resolve, reject) => {
    // Default role is 0 (zak)
    db.run(
      `INSERT INTO ucty (google_id, email, jmeno, prijmeni, obrazek_url, id_opravneni, google_drive_refresh_token) 
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [googleId, email, name, "", picture, refreshToken],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const updateUserToken = (id, refreshToken) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE ucty SET google_drive_refresh_token = ? WHERE id = ?",
      [refreshToken, id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Helper to generate a 7-character alphanumeric code
const generateClassCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper function to check if a code is unique
const isCodeUnique = (code) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT 1 FROM trida WHERE kod = ?", [code], (err, row) => {
      if (err) reject(err);
      else resolve(!row);
    });
  });
};

const getUniqueClassCode = async () => {
  let code = generateClassCode();
  let unique = await isCodeUnique(code);
  while (!unique) {
    code = generateClassCode();
    unique = await isCodeUnique(code);
  }
  return code;
};


// Routes

// 1. Redirect to Google
fastify.get("/auth/google", async (request, reply) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // To get refresh token
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.file", // jinak to vrátit pokud by něco blbbo tak nahradit za "https://www.googleapis.com/auth/drive.file",
    ],
    prompt: "consent", // Force consent to ensure we get refresh token
    redirect_uri: redirectUri, // Explicitly pass redirect_uri
  });
  console.log("Generated Auth URL:", url);
  return reply.redirect(url);
});

// 2. Google Callback
fastify.get("/auth/google/callback", async (request, reply) => {
  const { code, error } = request.query;

  if (error === "access_denied") {
    return reply.redirect(baseUrl + "/login");
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get User Info
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const { id: googleId, email, name, picture } = userInfo.data;

    // Check if user exists
    let user = await getUserByGoogleId(googleId);

    if (!user) {
      // Create new user
      const userId = await createUser(
        googleId,
        email,
        name,
        picture,
        tokens.refresh_token
      );
      user = {
        id: userId,
        google_id: googleId,
        email,
        id_opravneni: 0,
        jmeno: name,
        obrazek_url: picture,
      };
    } else if (tokens.refresh_token) {
      // Update refresh token if provided
      await updateUserToken(user.id, tokens.refresh_token);
    }

    // Check for admin override from admin.txt
    const adminFile = path.resolve(__dirname, "admin.txt");
    if (fs.existsSync(adminFile)) {
      const adminEmail = fs.readFileSync(adminFile, "utf-8").trim();
      // If user email matches admin file AND they are not already admin (or even if they are, just to be safe/consistent)
      if (email === adminEmail && user.id_opravneni !== 2) {
        console.log(`Promoting ${email} to admin based on admin.txt`);
        await new Promise((resolve, reject) => {
          db.run(
            "UPDATE ucty SET id_opravneni = 2 WHERE id = ?",
            [user.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        user.id_opravneni = 2;
      }
    }

    // Set Session
    request.session.user = {
      id: user.id,
      email: user.email,
      role: user.id_opravneni,
      name: user.jmeno,
      picture: user.obrazek_url,
    };

    // Redirect to frontend
    // Redirect to frontend based on role
    let redirectPath = "/zak";
    if (user.id_opravneni === 2) {
      redirectPath = "/administrator";
    } else if (user.id_opravneni === 1) {
      redirectPath = "/ucitel";
    }

    return reply.redirect(baseUrl + redirectPath);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send("Authentication failed");
  }
});

// 3. Get Current User (for frontend)
fastify.get("/api/me", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ authenticated: false });
  }
  return { authenticated: true, user: request.session.user };
});

//// 4. Logout
fastify.get("/auth/logout", async (request, reply) => {
  if (request.session) {
    await request.session.destroy();
  }
  return reply.redirect(baseUrl + "/login");
  request.log.error("Error calling service 6601:", error);
  return reply
    .status(500)
    .send({ error: "Failed to communicate with service 6601" });
}
);

// 5. Admin/Teacher: Get All Users
fastify.get("/api/users", async (request, reply) => {
  if (!request.session.user || (request.session.user.role !== 1 && request.session.user.role !== 2)) {
    // 1 = teacher, 2 = administrator
    return reply.status(403).send({ error: "Unauthorized" });
  }
  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT u.*, o.nazev as role_name 
            FROM ucty u 
            LEFT JOIN opravneni o ON u.id_opravneni = o.id
        `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 6. Admin: Update User Role
fastify.put("/api/users/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { role } = request.body;

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE ucty SET id_opravneni = ? WHERE id = ?",
      [role, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, changes: this.changes });
      }
    );
  });
});

// 7. Admin: Get All Classes
fastify.get("/api/classes", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM trida", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// 8. Admin: Assign User to Class
fastify.post("/api/users/:id/classes", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { classId } = request.body;

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO trida_zaci (id_tridy, id_uctu) VALUES (?, ?)",
      [classId, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// 9. Admin: Remove User from Class
fastify.delete("/api/users/:id/classes/:classId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id, classId } = request.params;

  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM trida_zaci WHERE id_tridy = ? AND id_uctu = ?",
      [classId, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// 10. Admin: Get User Classes
fastify.get("/api/users/:id/classes", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT t.* 
            FROM trida t
            JOIN trida_zaci tz ON t.id = tz.id_tridy
            WHERE tz.id_uctu = ?
        `,
      [id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// --- TEACHER ROUTES (Role 1) ---

// 11. Teacher: Get My Classes
fastify.get("/api/teacher/classes", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    // 1 = ucitel
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT t.*, 
            (SELECT COUNT(*) FROM trida_zaci tz WHERE tz.id_tridy = t.id) as studentCount,
            CASE WHEN t.vlastnik_id = ? THEN 1 ELSE 0 END as isOwner
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.vlastnik_id = ? OR tu.id_uctu = ?
            GROUP BY t.id
        `,
      [userId, userId, userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 12. Teacher: Create Class
fastify.post("/api/teacher/classes", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { subject, section, room, color } = request.body;
  const kod = await getUniqueClassCode();

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO trida (nazev, vlastnik_id, predmet, rocnik, ucebna, barva, kod) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [subject, userId, subject, section, room, color, kod],
      function (err) {
        if (err) reject(err);
        else
          resolve({
            id: this.lastID,
            subject,
            section,
            room,
            color,
            kod,
            studentCount: 0,
          });
      }
    );
  });
});

// 13. Teacher: Update Class
fastify.put("/api/teacher/classes/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { subject, section, room, color } = request.body;
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    // Ensure user owns the class
    db.run(
      "UPDATE trida SET predmet = ?, rocnik = ?, ucebna = ?, barva = ?, nazev = ? WHERE id = ? AND vlastnik_id = ?",
      [subject, section, room, color, subject, id, userId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0)
          reject(new Error("Class not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 14. Teacher: Delete Class
fastify.delete("/api/teacher/classes/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Explicitly delete deep relationships (Manual Cascade)
      // Options for questions in tasks of this class
      db.run("DELETE FROM moznosti WHERE otazka_id IN (SELECT id FROM otazky WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?))", [id]);

      // Student answers for submissions in tasks of this class
      db.run("DELETE FROM student_odpovedi WHERE odevzdani_id IN (SELECT id FROM odevzdani WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?))", [id]);

      // Attachments for submissions
      db.run("DELETE FROM odevzdani_prilohy WHERE odevzdani_id IN (SELECT id FROM odevzdani WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?))", [id]);

      // Questions
      db.run("DELETE FROM otazky WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?)", [id]);

      // Submissions
      db.run("DELETE FROM odevzdani WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?)", [id]);

      // Task attachments
      db.run("DELETE FROM prilohy_ukolu WHERE ukol_id IN (SELECT id FROM ukoly WHERE id_tridy = ?)", [id]);

      // Tasks
      db.run("DELETE FROM ukoly WHERE id_tridy = ?", [id]);

      // Class relationships
      db.run("DELETE FROM trida_zaci WHERE id_tridy = ?", [id]);
      db.run("DELETE FROM trida_ucitele WHERE id_tridy = ?", [id]);

      // 2. Delete the class
      db.run(
        "DELETE FROM trida WHERE id = ? AND vlastnik_id = ?",
        [id, userId],
        function (err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error("Class not found or unauthorized"));
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });
});

// 14a. Teacher: Get Invited Teachers
fastify.get("/api/teacher/classes/:id/teachers", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id, vlastnik_id FROM trida WHERE id = ?",
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) return reply.status(404).send({ error: "Class not found" });

  // Check if user is owner or invited
  const isOwner = classCheck.vlastnik_id === userId;
  const isInvited = await new Promise((resolve, reject) => {
    db.get(
      "SELECT 1 FROM trida_ucitele WHERE id_tridy = ? AND id_uctu = ?",
      [id, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });

  if (!isOwner && !isInvited) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT u.id, u.jmeno, u.prijmeni, u.email, u.obrazek_url
            FROM ucty u
            JOIN trida_ucitele tu ON u.id = tu.id_uctu
            WHERE tu.id_tridy = ?
        `,
      [id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 14b. Teacher: Invite Teacher
fastify.post("/api/teacher/classes/:id/teachers", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { email, userId: teacherUserId } = request.body;
  const userId = request.session.user.id;

  // Verify ownership - ONLY OWNER CAN INVITE
  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM trida WHERE id = ? AND vlastnik_id = ?",
      [id, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  // Find teacher by email or userId
  let teacher;
  if (teacherUserId) {
    teacher = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, id_opravneni FROM ucty WHERE id = ?",
        [teacherUserId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  } else if (email) {
    teacher = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, id_opravneni FROM ucty WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  } else {
    return reply.status(400).send({ error: "Email or userId required" });
  }

  if (!teacher) {
    return reply.status(404).send({ error: "Teacher not found" });
  }
  if (teacher.id_opravneni !== 1) {
    return reply.status(400).send({ error: "User is not a teacher" });
  }
  if (teacher.id === userId) {
    return reply.status(400).send({ error: "Cannot invite yourself" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO trida_ucitele (id_tridy, id_uctu) VALUES (?, ?)",
      [id, teacher.id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, teacherId: teacher.id });
      }
    );
  });
});

// 14c. Teacher: Remove Teacher
fastify.delete(
  "/api/teacher/classes/:id/teachers/:teacherId",
  async (request, reply) => {
    if (!request.session.user || request.session.user.role !== 1) {
      return reply.status(403).send({ error: "Unauthorized" });
    }
    const { id, teacherId } = request.params;
    const userId = request.session.user.id;

    // Verify ownership - ONLY OWNER CAN REMOVE
    const classCheck = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM trida WHERE id = ? AND vlastnik_id = ?",
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!classCheck) {
      return reply.status(403).send({ error: "Unauthorized class access" });
    }

    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM trida_ucitele WHERE id_tridy = ? AND id_uctu = ?",
        [id, teacherId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }
);

// 15a. TEST TEMPLATES
fastify.get("/api/teacher/templates", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  return new Promise((resolve, reject) => {
    db.all("SELECT id, nazev, popis, typ, created_at FROM testy_sablony WHERE ucitel_id = ? ORDER BY created_at DESC", [userId], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
});

fastify.post("/api/teacher/templates", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { nazev, popis, typ, questions, outcomes } = request.body;

  const testId = await new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO testy_sablony (ucitel_id, nazev, popis, typ) VALUES (?, ?, ?, ?)",
      [userId, nazev, popis, typ],
      function (err) {
        if (err) reject(err); else resolve(this.lastID);
      }
    );
  });

  // Handle Outcomes
  const outcomeMap = {};
  if (typ === "outcome" && outcomes && Array.isArray(outcomes)) {
    for (const out of outcomes) {
      const outId = await new Promise((resolve, reject) => {
        db.run("INSERT INTO ukol_vysledky (test_id, nazev) VALUES (?, ?)", [testId, out.nazev], function (err) {
          if (err) reject(err); else resolve(this.lastID);
        });
      });
      outcomeMap[out.nazev] = outId;
    }
  }

  // Handle Questions
  if (questions && Array.isArray(questions)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO otazky (test_id, text, typ, poradi, body) VALUES (?, ?, ?, ?, ?)",
          [testId, q.text, "multiple_choice", i, q.points || 1.0],
          function (err) {
            if (err) reject(err); else resolve(this.lastID);
          }
        );
      });

      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          const optId = await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO moznosti (otazka_id, text, je_spravna) VALUES (?, ?, ?)",
              [qId, opt.text, opt.isCorrect ? 1 : 0],
              function (err) { if (err) reject(err); else resolve(this.lastID); }
            );
          });

          if (typ === "outcome" && opt.outcomePoints) {
            const outPointStmt = db.prepare("INSERT INTO moznost_vysledek_body (moznost_id, vysledek_id, body) VALUES (?, ?, ?)");
            for (const [outName, points] of Object.entries(opt.outcomePoints)) {
              const outId = outcomeMap[outName];
              if (outId) outPointStmt.run(optId, outId, points);
            }
            outPointStmt.finalize();
          }
        }
      }
    }
  }

  return { success: true, id: testId };
});

fastify.get("/api/teacher/templates/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  const test = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM testy_sablony WHERE id = ? AND ucitel_id = ?", [id, userId], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
  if (!test) return reply.status(404).send({ error: "Template not found" });

  const result = { ...test };

  if (test.typ === "outcome") {
    result.outcomes = await new Promise((resolve, reject) => {
      db.all("SELECT id, nazev FROM ukol_vysledky WHERE test_id = ?", [id], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
  }

  const questions = await new Promise((resolve, reject) => {
    db.all("SELECT id, text, poradi, body as points FROM otazky WHERE test_id = ? ORDER BY poradi ASC", [id], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });

  for (const q of questions) {
    const options = await new Promise((resolve, reject) => {
      db.all("SELECT id, text, je_spravna as isCorrect FROM moznosti WHERE otazka_id = ?", [q.id], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    for (const opt of options) {
      opt.isCorrect = opt.isCorrect === 1;
      if (test.typ === "outcome") {
        const outPoints = await new Promise((resolve, reject) => {
          db.all("SELECT uv.nazev, mvb.body FROM moznost_vysledek_body mvb JOIN ukol_vysledky uv ON mvb.vysledek_id = uv.id WHERE mvb.moznost_id = ?", [opt.id], (err, rows) => {
            if (err) reject(err); else resolve(rows);
          });
        });
        opt.outcomePoints = {};
        outPoints.forEach(p => opt.outcomePoints[p.nazev] = p.body);
      }
    }
    q.options = options;
  }
  result.questions = questions;
  return result;
});

fastify.put("/api/teacher/templates/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;
  const { nazev, popis, typ, questions, outcomes } = request.body;

  const testCheck = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM testy_sablony WHERE id = ? AND ucitel_id = ?", [id, userId], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
  if (!testCheck) return reply.status(404).send({ error: "Template not found" });

  await new Promise((resolve, reject) => {
    db.run("UPDATE testy_sablony SET nazev = ?, popis = ?, typ = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nazev, popis, typ, id], (err) => {
      if (err) reject(err); else resolve();
    });
  });

  // Clear old data
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM otazky WHERE test_id = ?", [id], (err) => {
      if (err) reject(err); else resolve();
    });
  });
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM ukol_vysledky WHERE test_id = ?", [id], (err) => {
      if (err) reject(err); else resolve();
    });
  });

  // Handle Outcomes
  const outcomeMap = {};
  if (typ === "outcome" && outcomes && Array.isArray(outcomes)) {
    for (const out of outcomes) {
      const outId = await new Promise((resolve, reject) => {
        db.run("INSERT INTO ukol_vysledky (test_id, nazev) VALUES (?, ?)", [id, out.nazev], function (err) {
          if (err) reject(err); else resolve(this.lastID);
        });
      });
      outcomeMap[out.nazev] = outId;
    }
  }

  // Handle Questions
  if (questions && Array.isArray(questions)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = await new Promise((resolve, reject) => {
        db.run("INSERT INTO otazky (test_id, text, typ, poradi, body) VALUES (?, ?, ?, ?, ?)", [id, q.text, "multiple_choice", i, q.points || 1.0], function (err) {
          if (err) reject(err); else resolve(this.lastID);
        });
      });

      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          const optId = await new Promise((resolve, reject) => {
            db.run("INSERT INTO moznosti (otazka_id, text, je_spravna) VALUES (?, ?, ?)", [qId, opt.text, opt.isCorrect ? 1 : 0], function (err) {
              if (err) reject(err); else resolve(this.lastID);
            });
          });
          if (typ === "outcome" && opt.outcomePoints) {
            const outPointStmt = db.prepare("INSERT INTO moznost_vysledek_body (moznost_id, vysledek_id, body) VALUES (?, ?, ?)");
            for (const [outName, points] of Object.entries(opt.outcomePoints)) {
              const outId = outcomeMap[outName];
              if (outId) outPointStmt.run(optId, outId, points);
            }
            outPointStmt.finalize();
          }
        }
      }
    }
  }
  return { success: true };
});

fastify.delete("/api/teacher/templates/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM testy_sablony WHERE id = ? AND ucitel_id = ?", [id, userId], function (err) {
      if (err) reject(err); else resolve({ success: true });
    });
  });
});

// 15. Teacher: Get Tasks
fastify.get("/api/teacher/tasks", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT u.id, u.nazev as title, u.popis as description, u.datum_odevzdani as dueDate, u.id_tridy as classId, u.typ as type
            FROM ukoly u
            JOIN trida t ON u.id_tridy = t.id
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.vlastnik_id = ? OR tu.id_uctu = ?
        `,
      [userId, userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 16. Teacher: Create Task
fastify.post("/api/teacher/tasks", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const {
    title,
    description,
    dueDate,
    classId,
    type = "classic",
    attachments,
    questions,
    testId: bodyTestId,
  } = request.body;
  const userId = request.session.user.id;

  // Verify class ownership OR membership
  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT t.id 
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [classId, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  // 1. Create Task
  const taskId = await new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO ukoly (nazev, popis, datum_odevzdani, id_tridy, typ, test_id) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, dueDate, classId, type, bodyTestId],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  // 1b. Handle Outcomes (for Outcome Quiz)
  const outcomeMap = {}; // name -> id
  if (type === "outcome" && request.body.outcomes && Array.isArray(request.body.outcomes)) {
    for (const out of request.body.outcomes) {
      const outId = await new Promise((resolve, reject) => {
        db.run("INSERT INTO ukol_vysledky (ukol_id, nazev) VALUES (?, ?)", [taskId, out.nazev], function (err) {
          if (err) reject(err); else resolve(this.lastID);
        });
      });
      outcomeMap[out.nazev] = outId;
    }
  }

  // 2. Handle Attachments (for Classic)
  if (type === "classic" && attachments && Array.isArray(attachments)) {
    const stmt = db.prepare(
      "INSERT INTO prilohy_ukolu (ukol_id, nazev, url, typ) VALUES (?, ?, ?, ?)"
    );
    for (const att of attachments) {
      stmt.run(taskId, att.name, att.url, att.type || "link");
    }
    stmt.finalize();
  }

  // 3. Handle Questions (for Test/Outcome)
  if ((type === "test" || type === "outcome") && questions && Array.isArray(questions)) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO otazky (ukol_id, text, typ, poradi, body) VALUES (?, ?, ?, ?, ?)",
          [taskId, q.text, "multiple_choice", i, q.points || 1.0],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          const optId = await new Promise((resolve, reject) => {
            db.run(
              "INSERT INTO moznosti (otazka_id, text, je_spravna) VALUES (?, ?, ?)",
              [qId, opt.text, opt.isCorrect ? 1 : 0],
              function (err) { if (err) reject(err); else resolve(this.lastID); }
            );
          });

          // Handle Outcome Points
          if (type === "outcome" && opt.outcomePoints) {
            const outPointStmt = db.prepare("INSERT INTO moznost_vysledek_body (moznost_id, vysledek_id, body) VALUES (?, ?, ?)");
            for (const [outName, points] of Object.entries(opt.outcomePoints)) {
              const outId = outcomeMap[outName];
              if (outId) {
                outPointStmt.run(optId, outId, points);
              }
            }
            outPointStmt.finalize();
          }
        }
      }
    }
  }

  return { success: true, id: taskId };
});

// 17. Teacher: Delete Task
fastify.delete("/api/teacher/tasks/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.run(
      `
            DELETE FROM ukoly 
            WHERE id = ? AND id_tridy IN (
                SELECT t.id FROM trida t
                LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
                WHERE t.vlastnik_id = ? OR tu.id_uctu = ?
            )
        `,
      [id, userId, userId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0)
          reject(new Error("Task not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 17b. Teacher: Update Task
fastify.put("/api/teacher/tasks/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const {
    title,
    description,
    dueDate,
    type = "classic",
    attachments,
    questions,
    outcomes,
    testId: bodyTestId,
  } = request.body;
  const userId = request.session.user.id;

  // Verify access
  const taskAccess = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT u.id 
            FROM ukoly u
            JOIN trida t ON u.id_tridy = t.id
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE u.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [id, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!taskAccess) {
    return reply.status(403).send({ error: "Unauthorized task access" });
  }

  // Update Task Details
  await new Promise((resolve, reject) => {
    db.run(
      "UPDATE ukoly SET nazev = ?, popis = ?, datum_odevzdani = ?, typ = ?, test_id = ? WHERE id = ?",
      [title, description, dueDate, type, bodyTestId, id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Handle Attachments (Classic)
  if (type === "classic") {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM prilohy_ukolu WHERE ukol_id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (attachments && Array.isArray(attachments)) {
      const stmt = db.prepare(
        "INSERT INTO prilohy_ukolu (ukol_id, nazev, url, typ) VALUES (?, ?, ?, ?)"
      );
      for (const att of attachments) {
        stmt.run(id, att.name, att.url, att.type || "link");
      }
      stmt.finalize();
    }
  }

  // Handle Outcomes (Outcome Quiz)
  const outcomeMap = {};
  if (type === "outcome") {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM ukol_vysledky WHERE ukol_id = ?", [id], (err) => {
        if (err) reject(err); else resolve();
      });
    });
    if (outcomes && Array.isArray(outcomes)) {
      for (const out of outcomes) {
        const outId = await new Promise((resolve, reject) => {
          db.run("INSERT INTO ukol_vysledky (ukol_id, nazev) VALUES (?, ?)", [id, out.nazev], function (err) {
            if (err) reject(err); else resolve(this.lastID);
          });
        });
        outcomeMap[out.nazev] = outId;
      }
    }
  }

  // Handle Questions (Test/Outcome)
  if (type === "test" || type === "outcome") {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM otazky WHERE ukol_id = ?", [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO otazky (ukol_id, text, typ, poradi, body) VALUES (?, ?, ?, ?, ?)",
            [id, q.text, "multiple_choice", i, q.points || 1.0],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        if (q.options && Array.isArray(q.options)) {
          for (const opt of q.options) {
            const optId = await new Promise((resolve, reject) => {
              db.run(
                "INSERT INTO moznosti (otazka_id, text, je_spravna) VALUES (?, ?, ?)",
                [qId, opt.text, opt.isCorrect ? 1 : 0],
                function (err) { if (err) reject(err); else resolve(this.lastID); }
              );
            });

            if (type === "outcome" && opt.outcomePoints) {
              const outPointStmt = db.prepare("INSERT INTO moznost_vysledek_body (moznost_id, vysledek_id, body) VALUES (?, ?, ?)");
              for (const [outName, points] of Object.entries(opt.outcomePoints)) {
                const outId = outcomeMap[outName];
                if (outId) {
                  outPointStmt.run(optId, outId, points);
                }
              }
              outPointStmt.finalize();
            }
          }
        }
      }
    }
  }

  return { success: true };
});

// 17c. Teacher: Get Task Detail
fastify.get("/api/teacher/tasks/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  // Verify access
  const task = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT u.id, u.nazev as title, u.popis as description, u.datum_odevzdani as dueDate, u.id_tridy as classId, u.typ as type, u.test_id as testId
            FROM ukoly u
            JOIN trida t ON u.id_tridy = t.id
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE u.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [id, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!task) {
    return reply.status(403).send({ error: "Unauthorized task access" });
  }

  const result = { ...task };

  if (task.type === "classic") {
    result.attachments = await new Promise((resolve, reject) => {
      db.all(
        "SELECT nazev as name, url, typ FROM prilohy_ukolu WHERE ukol_id = ?",
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  } else if (task.type === "test" || task.type === "outcome" || task.type === "predefined_test" || task.testId) {
    const qSource = task.testId ? { col: 'test_id', val: task.testId } : { col: 'ukol_id', val: id };

    if (task.type === "outcome" || task.testId) {
      result.outcomes = await new Promise((resolve, reject) => {
        db.all(`SELECT id, nazev FROM ukol_vysledky WHERE ${qSource.col} = ?`, [qSource.val], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }

    const questions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, text, poradi, body as points FROM otazky WHERE ${qSource.col} = ? ORDER BY poradi ASC`,
        [qSource.val],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    for (const q of questions) {
      const options = await new Promise((resolve, reject) => {
        db.all(
          "SELECT id, text, je_spravna as isCorrect FROM moznosti WHERE otazka_id = ?",
          [q.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      for (const opt of options) {
        opt.isCorrect = opt.isCorrect === 1;
        if (task.type === "outcome" || task.testId) {
          const outcomePoints = await new Promise((resolve, reject) => {
            db.all(`
                      SELECT uv.nazev, mvb.body 
                      FROM moznost_vysledek_body mvb
                      JOIN ukol_vysledky uv ON mvb.vysledek_id = uv.id
                      WHERE mvb.moznost_id = ?
                  `, [opt.id], (err, rows) => {
              if (err) reject(err); else resolve(rows);
            });
          });
          opt.outcomePoints = {};
          outcomePoints.forEach(p => { opt.outcomePoints[p.nazev] = p.body; });
        }
      }
      q.options = options;
    }
    result.questions = questions;
  }

  return result;
});

// 18. Teacher: Get Class Details
fastify.get("/api/teacher/classes/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.get(
      `
            SELECT t.*, CASE WHEN t.vlastnik_id = ? THEN 1 ELSE 0 END as isOwner
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [userId, id, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else if (!row) reply.status(404).send({ error: "Class not found" });
        else resolve(row);
      }
    );
  });
});

// 19. Teacher: Get Class Students
fastify.get("/api/teacher/classes/:id/students", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  // Verify ownership OR membership
  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT t.id 
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [id, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT u.id, u.jmeno, u.prijmeni, u.email, u.obrazek_url
            FROM ucty u
            JOIN trida_zaci tz ON u.id = tz.id_uctu
            WHERE tz.id_tridy = ?
        `,
      [id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 20. Teacher: Add Student to Class
fastify.post("/api/teacher/classes/:id/students", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { email, userId: studentUserId } = request.body;
  const userId = request.session.user.id;

  // Verify ownership OR membership
  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT t.id 
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
      [id, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  // Find user by userId or email
  let student;
  if (studentUserId) {
    student = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM ucty WHERE id = ?", [studentUserId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  } else if (email) {
    student = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM ucty WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  } else {
    return reply.status(400).send({ error: "Email or userId required" });
  }

  if (!student) {
    return reply.status(404).send({ error: "Student not found" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO trida_zaci (id_tridy, id_uctu) VALUES (?, ?)",
      [id, student.id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, studentId: student.id });
      }
    );
  });
});

// 21. Teacher: Remove Student from Class
fastify.delete(
  "/api/teacher/classes/:id/students/:studentId",
  async (request, reply) => {
    if (!request.session.user || request.session.user.role !== 1) {
      return reply.status(403).send({ error: "Unauthorized" });
    }
    const { id, studentId } = request.params;
    const userId = request.session.user.id;

    // Verify ownership OR membership
    const classCheck = await new Promise((resolve, reject) => {
      db.get(
        `
            SELECT t.id 
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
        [id, userId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!classCheck) {
      return reply.status(403).send({ error: "Unauthorized class access" });
    }

    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM trida_zaci WHERE id_tridy = ? AND id_uctu = ?",
        [id, studentId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }
);

// 21b. Teacher: Get Student Tasks in Class
fastify.get(
  "/api/teacher/classes/:classId/students/:studentId/tasks",
  async (request, reply) => {
    if (!request.session.user || request.session.user.role !== 1) {
      return reply.status(403).send({ error: "Unauthorized" });
    }
    const { classId, studentId } = request.params;
    const userId = request.session.user.id;

    // Verify access to class
    const classCheck = await new Promise((resolve, reject) => {
      db.get(
        `
            SELECT t.id 
            FROM trida t
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `,
        [classId, userId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!classCheck) {
      return reply.status(403).send({ error: "Unauthorized class access" });
    }

    // Get all tasks for class and student's submission
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        `
            SELECT u.id, u.nazev as title, u.popis as description, u.datum_odevzdani as dueDate, u.typ as type, u.test_id as testId,
                   ts.typ as templateType,
                   o.id as submissionId, o.stav as status, o.datum_odevzdani as submittedAt, o.hodnoceni
            FROM ukoly u
            LEFT JOIN testy_sablony ts ON u.test_id = ts.id
            LEFT JOIN odevzdani o ON u.id = o.ukol_id AND o.student_id = ?
            WHERE u.id_tridy = ?
            ORDER BY u.datum_odevzdani DESC
        `,
        [studentId, classId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Populate attachments for submitted tasks
    for (const task of tasks) {
      if (task.submissionId) {
        if (task.type === "classic") {
          task.attachments = await new Promise((resolve, reject) => {
            db.all(
              "SELECT nazev as name, url, typ as type FROM odevzdani_prilohy WHERE odevzdani_id = ?",
              [task.submissionId],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              }
            );
          });
        } else if (task.type === "test" || task.type === "outcome" || task.type === "predefined_test") {
          const qSource = task.testId ? { col: 'test_id', val: task.testId } : { col: 'ukol_id', val: task.id };
          const questions = await new Promise((resolve, reject) => {
            db.all(
              `SELECT id, text, poradi, body as points FROM otazky WHERE ${qSource.col} = ? ORDER BY poradi ASC`,
              [qSource.val],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              }
            );
          });

          for (const q of questions) {
            const options = await new Promise((resolve, reject) => {
              db.all(
                "SELECT id, text, je_spravna FROM moznosti WHERE otazka_id = ?",
                [q.id],
                (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                }
              );
            });

            for (const opt of options) {
              if (task.type === "outcome" || task.templateType === "outcome") {
                const outPoints = await new Promise((resolve, reject) => {
                  db.all(`
                        SELECT uv.nazev, mvb.body 
                        FROM moznost_vysledek_body mvb
                        JOIN ukol_vysledky uv ON mvb.vysledek_id = uv.id
                        WHERE mvb.moznost_id = ?
                    `, [opt.id], (err, rows) => {
                    if (err) reject(err); else resolve(rows);
                  });
                });
                opt.outcomePoints = {};
                outPoints.forEach(p => { opt.outcomePoints[p.nazev] = p.body; });
              }
            }

            // For tests/outcomes, we might have multiple selected answers
            const answers = await new Promise((resolve, reject) => {
              db.all(
                "SELECT moznost_id FROM student_odpovedi WHERE odevzdani_id = ? AND otazka_id = ?",
                [task.submissionId, q.id],
                (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
                }
              );
            });

            q.options = options.map((o) => ({
              id: o.id,
              text: o.text,
              isCorrect: o.je_spravna === 1,
              outcomePoints: o.outcomePoints
            }));
            q.studentAnswerIds = answers ? answers.map(a => a.moznost_id) : [];
          }
          task.testResults = questions;

          if (task.type === "outcome" || task.templateType === "outcome") {
            task.outcomes = await new Promise((resolve, reject) => {
              db.all(`SELECT id, nazev FROM ukol_vysledky WHERE ${qSource.col} = ?`, [qSource.val], (err, rows) => {
                if (err) reject(err); else resolve(rows);
              });
            });
          }
        }
      }
    }

    return tasks;
  }
);

// 21b. Student: Join Class via Code
fastify.post("/api/student/join-class", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { code } = request.body;
  const userId = request.session.user.id;

  if (!code || code.length !== 7) {
    return reply.status(400).send({ error: "Invalid code format" });
  }

  // 1. Find the class by code
  const targetClass = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM trida WHERE kod = ?", [code], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!targetClass) {
    return reply.status(404).send({ error: "Class not found with this code" });
  }

  // 2. Add student to class
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO trida_zaci (id_tridy, id_uctu) VALUES (?, ?)",
      [targetClass.id, userId],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, classId: targetClass.id });
      }
    );
  });
});

// 22. Student: Get My Class (Existing)
fastify.get("/api/student/me/class", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.get(
      `
            SELECT t.* 
            FROM trida t
            JOIN trida_zaci tz ON t.id = tz.id_tridy
            WHERE tz.id_uctu = ?
        `,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else if (!row) reply.status(404).send({ error: "No class assigned" });
        else resolve(row);
      }
    );
  });
});

// 23. Student: Get My Tasks
fastify.get("/api/student/tasks", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.all(
      `
            SELECT u.id, u.nazev as title, u.popis as description, u.datum_odevzdani as dueDate, u.typ as type, u.test_id as testId,
            ts.typ as templateType,
            (SELECT COUNT(*) FROM odevzdani o WHERE o.ukol_id = u.id AND o.student_id = ? AND o.stav != 'draft') as isSubmitted,
            (SELECT o.datum_odevzdani FROM odevzdani o WHERE o.ukol_id = u.id AND o.student_id = ? AND o.stav != 'draft' LIMIT 1) as submittedAt
            FROM ukoly u
            LEFT JOIN testy_sablony ts ON u.test_id = ts.id
            JOIN trida_zaci tz ON u.id_tridy = tz.id_tridy
            WHERE tz.id_uctu = ?
            ORDER BY u.datum_odevzdani ASC
        `,
      [userId, userId, userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 24. Student: Get Task Detail (single endpoint for both types)
fastify.get("/api/student/tasks/:id", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const userId = request.session.user.id;

  // 1. Verify access (student must be in the class of the task)
  const task = await new Promise((resolve, reject) => {
    db.get(
      `
            SELECT u.id, u.nazev as title, u.popis as description, u.datum_odevzdani as dueDate, u.typ as type, u.id_tridy, u.test_id
            FROM ukoly u
            JOIN trida_zaci tz ON u.id_tridy = tz.id_tridy
            WHERE u.id = ? AND tz.id_uctu = ?
        `,
      [id, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!task)
    return reply.status(403).send({ error: "Unauthorized or Task not found" });

  const result = { ...task };

  // 2. Fetch extra data based on type (Teacher Attachments/Questions)
  if (task.type === "classic") {
    const attachments = await new Promise((resolve, reject) => {
      db.all(
        "SELECT nazev as name, url, typ as type FROM prilohy_ukolu WHERE ukol_id = ?",
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    result.attachments = attachments;
  } else if (task.type === "test" || task.type === "outcome" || task.type === "predefined_test" || task.test_id) {
    const qSource = task.test_id ? { col: 'test_id', val: task.test_id } : { col: 'ukol_id', val: id };

    const questions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, text, poradi, body as points FROM otazky WHERE ${qSource.col} = ? ORDER BY poradi ASC`,
        [qSource.val],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    for (const q of questions) {
      const options = await new Promise((resolve, reject) => {
        db.all(
          "SELECT id, text, je_spravna as isCorrect FROM moznosti WHERE otazka_id = ?",
          [q.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(o => ({ ...o, isCorrect: o.isCorrect === 1 })));
          }
        );
      });

      for (const opt of options) {
        if (task.type === "outcome" || task.test_id) {
          const outPoints = await new Promise((resolve, reject) => {
            db.all(`
                    SELECT uv.nazev, mvb.body 
                    FROM moznost_vysledek_body mvb
                    JOIN ukol_vysledky uv ON mvb.vysledek_id = uv.id
                    WHERE mvb.moznost_id = ?
                `, [opt.id], (err, rows) => {
              if (err) reject(err); else resolve(rows);
            });
          });
          opt.outcomePoints = {};
          outPoints.forEach(p => { opt.outcomePoints[p.nazev] = p.body; });
        }
      }
      q.options = options;
    }
    result.questions = questions;

    if (task.type === "outcome" || task.test_id) {
      result.outcomes = await new Promise((resolve, reject) => {
        db.all(`SELECT id, nazev FROM ukol_vysledky WHERE ${qSource.col} = ?`, [qSource.val], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });
    }
  }

  // 3. Fetch Student Submission (if exists)
  const submission = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id, datum_odevzdani as submittedAt, stav as status, hodnoceni FROM odevzdani WHERE ukol_id = ? AND student_id = ?",
      [id, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (submission) {
    result.submission = submission;
    // Fetch submitted attachments
    if (task.type === "classic") {
      result.submittedAttachments = await new Promise((resolve, reject) => {
        db.all(
          "SELECT nazev as name, url, typ as type FROM odevzdani_prilohy WHERE odevzdani_id = ?",
          [submission.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    } else if (task.type === "test" || task.type === "outcome" || task.type === "predefined_test") {
      // Fetch student answers for each question
      if (result.questions) {
        for (const q of result.questions) {
          const answers = await new Promise((resolve, reject) => {
            db.all("SELECT moznost_id FROM student_odpovedi WHERE odevzdani_id = ? AND otazka_id = ?", [submission.id, q.id], (err, rows) => {
              if (err) reject(err); else resolve(rows);
            });
          });
          q.studentAnswerIds = answers ? answers.map(a => a.moznost_id) : [];
        }
      }
    }
  }

  return result;
});

// 25. Student: Submit Task (Upsert)
fastify.post("/api/student/tasks/:id/submit", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { id } = request.params; // Task ID
  const userId = request.session.user.id;
  const { answers, submittedLinks, status } = request.body;

  const targetStatus = status || "submitted";
  const submittedAt = new Date().toISOString();

  // Perform Grading if it's a test or outcome quiz
  let gradingResult = null;
  const taskDetails = await new Promise((resolve, reject) => {
    db.get("SELECT typ, test_id FROM ukoly WHERE id = ?", [id], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });

  if (taskDetails && (taskDetails.typ === "test" || taskDetails.typ === "outcome" || taskDetails.test_id) && answers) {
    const qSource = taskDetails.test_id ? { col: 'test_id', val: taskDetails.test_id } : { col: 'ukol_id', val: id };

    // Determine the actual type (if template, use template type)
    let actualType = taskDetails.typ;
    if (taskDetails.test_id) {
      const template = await new Promise((resolve) => {
        db.get("SELECT typ FROM testy_sablony WHERE id = ?", [taskDetails.test_id], (err, row) => resolve(row));
      });
      if (template) actualType = template.typ;
    }

    if (actualType === "test") {
      let totalPoints = 0;
      let maxPoints = 0;

      const questions = await new Promise((resolve, reject) => {
        db.all(`SELECT id, body FROM otazky WHERE ${qSource.col} = ?`, [qSource.val], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });

      for (const q of questions) {
        maxPoints += (q.body || 1);
        const options = await new Promise((resolve, reject) => {
          db.all("SELECT id, je_spravna FROM moznosti WHERE otazka_id = ?", [q.id], (err, rows) => {
            if (err) reject(err); else resolve(rows);
          });
        });

        const correctOptionIds = options.filter(o => o.je_spravna === 1).map(o => o.id);
        const incorrectOptionIds = options.filter(o => o.je_spravna === 0).map(o => o.id);

        const studentSelected = answers[q.id] || [];
        const selectedArray = Array.isArray(studentSelected) ? studentSelected : [studentSelected];

        const c = selectedArray.filter(id => correctOptionIds.includes(parseInt(id))).length;
        const w = selectedArray.filter(id => incorrectOptionIds.includes(parseInt(id))).length;
        const qPoints = Math.max(0, (c - w) / (correctOptionIds.length || 1));
        totalPoints += qPoints * (q.body || 1);
      }
      gradingResult = `${Math.round((totalPoints / maxPoints) * 100)}% (${totalPoints}/${maxPoints})`;
    } else if (actualType === "outcome") {
      const scores = {}; // outcomeName -> totalPoints
      const options = await new Promise((resolve, reject) => {
        db.all(`
               SELECT mvb.body, uv.nazev, m.id as optionId, m.otazka_id
               FROM moznost_vysledek_body mvb
               JOIN ukol_vysledky uv ON mvb.vysledek_id = uv.id
               JOIN moznosti m ON mvb.moznost_id = m.id
               WHERE m.otazka_id IN (SELECT id FROM otazky WHERE ${qSource.col} = ?)
           `, [qSource.val], (err, rows) => {
          if (err) reject(err); else resolve(rows);
        });
      });

      for (const qId in answers) {
        const selectedIds = Array.isArray(answers[qId]) ? answers[qId].map(Number) : [Number(answers[qId])];
        for (const selId of selectedIds) {
          const mappings = options.filter(o => o.optionId === selId);
          for (const m of mappings) {
            scores[m.nazev] = (scores[m.nazev] || 0) + m.body;
          }
        }
      }

      let bestOutcome = "Žádný výsledek";
      let maxScore = -1;
      for (const out in scores) {
        if (scores[out] > maxScore) {
          maxScore = scores[out];
          bestOutcome = out;
        }
      }
      gradingResult = bestOutcome;
    }
  }

  return new Promise((resolve, reject) => {
    // Check for existing submission
    db.get(
      "SELECT id FROM odevzdani WHERE ukol_id = ? AND student_id = ?",
      [id, userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // UPDATE existing
          const submissionId = row.id;
          db.serialize(() => {
            const updateSql = gradingResult
              ? "UPDATE odevzdani SET datum_odevzdani = ?, stav = ?, hodnoceni = ? WHERE id = ?"
              : "UPDATE odevzdani SET datum_odevzdani = ?, stav = ? WHERE id = ?";
            const updateParams = gradingResult
              ? [submittedAt, targetStatus, gradingResult, submissionId]
              : [submittedAt, targetStatus, submissionId];

            db.run(updateSql, updateParams);

            // Clear old data to replace with new
            db.run("DELETE FROM odevzdani_prilohy WHERE odevzdani_id = ?", [
              submissionId,
            ]);
            db.run("DELETE FROM student_odpovedi WHERE odevzdani_id = ?", [
              submissionId,
            ]);

            // Insert new Answers
            if (answers) {
              const optStmt = db.prepare("INSERT INTO student_odpovedi (odevzdani_id, otazka_id, moznost_id) VALUES (?, ?, ?)");
              for (const qId in answers) {
                const selIds = Array.isArray(answers[qId]) ? answers[qId] : [answers[qId]];
                for (const oId of selIds) {
                  if (oId) optStmt.run(submissionId, qId, oId);
                }
              }
              optStmt.finalize();
            }

            // Insert new Links
            if (submittedLinks && submittedLinks.length > 0) {
              const stmt = db.prepare(
                "INSERT INTO odevzdani_prilohy (odevzdani_id, nazev, url, typ) VALUES (?, ?, ?, ?)"
              );
              submittedLinks.forEach((link) => {
                stmt.run(
                  submissionId,
                  link.name,
                  link.url,
                  link.type || "link"
                );
              });
              stmt.finalize();
            }
            resolve({ success: true, status: targetStatus, grade: gradingResult });
          });
        } else {
          // INSERT new
          db.serialize(() => {
            db.run(
              "INSERT INTO odevzdani (ukol_id, student_id, datum_odevzdani, stav, hodnoceni) VALUES (?, ?, ?, ?, ?)",
              [id, userId, submittedAt, targetStatus, gradingResult],
              function (err) {
                if (err) {
                  reject(err);
                  return;
                }
                const submissionId = this.lastID;

                // Insert new Answers
                if (answers) {
                  const optStmt = db.prepare("INSERT INTO student_odpovedi (odevzdani_id, otazka_id, moznost_id) VALUES (?, ?, ?)");
                  for (const qId in answers) {
                    const selIds = Array.isArray(answers[qId]) ? answers[qId] : [answers[qId]];
                    for (const oId of selIds) {
                      if (oId) optStmt.run(submissionId, qId, oId);
                    }
                  }
                  optStmt.finalize();
                }

                if (submittedLinks && submittedLinks.length > 0) {
                  const stmt = db.prepare(
                    "INSERT INTO odevzdani_prilohy (odevzdani_id, nazev, url, typ) VALUES (?, ?, ?, ?)"
                  );
                  submittedLinks.forEach((link) => {
                    stmt.run(
                      submissionId,
                      link.name,
                      link.url,
                      link.type || "link"
                    );
                  });
                  stmt.finalize();
                }

                resolve({ success: true, status: targetStatus, grade: gradingResult });
              }
            );
          });
        }
      }
    );
  });
});

// 25b. Teacher: Delete/Reset Student Submission
fastify.delete("/api/teacher/submissions/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params; // Submission ID
  const userId = request.session.user.id;

  // Verify ownership of the class the task belongs to
  const check = await new Promise((resolve, reject) => {
    db.get(`
            SELECT o.id 
            FROM odevzdani o
            JOIN ukoly u ON o.ukol_id = u.id
            JOIN trida t ON u.id_tridy = t.id
            LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
            WHERE o.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)
        `, [id, userId, userId], (err, row) => resolve(row));
  });

  if (!check) return reply.status(403).send({ error: "Access denied" });

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM odevzdani_prilohy WHERE odevzdani_id = ?", [id]);
      db.run("DELETE FROM student_odpovedi WHERE odevzdani_id = ?", [id]);
      db.run("DELETE FROM odevzdani WHERE id = ?", [id], (err) => {
        if (err) reject(err); else resolve({ success: true });
      });
    });
  });
});

// 26. Student: Unsubmit Task (Undo Submission)
fastify.delete("/api/student/tasks/:id/submit", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { id } = request.params; // Task ID
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT o.id, u.typ FROM odevzdani o JOIN ukoly u ON o.ukol_id = u.id WHERE o.ukol_id = ? AND o.student_id = ?`,
      [id, userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve({ success: true });
          return;
        }

        if (row.typ === 'test' || row.typ === 'outcome' || row.typ === 'predefined_test') {
          reply.status(403).send({ error: "Testy a kvízy nelze po odevzdání zrušit." });
          resolve();
          return;
        }

        const submissionId = row.id;

        db.serialize(() => {
          db.run("DELETE FROM odevzdani_prilohy WHERE odevzdani_id = ?", [
            submissionId,
          ]);
          // Also delete answers if we had them

          db.run(
            "DELETE FROM odevzdani WHERE id = ?",
            [submissionId],
            (err) => {
              if (err) reject(err);
              else resolve({ success: true });
            }
          );
        });
      }
    );
  });
});

// 26. Google Drive Integration
const {
  getDriveClient,
  ensureFolder,
  createDoc,
  createFile,
  searchFiles,
  makePublic,
} = require("./drive");

const handleDriveError = (error, reply, request) => {
  request.log.error(error);
  const errorMessage = error.response?.data?.error?.message || error.message || "";
  if (errorMessage.includes("storage quota has been exceeded") || (error.code === 403 && errorMessage.toLowerCase().includes("quota"))) {
    return reply.status(403).send({
      error: "Quota Exceeded",
      message: "Váš Google Disk má vyčerpanou kvótu pro úložiště. Prosím, uvolněte místo a zkuste to znovu."
    });
  }
  if (errorMessage.includes("No refresh token") || (error.code === 401)) {
    return reply.status(401).send({ error: "Google Auth Re-login required", message: "Pro přístup ke Google Disku je nutné se znovu přihlásit." });
  }
  return reply.status(500).send({ error: "Drive Error", message: "Při komunikaci s Google Diskem došlo k chybě." });
};

// Make file public endpoint
fastify.post("/api/drive/make-public", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { fileId } = request.body;
  if (!fileId) return reply.status(400).send({ error: "Missing fileId" });

  try {
    const drive = await getDriveClient(request.session.user.id);
    const success = await makePublic(drive, fileId);
    return { success };
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// Init/Get Folder ID
fastify.post("/api/drive/init-folder", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const drive = await getDriveClient(request.session.user.id);
    const folderId = await ensureFolder(drive, "karierni-denik");
    return { folderId };
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// Create Google Doc/Sheet/Slide
fastify.post("/api/drive/create-doc", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  // mimeType: 'application/vnd.google-apps.document' (default)
  //           'application/vnd.google-apps.spreadsheet'
  //           'application/vnd.google-apps.presentation'
  const { name, folderId, mimeType } = request.body;
  try {
    const drive = await getDriveClient(request.session.user.id);
    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await ensureFolder(drive, "karierni-denik");
    }

    const typeToCreate = mimeType || "application/vnd.google-apps.document";
    const file = await createDoc(drive, name, typeToCreate, targetFolderId);
    return file;
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// Upload File
fastify.post("/api/drive/upload", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: "No file uploaded" });
  }

  try {
    const drive = await getDriveClient(request.session.user.id);
    const folderId = await ensureFolder(drive, "karierni-denik");

    const file = await createFile(
      drive,
      data.filename,
      data.mimetype,
      data.file,
      folderId
    );
    return file;
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// Search Files
fastify.get("/api/drive/search", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  let { q, folderId } = request.query;
  try {
    const drive = await getDriveClient(request.session.user.id);
    if (!folderId || folderId === 'root') {
      folderId = await ensureFolder(drive, "karierni-denik");
    }
    const files = await searchFiles(drive, q, folderId);
    return files;
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// --- TEACHER NOTISEK ROUTES (Role 1) ---

// 27. Teacher: Get Notisek Topics
fastify.get("/api/teacher/notisek/topics", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, title, created_at, updated_at, poradi FROM notisek_topics ORDER BY poradi ASC, created_at ASC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 27b. Teacher: Reorder Notisek Topics
fastify.put("/api/teacher/notisek/topics/reorder", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { order } = request.body; // Array of { id, poradi }
  const userId = request.session.user.id;

  if (!Array.isArray(order)) {
    return reply.status(400).send({ error: "Invalid data" });
  }

  db.serialize(() => {
    const stmt = db.prepare("UPDATE notisek_topics SET poradi = ? WHERE id = ?");
    for (const item of order) {
      stmt.run(item.poradi, item.id);
    }
    stmt.finalize();
  });

  return { success: true };
});

// 28. Teacher: Create Notisek Topic
fastify.post("/api/teacher/notisek/topics", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { title } = request.body;
  const userId = request.session.user.id;

  // Get max poradi
  const maxPoradi = await new Promise((resolve, reject) => {
    db.get("SELECT MAX(poradi) as maxP FROM notisek_topics", [], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.maxP || 0 : 0);
    });
  });
  const newPoradi = (maxPoradi || 0) + 1;

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO notisek_topics (teacher_id, title, poradi) VALUES (?, ?, ?)",
      [userId, title, newPoradi],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), poradi: newPoradi });
      }
    );
  });
});

// 29. Teacher: Update Notisek Topic
fastify.put("/api/teacher/notisek/topics/:topicId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { topicId } = request.params;
  const { title } = request.body;
  const userId = request.session.user.id;

  // Verify ownership of the topic
  const topicCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM notisek_topics WHERE id = ?",
      [topicId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!topicCheck) {
    return reply.status(403).send({ error: "Unauthorized topic access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE notisek_topics SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, topicId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error("Topic not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 30. Teacher: Delete Notisek Topic
fastify.delete("/api/teacher/notisek/topics/:topicId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { topicId } = request.params;
  const userId = request.session.user.id;

  // Verify ownership of the topic
  const topicCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM notisek_topics WHERE id = ?",
      [topicId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!topicCheck) {
    return reply.status(403).send({ error: "Unauthorized topic access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM notisek_topics WHERE id = ?",
      [topicId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error("Topic not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 31. Teacher: Get Notisek Cards for a Topic
fastify.get("/api/teacher/notisek/topics/:topicId/cards", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { topicId } = request.params;
  const userId = request.session.user.id;

  // Verify access to topic
  const topicCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM notisek_topics WHERE id = ?",
      [topicId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!topicCheck) {
    return reply.status(403).send({ error: "Unauthorized topic access" });
  }

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT id, title, content, link_url, link_text, image_url, ord, created_at, updated_at FROM notisek_cards WHERE topic_id = ? ORDER BY ord ASC",
      [topicId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// 32. Teacher: Create Notisek Card
fastify.post("/api/teacher/notisek/topics/:topicId/cards", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { topicId } = request.params;
  const { title, content, link_url, link_text, image_url, order } = request.body;
  const userId = request.session.user.id;

  // Verify access to topic
  const topicCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM notisek_topics WHERE id = ?",
      [topicId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!topicCheck) {
    return reply.status(403).send({ error: "Unauthorized topic access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO notisek_cards (topic_id, title, content, link_url, link_text, image_url, ord) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [topicId, title, content, link_url, link_text, image_url, order],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, title, content, link_url, link_text, image_url, ord: order, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
    );
  });
});

// 33. Teacher: Update Notisek Card
fastify.put("/api/teacher/notisek/cards/:cardId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { cardId } = request.params;
  const { title, content, link_url, link_text, image_url, order } = request.body;
  const userId = request.session.user.id;

  // Verify ownership of the card via its topic
  const cardCheck = await new Promise((resolve, reject) => {
    db.get(
      `SELECT nc.id FROM notisek_cards nc JOIN notisek_topics nt ON nc.topic_id = nt.id WHERE nc.id = ?`,
      [cardId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!cardCheck) {
    return reply.status(403).send({ error: "Unauthorized card access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE notisek_cards SET title = ?, content = ?, link_url = ?, link_text = ?, image_url = ?, ord = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, content, link_url, link_text, image_url, order, cardId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error("Card not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 34. Teacher: Delete Notisek Card
fastify.delete("/api/teacher/notisek/cards/:cardId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { cardId } = request.params;
  const userId = request.session.user.id;

  // Verify ownership of the card via its topic
  const cardCheck = await new Promise((resolve, reject) => {
    db.get(
      `SELECT nc.id FROM notisek_cards nc JOIN notisek_topics nt ON nc.topic_id = nt.id WHERE nc.id = ?`,
      [cardId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!cardCheck) {
    return reply.status(403).send({ error: "Unauthorized card access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM notisek_cards WHERE id = ?",
      [cardId],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error("Card not found or unauthorized"));
        else resolve({ success: true });
      }
    );
  });
});

// 34b. Teacher: Preview Full Notisek (as Student sees it)
fastify.get("/api/teacher/notisek/preview", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  // 1. Fetch Topics
  const topics = await new Promise((resolve, reject) => {
    db.all(
      "SELECT id, title FROM notisek_topics ORDER BY poradi ASC, created_at ASC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // 2. Fetch Cards for each topic
  // We can do this efficiently or simple loop. Let's do loop for consistency with student endpoint logic (concepts).
  const result = [];
  for (const topic of topics) {
    const cards = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, title, content, link_url, link_text, image_url, ord FROM notisek_cards WHERE topic_id = ? ORDER BY ord ASC",
        [topic.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    result.push({
      ...topic,
      cards: cards
    });
  }

  return result;
});

// --- STUDENT NOTISEK ROUTES ---

// 35. Student: Get Full Notisek (Topics + Cards)
fastify.get("/api/student/notisek/full", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  // 1. Zjistit ID třídy studenta
  const studentClass = await new Promise((resolve, reject) => {
    db.get(
      "SELECT id_tridy FROM trida_zaci WHERE id_uctu = ?",
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!studentClass) {
    return reply.status(404).send({ error: "Student nemá přiřazenou třídu." });
  }

  const classId = studentClass.id_tridy;

  const topics = await new Promise((resolve, reject) => {
    db.all(
      "SELECT id, title FROM notisek_topics ORDER BY poradi ASC, created_at ASC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // 3. Stáhnout Karty pro každé téma
  // (Pro efektivitu by to šlo jedním JOINem, ale pro přehlednost uděláme loop)
  const result = [];
  for (const topic of topics) {
    const cards = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, title, content, link_url, link_text, image_url, ord FROM notisek_cards WHERE topic_id = ? ORDER BY ord ASC",
        [topic.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    result.push({
      ...topic,
      cards: cards,
    });
  }

  return result;
});


// 18. Admin: Download Database
fastify.get("/api/admin/database/download", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }

  const dbPath = process.env.DB_PATH || path.resolve(__dirname, "database.sqlite");

  if (!fs.existsSync(dbPath)) {
    return reply.status(404).send({ error: "Database file not found" });
  }

  const stream = fs.createReadStream(dbPath);
  reply.header('Content-Type', 'application/x-sqlite3');
  reply.header('Content-Disposition', 'attachment; filename="database.sqlite"');
  return reply.send(stream);
});

// 19. Admin: List Tables
fastify.get("/api/admin/tables", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.name).filter(n => n !== 'sqlite_sequence'));
    });
  });
});

// 20. Admin: Get Table Data
fastify.get("/api/admin/tables/:tableName", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { tableName } = request.params;

  // Validate table name to prevent SQL injection (basic check)
  // Ideally, compare against the list of known tables
  const validTables = await new Promise((resolve) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) resolve([]);
      else resolve(rows.map(r => r.name));
    });
  });

  if (!validTables.includes(tableName)) {
    return reply.status(400).send({ error: "Invalid table name" });
  }

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM "${tableName}" LIMIT 100`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// Admin: Get Table Schema
fastify.get("/api/admin/tables/:tableName/schema", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { tableName } = request.params;

  // Validate table name
  const validTables = await new Promise((resolve) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) resolve([]);
      else resolve(rows.map(r => r.name));
    });
  });

  if (!validTables.includes(tableName)) {
    return reply.status(400).send({ error: "Invalid table name" });
  }

  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info("${tableName}")`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => ({ name: r.name, type: r.type, notnull: r.notnull, pk: r.pk })));
    });
  });
});

// 21. Admin: Update Table Row
fastify.put("/api/admin/tables/:tableName/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { tableName, id } = request.params;
  const updates = request.body; // Expecting { column: value, ... }

  // Validate table
  const validTables = await new Promise((resolve) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) resolve([]);
      else resolve(rows.map(r => r.name));
    });
  });
  if (!validTables.includes(tableName)) {
    return reply.status(400).send({ error: "Invalid table name" });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return reply.status(400).send({ error: "No updates provided" });
  }

  const columns = Object.keys(updates).map(col => `"${col}" = ?`).join(", ");
  const values = [...Object.values(updates), id];

  return new Promise((resolve, reject) => {
    db.run(`UPDATE "${tableName}" SET ${columns} WHERE id = ?`, values, function (err) {
      if (err) reject(err);
      else resolve({ success: true, changes: this.changes });
    });
  });
});

// 23. Admin: Insert Table Row
fastify.post("/api/admin/tables/:tableName", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { tableName } = request.params;
  const values = request.body; // Expecting { column: value, ... }

  // Validate table
  const validTables = await new Promise((resolve) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) resolve([]);
      else resolve(rows.map(r => r.name));
    });
  });
  if (!validTables.includes(tableName)) {
    return reply.status(400).send({ error: "Invalid table name" });
  }

  if (!values || Object.keys(values).length === 0) {
    return reply.status(400).send({ error: "No values provided" });
  }

  const columns = Object.keys(values).map(col => `"${col}"`).join(", ");
  const placeholders = Object.keys(values).map(() => "?").join(", ");
  const params = Object.values(values);

  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`, params, function (err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  });
});

// 22. Admin: Delete Table Row
fastify.delete("/api/admin/tables/:tableName/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { tableName, id } = request.params;

  // Validate table
  const validTables = await new Promise((resolve) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) resolve([]);
      else resolve(rows.map(r => r.name));
    });
  });
  if (!validTables.includes(tableName)) {
    return reply.status(400).send({ error: "Invalid table name" });
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM "${tableName}" WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true, changes: this.changes });
    });
  });
});

// 29. Global Search
fastify.get("/api/search", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const { q } = request.query;
  if (!q || q.length < 2) return [];

  const query = `%${q}%`;
  const userId = request.session.user.id;
  const role = request.session.user.role;

  const results = [];

  try {
    // 1. Search Classes
    const classes = await new Promise((resolve, reject) => {
      let sql, params;
      if (role === 1) { // Teacher
        sql = `SELECT id, nazev as title, 'class' as type FROM trida 
               WHERE (vlastnik_id = ? OR id IN (SELECT id_tridy FROM trida_ucitele WHERE id_uctu = ?)) 
               AND (nazev LIKE ? OR predmet LIKE ?)`;
        params = [userId, userId, query, query];
      } else if (role === 2) { // Admin
        sql = `SELECT id, nazev as title, 'class' as type FROM trida WHERE nazev LIKE ? OR predmet LIKE ?`;
        params = [query, query];
      } else { // Student
        sql = `SELECT id, nazev as title, 'class' as type FROM trida 
               WHERE id IN (SELECT id_tridy FROM trida_zaci WHERE id_uctu = ?) 
               AND (nazev LIKE ? OR predmet LIKE ?)`;
        params = [userId, query, query];
      }
      db.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    results.push(...classes);

    // 2. Search Tasks
    const tasks = await new Promise((resolve, reject) => {
      let sql, params;
      if (role === 1) { // Teacher
        sql = `SELECT id, nazev as title, 'task' as type, id_tridy as parentId FROM ukoly 
               WHERE id_tridy IN (SELECT id FROM trida WHERE vlastnik_id = ? OR id IN (SELECT id_tridy FROM trida_ucitele WHERE id_uctu = ?)) 
               AND (nazev LIKE ? OR popis LIKE ?)`;
        params = [userId, userId, query, query];
      } else if (role === 2) { // Admin
        sql = `SELECT id, nazev as title, 'task' as type, id_tridy as parentId FROM ukoly WHERE nazev LIKE ? OR popis LIKE ?`;
        params = [query, query];
      } else { // Student
        sql = `SELECT id, nazev as title, 'task' as type, id_tridy as parentId FROM ukoly 
               WHERE id_tridy IN (SELECT id_tridy FROM trida_zaci WHERE id_uctu = ?) 
               AND (nazev LIKE ? OR popis LIKE ?)`;
        params = [userId, query, query];
      }
      db.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    results.push(...tasks);

    // 3. Search Notisek Topics
    const topics = await new Promise((resolve, reject) => {
      // Notisek is currently shared or at least visible to all teachers
      // For now, let's keep it simple: teachers see all, students might too?
      const sql = `SELECT id, title, 'notisek_topic' as type FROM notisek_topics WHERE title LIKE ?`;
      db.all(sql, [query], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    results.push(...topics);

    // 4. Search Notisek Cards
    const cards = await new Promise((resolve, reject) => {
      const sql = `SELECT id, title, 'notisek_card' as type, topic_id as parentId FROM notisek_cards 
                   WHERE title LIKE ? OR content LIKE ?`;
      db.all(sql, [query, query], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    results.push(...cards);

    return results;
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Search failed" });
  }
});

// Admin: Get Class Members
fastify.get("/api/admin/classes/:id/members", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.jmeno, u.prijmeni, u.email, u.obrazek_url
       FROM ucty u
       JOIN trida_zaci tz ON u.id = tz.id_uctu
       WHERE tz.id_tridy = ?`,
      [id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// Admin: Get Class Teachers
fastify.get("/api/admin/classes/:id/teachers", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.jmeno, u.prijmeni, u.email, u.obrazek_url
       FROM ucty u
       JOIN trida_ucitele tu ON u.id = tu.id_uctu
       WHERE tu.id_tridy = ?`,
      [id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
});

// Admin: Add Teacher to Class
fastify.post("/api/admin/classes/:id/teachers", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id } = request.params;
  const { userId } = request.body;

  if (!userId) {
    return reply.status(400).send({ error: "userId is required" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO trida_ucitele (id_tridy, id_uctu) VALUES (?, ?)",
      [id, userId],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, changes: this.changes });
      }
    );
  });
});

// Admin: Remove Teacher from Class
fastify.delete("/api/admin/classes/:id/teachers/:userId", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 2) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { id, userId } = request.params;

  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM trida_ucitele WHERE id_tridy = ? AND id_uctu = ?",
      [id, userId],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true, changes: this.changes });
      }
    );
  });
});

// --- TEACHER SCHOOLS & CONTACTS ROUTES ---

// Get all schools for teacher
fastify.get("/api/teacher/skoly", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM skoly WHERE teacher_id = ? ORDER BY nazev ASC",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// Create new school
fastify.post("/api/teacher/skoly", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { nazev, adresa, fakulta, obor, web, email, poznamka } = request.body;

  if (!nazev) {
    return reply.status(400).send({ error: "Název je povinný" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO skoly (teacher_id, nazev, adresa, fakulta, obor, web, email, poznamka) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, nazev, adresa, fakulta, obor, web, email, poznamka],
      function (err) {
        if (err) reject(err);
        else resolve({
          id: this.lastID,
          teacher_id: userId,
          nazev, adresa, fakulta, obor, web, email, poznamka,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    );
  });
});

// Update school
fastify.put("/api/teacher/skoly/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;
  const { nazev, adresa, fakulta, obor, web, email, poznamka } = request.body;

  // Verify ownership
  const check = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM skoly WHERE id = ? AND teacher_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!check) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE skoly SET nazev = ?, adresa = ?, fakulta = ?, obor = ?, web = ?, email = ?, poznamka = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nazev, adresa, fakulta, obor, web, email, poznamka, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// Delete school
fastify.delete("/api/teacher/skoly/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;

  // Verify ownership
  const check = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM skoly WHERE id = ? AND teacher_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!check) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  return new Promise((resolve, reject) => {
    db.run("DELETE FROM skoly WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// Get all contacts for teacher
fastify.get("/api/teacher/kontakty", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT k.*, s.nazev as skola_nazev 
       FROM kontakty k 
       LEFT JOIN skoly s ON k.skola_id = s.id 
       WHERE k.teacher_id = ? 
       ORDER BY k.jmeno ASC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// Create new contact
fastify.post("/api/teacher/kontakty", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { jmeno, email, telefon, pozice, skola_id, poznamka } = request.body;

  if (!jmeno) {
    return reply.status(400).send({ error: "Jméno je povinné" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO kontakty (teacher_id, jmeno, email, telefon, pozice, skola_id, poznamka) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, jmeno, email, telefon, pozice, skola_id || null, poznamka],
      function (err) {
        if (err) reject(err);
        else resolve({
          id: this.lastID,
          teacher_id: userId,
          jmeno, email, telefon, pozice, skola_id, poznamka,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    );
  });
});

// Update contact
fastify.put("/api/teacher/kontakty/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;
  const { jmeno, email, telefon, pozice, skola_id, poznamka } = request.body;

  // Verify ownership
  const check = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM kontakty WHERE id = ? AND teacher_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!check) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE kontakty SET jmeno = ?, email = ?, telefon = ?, pozice = ?, skola_id = ?, poznamka = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [jmeno, email, telefon, pozice, skola_id || null, poznamka, id],
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// Delete contact
fastify.delete("/api/teacher/kontakty/:id", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;

  // Verify ownership
  const check = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM kontakty WHERE id = ? AND teacher_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!check) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  return new Promise((resolve, reject) => {
    db.run("DELETE FROM kontakty WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// --- STUDENT PORTFOLIO ROUTES ---

// Get student's portfolio files
fastify.get("/api/student/portfolio", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM portfolio WHERE student_id = ? ORDER BY created_at DESC",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// Upload portfolio file (via Google Drive)
fastify.post("/api/student/portfolio/upload", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;

  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: "No file uploaded" });
  }

  try {
    const drive = await getDriveClient(userId);
    const portfolioFolderId = await ensureFolder(drive, "karierni-denik-portfolio");

    const file = await createFile(
      drive,
      data.filename,
      data.mimetype,
      data.file,
      portfolioFolderId
    );

    // Make file publicly readable so teachers can access it
    await makePublic(drive, file.id);

    const fileUrl = `https://drive.google.com/file/d/${file.id}/view`;

    // Get file size
    const fileDetails = await drive.files.get({ fileId: file.id, fields: "size" });
    const fileSize = parseInt(fileDetails.data.size || "0", 10);

    // Save to DB
    const portfolioId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO portfolio (student_id, nazev, google_file_id, google_file_url, mime_type, velikost) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, data.filename, file.id, fileUrl, data.mimetype, fileSize],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    return {
      id: portfolioId,
      nazev: data.filename,
      google_file_id: file.id,
      google_file_url: fileUrl,
      mime_type: data.mimetype,
      velikost: fileSize,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    return handleDriveError(error, reply, request);
  }
});

// Update portfolio file description
fastify.put("/api/student/portfolio/:id", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;
  const { popis, nazev } = request.body;

  // Verify ownership
  const check = await new Promise((resolve, reject) => {
    db.get("SELECT id FROM portfolio WHERE id = ? AND student_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!check) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  return new Promise((resolve, reject) => {
    const updates = [];
    const params = [];
    if (popis !== undefined) { updates.push("popis = ?"); params.push(popis); }
    if (nazev !== undefined) { updates.push("nazev = ?"); params.push(nazev); }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    db.run(
      `UPDATE portfolio SET ${updates.join(", ")} WHERE id = ?`,
      params,
      function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
});

// Delete portfolio file
fastify.delete("/api/student/portfolio/:id", async (request, reply) => {
  if (!request.session.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = request.session.user.id;
  const { id } = request.params;

  // Verify ownership and get file info
  const file = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM portfolio WHERE id = ? AND student_id = ?", [id, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!file) {
    return reply.status(403).send({ error: "Unauthorized access" });
  }

  // Try to delete from Google Drive
  if (file.google_file_id) {
    try {
      const drive = await getDriveClient(userId);
      await drive.files.delete({ fileId: file.google_file_id });
    } catch (err) {
      // Log but continue with DB deletion
      console.error("Failed to delete file from Drive:", err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run("DELETE FROM portfolio WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
});

// --- TEACHER: View Student Portfolio ---
fastify.get("/api/teacher/classes/:classId/students/:studentId/portfolio", async (request, reply) => {
  if (!request.session.user || request.session.user.role !== 1) {
    return reply.status(403).send({ error: "Unauthorized" });
  }
  const { classId, studentId } = request.params;
  const userId = request.session.user.id;

  // Verify teacher has access to the class
  const classCheck = await new Promise((resolve, reject) => {
    db.get(
      `SELECT t.id FROM trida t
       LEFT JOIN trida_ucitele tu ON t.id = tu.id_tridy
       WHERE t.id = ? AND (t.vlastnik_id = ? OR tu.id_uctu = ?)`,
      [classId, userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!classCheck) {
    return reply.status(403).send({ error: "Unauthorized class access" });
  }

  // Verify student is in the class
  const studentCheck = await new Promise((resolve, reject) => {
    db.get(
      "SELECT 1 FROM trida_zaci WHERE id_tridy = ? AND id_uctu = ?",
      [classId, studentId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!studentCheck) {
    return reply.status(404).send({ error: "Student not found in this class" });
  }

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM portfolio WHERE student_id = ? ORDER BY created_at DESC",
      [studentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen({ port: 6602, host: "0.0.0.0" });
    console.log("Server is running on port 6602");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
