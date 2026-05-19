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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learning_routine')
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
  reviewsDone: { type: [Number], default: [] },
  reviewHistoryStamps: { type: mongoose.Schema.Types.Mixed, default: {} },
  customRevPendingOn: { type: String, default: null },
  customReviewHistoryDates: { type: [String], default: [] }
}, { timestamps: true });

// Routine Schema
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const Topic = mongoose.model('Topic', topicSchema);
const Routine = mongoose.model('Routine', routineSchema);

// ===================== HELPER FUNCTIONS =====================

async function getAllTopicsGrouped() {
  const allTopics = await Topic.find({}).lean();
  const grouped = {};
  allTopics.forEach(t => {
    const { _id, __v, createdAt, updatedAt, ...cleanTopic } = t;
    if (!grouped[cleanTopic.date]) grouped[cleanTopic.date] = [];
    grouped[cleanTopic.date].push(cleanTopic);
  });
  return grouped;
}

// Default routine data
const defaultRoutine = {
  Saturday: [["AI Engineering","JavaScript"],["Structure–II","R.C.C–II"],["Geography"],["English Speaking"],["QGIS"],["ML"]],
  Sunday: [["AI Engineering"],["Structure–II"],[],["English"],["QGIS"],["ML"]],
  Monday: [["AI Engineering"],["Geotech–II"],["Geography"],["Basic English"],["SAP 2000"],["ML"]],
  Tuesday: [["AI Engineering"],["Geotech–II"],[],["Basic English"],["SAP 2000"],["ML"]],
  Wednesday: [["AI Engineering"],["Transportation"],["Geography"],["Freehand Writing"],["Excel"],["Research"]],
  Thursday: [["AI Engineering"],["Transportation"],[],["Freehand Writing"],["Excel"],["Research"]],
  Friday: [[],[],["Geography"],[],[],[]]
};

// ===================== ROUTES: TOPICS =====================

app.get('/api/topics', async (req, res) => {
  try {
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/topics', async (req, res) => {
  try {
    const topicData = req.body;
    const topic = new Topic(topicData);
    await topic.save();
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    if (err.code === 11000) {
      try {
        const topicData = { ...req.body, id: Date.now() + Math.floor(Math.random() * 1000) };
        const topic = new Topic(topicData);
        await topic.save();
        const grouped = await getAllTopicsGrouped();
        res.json({ success: true, data: grouped });
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

app.put('/api/topics/:id', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id);
    await Topic.findOneAndUpdate({ id: topicId }, req.body, { new: true, upsert: false });
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/topics/:id', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id);
    await Topic.findOneAndDelete({ id: topicId });
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/topics/bulk', async (req, res) => {
  try {
    const dbTopics = req.body;
    const allTopics = [];
    Object.keys(dbTopics).forEach(dateStr => {
      dbTopics[dateStr].forEach(t => allTopics.push(t));
    });
    for (const topic of allTopics) {
      await Topic.findOneAndUpdate(
        { id: topic.id },
        topic,
        { upsert: true, new: true }
      );
    }
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped, message: `${allTopics.length} topics synced!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== ROUTES: ROUTINE =====================

app.get('/api/routine', async (req, res) => {
  try {
    let routineDoc = await Routine.findOne({ userId: 'default' }).lean();
    if (!routineDoc) {
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

// ===================== CATCH ALL =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/topics`);
  console.log(`   POST /api/topics`);
  console.log(`   PUT  /api/topics/:id`);
  console.log(`   DELETE /api/topics/:id`);
  console.log(`   GET  /api/routine`);
  console.log(`   PUT  /api/routine`);
});