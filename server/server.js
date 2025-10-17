import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { connectDB } from "./lib/dbconnect-mysql.js";
import { createUserTable } from "./models/User.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/api/alive", (_req, res) => res.json({ message: "Server is alive" }));

(async () => {
  try {
    // await connectDB();
    // await createUserTable();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  } catch (e) {
    console.error("Startup failure:", e);
    process.exit(1);
  }
})();
