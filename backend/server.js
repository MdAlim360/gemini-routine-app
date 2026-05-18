require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend engine deployment configuration mapper
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== MONGODB CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== MONGOOSE SCHEMAS =====================

// Topic Record Schema Model
const topicSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  date: { type: String, required: true },
  originDate: { type: String },
  completionDate: { type: String, default: null },
  category: { type: String, required: true },
  subject: { type: String, required: true },
  topicName: { type: String, required: true },
  noteUrl: { type: String, default: null },
  status: { type: String, enum: ['Pending', 'Complete'], default: 'Pending' },
  reviewsDone: { type: [String], default: [] },
  reviewHistoryStamps: { type: mongoose.Schema.Types.Mixed, default: {} },
  customRevPendingOn: { type: String, default: null }
});

const Topic = mongoose.model('Topic', topicSchema);

// Gamification Metrics Schema Model
const gamificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, default: 'default' },
  xp: { type: Number, default: 0 },
  level: { type: String, default: 'নবীন (Novice)' },
  streakCount: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null },
  unlockedBadges: { type: [String], default: [] },
  weeklyReportGeneratedFor: { type: [String], default: [] }
}, { timestamps: true });

const Gamification = mongoose.model('Gamification', gamificationSchema);

// Routine Template Grid Schema Model
const routineSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Routine = mongoose.model('Routine', routineSchema);

// ===================== API ROUTES =====================

// GAMIFICATION SYSTEM SYNC ROUTE
app.post('/api/gamification/sync', async (req, res) => {
  try {
    const { userId, stateData } = req.body;
    const updatedMetrics = await Gamification.findOneAndUpdate(
      { userId: userId || 'default' },
      { userId: userId || 'default', ...stateData },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updatedMetrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET READ RECOGNIZED ENTRIES FOR TIMELINE
app.get('/api/topics', async (req, res) => {
  try {
    const records = await Topic.find({});
    const grouped = {};
    records.forEach(t => {
      if(!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPSERT (INSERT / UPDATE) TOPIC RECORDS MATRIX ENGINE
app.post('/api/topics', async (req, res) => {
  try {
    const data = req.body;
    const updatedDoc = await Topic.findOneAndUpdate(
      { id: data.id },
      data,
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updatedDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE TOPIC NODE FROM REGISTRY LEDGER
app.delete('/api/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Topic.findOneAndDelete({ id: Number(id) });
    res.json({ success: true, message: "Node deleted successfully from cloud registry cluster." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET ROUTINE MATRIX LAYOUT GRID DATA ELEMENTS
app.get('/api/routine', async (req, res) => {
  try {
    const routineDoc = await Routine.findOne({ userId: 'default' });
    if (!routineDoc) {
      const defaultRoutine = {
        "Sunday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Monday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Tuesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Wednesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Thursday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], [], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Friday": [[], [], [["Geography", "English"]], [], [], []]
      };
      res.json({ success: true, data: defaultRoutine });
    } else {
      res.json({ success: true, data: routineDoc.routine });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== CATCH ALL ROUTE FOR FRONTEND =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================== START SERVER ENGINE =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server successfully up and operational on port ${PORT}`);
});