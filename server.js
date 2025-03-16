const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const yaml = require("js-yaml");

const app = express();
const PORT = 3000;

// ✅ Define path to `userdata` folder
const DATA_DIR = "C:/Users/Admin/Desktop/New folder/servers/SigmaS8/plugins/Essentials/userdata";

app.use(express.json());
app.use(cors());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Change to your MySQL password
  database: "user_data"
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database.");
});

// 🛠 API to Update `uuid` Table
app.post("/update-uuid", async (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith(".yml"));

    for (const file of files) {
      const filePath = `${DATA_DIR}/${file}`;
      const uuid = file.replace(".yml", "");

      // ✅ Read and parse YAML file
      const ymlData = yaml.load(fs.readFileSync(filePath, "utf8"));

      // ✅ Extract last-account-name
      let name = ymlData["last-account-name"];
      if (!name) {
        console.log(`⚠️ Skipping ${uuid} (no last-account-name found)`);
        continue;
      }

      // ✅ Remove dots from name
      name = name.replace(/\./g, "");

      // ✅ Check if `name` exists in `users` table
      const [userCheck] = await db.promise().query("SELECT 1 FROM users WHERE name = ?", [name]);

      if (userCheck.length === 0) {
        console.log(`⚠️ Skipping ${uuid} (User ${name} not found in users table)`);
        continue; // Skip inserting into `uuid`
      }

      // ✅ Check if UUID exists in `uuid` table
      const [rows] = await db.promise().query("SELECT 1 FROM uuid WHERE uuid = ?", [uuid]);

      if (rows.length === 0) {
        console.log(`🆕 Inserting UUID: ${uuid}, Name: ${name}`);
        await db.promise().query("INSERT INTO uuid (name, uuid) VALUES (?, ?)", [name, uuid]);
      } else {
        console.log(`✅ UUID already exists: ${uuid}, skipping...`);
      }
    }

    res.json({ message: "UUID database updated successfully!" });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.post("/getData", async (req, res) => {
    const { uuid } = req.body;
    if (!uuid) {
      return res.status(400).json({ error: "Missing required parameter: uuid" });
    }
  
    const filePath = `${DATA_DIR}/${uuid}.yml`;
  
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Player data not found" });
      }
  
      const ymlData = yaml.load(fs.readFileSync(filePath, "utf8"));
      res.json({ message: "Player data retrieved successfully!", data: ymlData });
  
    } catch (err) {
      console.error("❌ Error reading YAML file:", err);
      res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
  });

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
