require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend serve (production a)
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== MONGODB CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== MONGOOSE SCHEMAS =====================

// Topic Record Schema
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
  customRevPendingOn: { type: String, default: null },
  customReviewHistoryDates: { type: [String], default: [] }
});

const Topic = mongoose.model('Topic', topicSchema);

// Routine Schema
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default', unique: true },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Routine = mongoose.model('Routine', routineSchema);

// ===================== API ROUTES =====================

// GET /api/topics — grouping structured format to match frontend state logic
app.get('/api/topics', async (req, res) => {
  try {
    const allTopics = await Topic.find({});
    // UI expects date indexed object mapping layout: { "2026-05-18": [...] }
    const grouped = {};
    allTopics.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/topics — insert target node inside pipeline
app.post('/api/topics', async (req, res) => {
  try {
    const newTopicData = req.body;
    const item = new Topic(newTopicData);
    await item.save();

    // Return the updated global grouped state
    const allTopics = await Topic.find({});
    const grouped = {};
    allTopics.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/topics/:id — updating record arrays
app.put('/api/topics/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const updatedBody = req.body;
    
    await Topic.findOneAndUpdate({ id: targetId }, updatedBody, { new: true });

    // Fetch refreshed system map
    const allTopics = await Topic.find({});
    const grouped = {};
    allTopics.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/topics/:id — destructive data purge desk api
app.delete('/api/topics/:id', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    await Topic.deleteOne({ id: targetId });

    // Return current database status mapping
    const allTopics = await Topic.find({});
    const grouped = {};
    allTopics.forEach(t => {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/routine — retrieve setup structure map
app.get('/api/routine', async (req, res) => {
  try {
    const routineDoc = await Routine.findOne({ userId: 'default' });
    if (!routineDoc) {
      // Default structure framework configuration layout matrix tracking block
      const defaultRoutine = {
        "Saturday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Sunday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], [], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Monday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Tuesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], [], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Wednesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Thursday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], [], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Friday": [[], [], ["Geography", "English"], [], [], []]
      };
      res.json({ success: true, data: defaultRoutine });
    } else {
      res.json({ success: true, data: routineDoc.routine });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/routine — routine update matrix node
app.put('/api/routine', async (req, res) => {
  try {
    const routineData = req.body;
    await Routine.findOneAndUpdate(
      { userId: 'default' },
      { userId: 'default', routine: routineData },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: routineData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== CATCH ALL: Serve frontend =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================== SERVER START BOOT =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Automated Engine Running On Port: ${PORT}`);
});