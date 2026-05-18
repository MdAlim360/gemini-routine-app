require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend serve
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== MONGODB CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== MONGOOSE SCHEMAS =====================
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
  customReviewInterval: { type: Number, default: null }
});
const Topic = mongoose.model('Topic', topicSchema);

const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default', unique: true },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Routine = mongoose.model('Routine', routineSchema);

// ===================== API ROUTES =====================

// GET /api/topics
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await Topic.find({});
    res.json({ success: true, data: topics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/topics
app.post('/api/topics', async (req, res) => {
  try {
    const newTopic = new Topic(req.body);
    await newTopic.save();
    res.json({ success: true, data: newTopic });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/topics/:id
app.put('/api/topics/:id', async (req, res) => {
  try {
    const updated = await Topic.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/topics/:id
app.delete('/api/topics/:id', async (req, res) => {
  try {
    await Topic.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/routine
app.get('/api/routine', async (req, res) => {
  try {
    const routineDoc = await Routine.findOne({ userId: 'default' });
    if (!routineDoc) {
      const defaultRoutine = {
        "Saturday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Sunday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Monday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
        "Tuesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Transportation", "Earth Quake Engineering", "Structure–I"], ["Geography", "English"], ["Freehand Writing"], ["Excel"], ["Research Class"]],
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

// PUT /api/routine
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

// CATCH ALL
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Running on port ${PORT}`);
});