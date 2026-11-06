
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json({ limit: "10kb" }));

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to LeadLeak AI API",
  });
});

// Health check API
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LeadLeak AI backend is running!",
    app: "LeadLeak AI",
    version: "1.0.0",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`LeadLeak AI API running at http://localhost:${PORT}`);
});
