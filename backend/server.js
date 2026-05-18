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
  customReviewHistoryDates: { type: [String], default: [] }
}, { timestamps: true });

// Routine Schema (weekly schedule)
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

// Goal Tracker Schema
const goalSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  subject: { type: String, required: true },
  durationDays: { type: Number, required: true },
  topics: [{
    dayIndex: { type: Number, required: true },
    topicName: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Complete'], default: 'Pending' },
    completedDate: { type: String, default: null }
  }],
  status: { type: String, enum: ['Active', 'Completed'], default: 'Active' },
  rewardClaimed: { type: Boolean, default: false }
}, { timestamps: true });

const Topic = mongoose.model('Topic', topicSchema);
const Routine = mongoose.model('Routine', routineSchema);
const Goal = mongoose.model('Goal', goalSchema);

// ===================== HELPER =====================
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
    const topic = new Topic(req.body);
    await topic.save();
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    if (err.code === 11000) {
      try {
        const topicData = { ...req.body, id: Date.now() + Math.floor(Math.random() * 1000) };
        const altTopic = new Topic(topicData);
        await altTopic.save();
        const grouped = await getAllTopicsGrouped();
        return res.json({ success: true, data: grouped });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/topics/:id', async (req, res) => {
  try {
    const topicId = parseInt(req.params.id);
    const updatedTopic = await Topic.findOneAndUpdate({ id: topicId }, req.body, { new: true });
    
    // Automatic Goal Integration: dynamic target binding
    if (updatedTopic && updatedTopic.status === 'Complete') {
      const activeGoals = await Goal.find({ 
        category: updatedTopic.category, 
        subject: updatedTopic.subject, 
        status: 'Active' 
      });

      for (let goal of activeGoals) {
        let updated = false;
        for (let t of goal.topics) {
          if (t.status === 'Pending' && updatedTopic.topicName.toLowerCase().includes(t.topicName.toLowerCase())) {
            t.status = 'Complete';
            t.completedDate = updatedTopic.completionDate || new Date().toISOString().split('T')[0];
            updated = true;
            break;
          }
        }
        if (!updated) {
          let nextPending = goal.topics.find(t => t.status === 'Pending');
          if (nextPending) {
            nextPending.status = 'Complete';
            nextPending.completedDate = updatedTopic.completionDate || new Date().toISOString().split('T')[0];
            updated = true;
          }
        }
        const totalTopics = goal.topics.length;
        const completeTopics = goal.topics.filter(t => t.status === 'Complete').length;
        if (totalTopics === completeTopics) {
          goal.status = 'Completed';
        }
        await goal.save();
      }
    }

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
      await Topic.findOneAndUpdate({ id: topic.id }, topic, { upsert: true });
    }
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
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
        "Saturday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Structure–II", "R.C.C–II"], ["Geography", "English"], ["English Speaking"], ["QGIS"], ["Machine Learning"]],
        "Sunday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Structure–II", "R.C.C–II"], [], ["English Speaking"], ["QGIS"], ["Machine Learning"]],
        "Monday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Geotech–II", "Steel Structure"], ["Geography", "English"], ["Basic English"], ["SAP 2000"], ["Machine Learning"]],
        "Tuesday": [["AI Engineering – L2", "JavaScript", "Typing Practice"], ["Geotech–II", "Steel Structure"], [], ["Basic English"], ["SAP 2000"], ["Machine Learning"]],
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

// ===================== ROUTES: GOAL TRACKER =====================
app.get('/api/goals', async (req, res) => {
  try {
    const goals = await Goal.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const newGoal = new Goal(req.body);
    await newGoal.save();
    const goals = await Goal.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/goals/:id/advance', async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const goal = await Goal.findOne({ id: goalId });
    if (!goal) return res.status(404).json({ success: false, error: 'Goal not found' });
    
    let nextPending = goal.topics.find(t => t.status === 'Pending');
    if (nextPending) {
      nextPending.status = 'Complete';
      nextPending.completedDate = new Date().toISOString().split('T')[0];
    }
    
    const totalTopics = goal.topics.length;
    const completeTopics = goal.topics.filter(t => t.status === 'Complete').length;
    if (totalTopics === completeTopics) {
      goal.status = 'Completed';
    }
    await goal.save();
    const goals = await Goal.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/goals/:id/claim', async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const goal = await Goal.findOneAndUpdate({ id: goalId }, { rewardClaimed: true }, { new: true });
    const goals = await Goal.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    await Goal.findOneAndDelete({ id: goalId });
    const goals = await Goal.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== CATCH ALL: Serve frontend =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Premium Engine Server running on port ${PORT}`);
});