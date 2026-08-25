const bcrypt = require("bcrypt");
const pool = require("./backend/db");

async function seedAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await pool.query(
      `INSERT INTO TaskFlowusers
      (firstname, lastname, email, password, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING`,
      [
        "Super",
        "Admin",
        "admin@taskflow.com",
        hashedPassword,
        "Admin",
      ]
    );

    console.log("✅ Admin seeded successfully!");
    console.log("Email: admin@taskflow.com");
    console.log("Password: Admin@123");
  } catch (err) {
    console.error("❌ Error seeding admin:", err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

seedAdmin();