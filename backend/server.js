require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== MONGODB CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== LEGACY SCHEMAS (YOUR ORIGINAL DATABASE) =====================
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

// ===================== UPGRADED FEATURES SCHEMAS =====================
const userStatsSchema = new mongoose.Schema({
  userId: { type: String, default: 'default', unique: true },
  xp: { type: Number, default: 0 },
  level: { type: String, default: 'Beginner' },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null },
  studyHours: { type: Map, of: Number, default: {} }
});
const UserStats = mongoose.model('UserStats', userStatsSchema);

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  deadline: { type: String, required: true },
  category: { type: String, enum: ['BCS', 'Engineering', 'Programming', 'English'], required: true },
  description: { type: String, default: '' },
  milestones: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});
const Goal = mongoose.model('Goal', goalSchema);

const flashcardSchema = new mongoose.Schema({
  front: { type: String, required: true },
  back: { type: String, required: true },
  topic: { type: String, required: true },
  subject: { type: String, required: true },
  nextReviewDate: { type: String, required: true },
  interval: { type: Number, default: 1 },
  easeFactor: { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 }
});
const Flashcard = mongoose.model('Flashcard', flashcardSchema);

const examHistorySchema = new mongoose.Schema({
  topic: { type: String, required: true },
  subject: { type: String, required: true },
  examType: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  feedback: { type: String, default: '' },
  date: { type: String, required: true }
});
const ExamHistory = mongoose.model('ExamHistory', examHistorySchema);

const pomodoroLogSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true },
  xpEarned: { type: Number, required: true }
});
const PomodoroLog = mongoose.model('PomodoroLog', pomodoroLogSchema);

const libraryNoteSchema = new mongoose.Schema({
  topicName: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  notes: { type: String, default: '' },
  lastUpdated: { type: String, required: true }
});
const LibraryNote = mongoose.model('LibraryNote', libraryNoteSchema);

// ===================== ORIGINAL API ROUTES =====================
app.get('/api/topics', async (req, res) => {
  try { res.json({ success: true, data: await Topic.find({}) }); } 
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/topics', async (req, res) => {
  try {
    const newTopic = new Topic(req.body);
    await newTopic.save();
    res.json({ success: true, data: newTopic });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/topics/:id', async (req, res) => {
  try {
    const updated = await Topic.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/topics/:id', async (req, res) => {
  try {
    await Topic.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Topic deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

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
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/routine', async (req, res) => {
  try {
    await Routine.findOneAndUpdate({ userId: 'default' }, { userId: 'default', routine: req.body }, { upsert: true, new: true });
    res.json({ success: true, data: req.body });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ===================== NEW UPGRADED MODULE ROUTES =====================
app.get('/api/stats', async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: 'default' });
    if (!stats) stats = await UserStats.create({ userId: 'default' });
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/stats/xp', async (req, res) => {
  try {
    const { xpAmount } = req.body;
    let stats = await UserStats.findOne({ userId: 'default' }) || new UserStats({ userId: 'default' });
    stats.xp += parseInt(xpAmount || 0);
    if (stats.xp >= 1000) stats.level = 'Legend';
    else if (stats.xp >= 600) stats.level = 'Master';
    else if (stats.xp >= 350) stats.level = 'Scholar';
    else if (stats.xp >= 150) stats.level = 'Learner';
    else stats.level = 'Beginner';
    await stats.save();
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/goals', async (req, res) => {
  try { const g = new Goal(req.body); await g.save(); res.json({ success: true, data: g }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/goals', async (req, res) => {
  try { res.json({ success: true, data: await Goal.find({}) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.put('/api/goals/:id', async (req, res) => {
  try { res.json({ success: true, data: await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.delete('/api/goals/:id', async (req, res) => {
  try { await Goal.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/flashcards', async (req, res) => {
  try { const c = new Flashcard(req.body); await c.save(); res.json({ success: true, data: c }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/flashcards', async (req, res) => {
  try { res.json({ success: true, data: await Flashcard.find({}) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.put('/api/flashcards/:id', async (req, res) => {
  try { res.json({ success: true, data: await Flashcard.findByIdAndUpdate(req.params.id, req.body, { new: true }) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/exams/history', async (req, res) => {
  try { const h = new ExamHistory(req.body); await h.save(); res.json({ success: true, data: h }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/exams/history', async (req, res) => {
  try { res.json({ success: true, data: await ExamHistory.find({}) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/pomodoro/log', async (req, res) => {
  try { const l = new PomodoroLog(req.body); await l.save(); res.json({ success: true, data: l }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/library/notes', async (req, res) => {
  try {
    const { topicName, subject, notes, lastUpdated } = req.body;
    const updated = await LibraryNote.findOneAndUpdate({ topicName }, { topicName, subject, notes, lastUpdated }, { upsert: true, new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/library/notes', async (req, res) => {
  try { res.json({ success: true, data: await LibraryNote.find({}) }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Super Hub Server Running on port ${PORT}`));