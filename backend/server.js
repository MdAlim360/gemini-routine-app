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

// Routine Schema
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

// User Profile / Gamification Schema
const profileSchema = new mongoose.Schema({
  userId: { type: String, default: 'default', unique: true },
  xp: { type: Number, default: 0 },
  level: { type: String, default: 'Beginner Scholar' },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }
}, { timestamps: true });

// Quiz Logs Schema
const quizResultSchema = new mongoose.Schema({
  topicId: { type: Number, required: true },
  topicName: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  quizType: { type: String, required: true },
  dateTaken: { type: String, required: true }
}, { timestamps: true });

const Topic = mongoose.model('Topic', topicSchema);
const Routine = mongoose.model('Routine', routineSchema);
const Profile = mongoose.model('Profile', profileSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);

// ===================== HELPERS =====================
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

// ===================== ROUTES: GAMIFICATION & PROFILE =====================
app.get('/api/profile', async (req, res) => {
  try {
    let prof = await Profile.findOne({ userId: 'default' });
    if (!prof) {
      prof = new Profile({ userId: 'default', xp: 0, level: 'Novice Engineer', streak: 0 });
      await prof.save();
    }
    res.json({ success: true, data: prof });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/profile/reward', async (req, res) => {
  try {
    const { xpToAdd, currentTodayStr } = req.body;
    let prof = await Profile.findOne({ userId: 'default' });
    if (!prof) prof = new Profile({ userId: 'default' });

    prof.xp += xpToAdd;
    
    // Level-up threshold checks
    if (prof.xp >= 1500) prof.level = "Grandmaster Mythic 🌌";
    else if (prof.xp >= 800) prof.level = "Elite Scholar 🏆";
    else if (prof.xp >= 300) prof.level = "Senior Engineer ⚡";
    else if (prof.xp >= 100) prof.level = "Academic Warrior 📚";
    else prof.level = "Novice Engineer ⚙️";

    // Streak Logic
    if (currentTodayStr) {
      if (prof.lastActiveDate === currentTodayStr) {
        // Do nothing, already logged today
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];
        
        if (prof.lastActiveDate === yestStr || prof.streak === 0) {
          prof.streak += 1;
        } else {
          prof.streak = 1; // broken streak
        }
        prof.lastActiveDate = currentTodayStr;
      }
    }

    await prof.save();
    res.json({ success: true, data: prof });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== ROUTES: QUIZ ENGINE =====================
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { topicName, subject, category, type } = req.body;
    
    // AI Mock Quiz Generator 
    // প্রোডাকশনে আপনি এখানে OpenAI/Gemini API-র fetch SDK বসাতে পারেন।
    let questions = [];
    if (type === 'MCQ') {
      questions = [
        { q: `What is the fundamental engineering cornerstone of "${topicName}"?`, o: ["Optimized Threshold Matrix", "Standard Variable Constant", "Dynamic Distribution Model", "Legacy Structural Overlay"], a: "Optimized Threshold Matrix" },
        { q: `Which standard constraint is critically bound to ${subject}?`, o: ["Volumetric Load Factor", "Elastic Stress Boundary", "Isomorphic Scalability", "None of the above"], a: "Elastic Stress Boundary" }
      ];
    } else if (type === 'True/False') {
      questions = [
        { q: `In ${category}, evaluating "${topicName}" requires mandatory Spaced Repetition vectors.`, o: ["True", "False"], a: "True" },
        { q: `A legacy constraint directly accelerates memory retention by over 400%.`, o: ["True", "False"], a: "False" }
      ];
    } else if (type === 'Gap-Filling') {
      questions = [
        { q: `The core algorithmic process used in ${subject} to parse "${topicName}" is known as __________ Analysis.`, a: "Dynamic" },
        { q: `To minimize error thresholds, engineers must synchronize custom __________ maps.`, a: "Revision" }
      ];
    } else {
      // Flashcard / Broad Question mode
      questions = [
        { q: `Core Flashcard concept for ${topicName}: Explain the interaction between ${subject} and structural scaling.`, a: "This concept demands systematic spaced execution loops combined with regular analytics tracking." }
      ];
    }

    res.json({ success: true, quiz: questions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/quiz/save-result', async (req, res) => {
  try {
    const log = new QuizResult(req.body);
    await log.save();
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/quiz/analytics', async (req, res) => {
  try {
    const logs = await QuizResult.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== ROUTES: ORIGINAL TOPICS & ROUTINE =====================
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
    await Topic.findOneAndUpdate({ id: topicId }, req.body, { new: true });
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
    const dbTopicsInput = req.body;
    const allTopics = [];
    Object.keys(dbTopicsInput).forEach(dateStr => {
      dbTopicsInput[dateStr].forEach(t => allTopics.push(t));
    });
    for (const topic of allTopics) {
      await Topic.findOneAndUpdate({ id: topic.id }, topic, { upsert: true, new: true });
    }
    const grouped = await getAllTopicsGrouped();
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
      return res.json({ success: true, data: defaultRoutine });
    }
    res.json({ success: true, data: routineDoc.routine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/routine', async (req, res) => {
  try {
    await Routine.findOneAndUpdate(
      { userId: 'default' },
      { userId: 'default', routine: req.body },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Mastermind Server running on port ${PORT}`));