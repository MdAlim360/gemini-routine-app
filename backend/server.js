require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend serve (production এ)
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
  customReviewIntervalDays: { type: Number, default: null }
}, { timestamps: true });

const Topic = mongoose.model('Topic', topicSchema);

// Routine Schema
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const Routine = mongoose.model('Routine', routineSchema);

// Goal Schema
const goalSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  goals: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const Goal = mongoose.model('Goal', goalSchema);


// ===================== ROUTES: TOPICS =====================

// GET /api/topics — fetch all topics
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await Topic.find({});
    const grouped = {};
    topics.forEach(t => {
      if(!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/topics — create multi topics
app.post('/api/topics', async (req, res) => {
  try {
    const items = req.body;
    const saved = await Topic.insertMany(items);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/topics — update single topic
app.put('/api/topics', async (req, res) => {
  try {
    const updatedTopic = req.body;
    const doc = await Topic.findOneAndUpdate(
      { id: updatedTopic.id },
      updatedTopic,
      { new: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/topics — delete single topic
app.delete('/api/topics', async (req, res) => {
  try {
    const { id } = req.query;
    await Topic.findOneAndDelete({ id: Number(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===================== ROUTES: ROUTINE =====================

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


// ===================== ROUTES: GOALS =====================

app.get('/api/goals', async (req, res) => {
  try {
    let goalDoc = await Goal.findOne({ userId: 'default' });
    if (!goalDoc) {
      const defaultGoals = {
        "Programming": 20,
        "Academic / Gov Job": 20,
        "BCS": 20,
        "English": 20,
        "Software": 20,
        "Research / ML": 20
      };
      goalDoc = new Goal({ userId: 'default', goals: defaultGoals });
      await goalDoc.save();
    }
    res.json({ success: true, data: goalDoc.goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/goals', async (req, res) => {
  try {
    const updatedGoals = req.body;
    const goalDoc = await Goal.findOneAndUpdate(
      { userId: 'default' },
      { userId: 'default', goals: updatedGoals },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: goalDoc.goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===================== CATCH ALL =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});