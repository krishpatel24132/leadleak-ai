
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";

import Audit from "./models/Audit.js";
import authMiddleware from "./middleware/authMiddleware.js";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

import {
  extractWebsite,
  validateWebsiteUrl,
} from "./services/websiteExtractor.js";

import { analyzeWebsite } from "./services/aiAnalyzer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "10kb" }));

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Authentication rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

// AI analysis rate limit
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Analysis limit reached. Please try again later.",
  },
});

// Apply general API limit
app.use("/api", apiLimiter);

// Authentication routes
app.use("/api/auth", authLimiter, authRoutes);

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to LeadLeak AI API",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LeadLeak AI backend is running!",
    app: "LeadLeak AI",
    version: "1.0.0",
  });
});

// Website extraction API
app.post("/api/extract", async (req, res) => {
  try {
    const { url } = req.body || {};
    const validation = validateWebsiteUrl(url);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const result = await extractWebsite(validation.url);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Website extraction error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Unable to extract website information",
    });
  }
});

// Protected AI website analysis
app.post(
  "/api/analyze",
  authMiddleware,
  analyzeLimiter,
  async (req, res) => {
    try {
      const { url } = req.body || {};
      const validation = validateWebsiteUrl(url);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const websiteData = await extractWebsite(validation.url);
      const audit = await analyzeWebsite(websiteData);

      const savedAudit = await Audit.create({
        userId: req.user.id,
        website: websiteData.website,
        title: websiteData.title || "Website Audit",
        audit,
      });

      return res.status(200).json({
        success: true,
        message: "Website audit completed and saved successfully.",
        auditId: savedAudit._id,
        website: websiteData.website,
        title: websiteData.title,
        audit,
      });
    } catch (error) {
      console.error("AI analysis error:", error.message);

      return res.status(502).json({
        success: false,
        message: "AI website analysis failed. Check backend logs.",
      });
    }
  }
);

// Get logged-in user's audit history
app.get("/api/audits", authMiddleware, async (req, res) => {
  try {
    const audits = await Audit.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: audits.length,
      audits,
    });
  } catch (error) {
    console.error("Audit history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit history.",
    });
  }
});

// Delete one audit
app.delete("/api/audits/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit ID.",
      });
    }

    const deletedAudit = await Audit.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!deletedAudit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found or you do not have permission to delete it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Audit deleted successfully.",
    });
  } catch (error) {
    console.error("Delete audit error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete audit.",
    });
  }
});

// Delete all audits belonging to logged-in user
app.delete("/api/audits", authMiddleware, async (req, res) => {
  try {
    const result = await Audit.deleteMany({
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "All your audits have been deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all audits error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to clear audit history.",
    });
  }
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
  console.error("Server error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Connect MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`LeadLeak AI API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
