// ===================== EXTENDED MONGOOSE SCHEMAS & MODELS =====================

// User Stats Schema
const userStatsSchema = new mongoose.Schema({
  userId: { type: String, default: 'default', unique: true },
  xp: { type: Number, default: 0 },
  level: { type: String, default: 'Beginner' },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null },
  studyHours: { type: Map, of: Number, default: {} } // Format: { "Monday": 4, "Tuesday": 2.5 }
});
const UserStats = mongoose.model('UserStats', userStatsSchema);

// Goals Schema
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

// Flashcards Schema
const flashcardSchema = new mongoose.Schema({
  front: { type: String, required: true },
  back: { type: String, required: true },
  topic: { type: String, required: true },
  subject: { type: String, required: true },
  nextReviewDate: { type: String, required: true }, // YYYY-MM-DD
  interval: { type: Number, default: 1 }, // in days
  easeFactor: { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 }
});
const Flashcard = mongoose.model('Flashcard', flashcardSchema);

// Exam History Schema
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

// Pomodoro Logs Schema
const pomodoroLogSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  duration: { type: Number, required: true }, // minutes
  date: { type: String, required: true },
  xpEarned: { type: Number, required: true }
});
const PomodoroLog = mongoose.model('PomodoroLog', pomodoroLogSchema);

// Library Notes Schema
const libraryNoteSchema = new mongoose.Schema({
  topicName: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  notes: { type: String, default: '' },
  lastUpdated: { type: String, required: true }
});
const LibraryNote = mongoose.model('LibraryNote', libraryNoteSchema);


// ===================== NEW NEW API ROUTES =====================

// --- USER STATS ---
app.get('/api/stats', async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: 'default' });
    if (!stats) {
      stats = await UserStats.create({ userId: 'default' });
    }
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/stats/xp', async (req, res) => {
  try {
    const { xpAmount } = req.body;
    let stats = await UserStats.findOne({ userId: 'default' });
    if (!stats) stats = new UserStats({ userId: 'default' });
    
    stats.xp += parseInt(xpAmount || 0);
    
    // Level calc logic
    if (stats.xp >= 1000) stats.level = 'Legend';
    else if (stats.xp >= 600) stats.level = 'Master';
    else if (stats.xp >= 350) stats.level = 'Scholar';
    else if (stats.xp >= 150) stats.level = 'Learner';
    else stats.level = 'Beginner';

    await stats.save();
    res.json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- GOALS CRUD ---
app.post('/api/goals', async (req, res) => {
  try {
    const newGoal = new Goal(req.body);
    await newGoal.save();
    res.json({ success: true, data: newGoal });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/goals', async (req, res) => {
  try {
    const goals = await Goal.find({});
    res.json({ success: true, data: goals });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/goals/:id', async (req, res) => {
  try {
    const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updatedGoal });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Goal deleted successfully" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- FLASHCARDS CRUD & SPACING ---
app.post('/api/flashcards', async (req, res) => {
  try {
    const card = new Flashcard(req.body);
    await card.save();
    res.json({ success: true, data: card });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/flashcards', async (req, res) => {
  try {
    const cards = await Flashcard.find({});
    res.json({ success: true, data: cards });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/flashcards/:id', async (req, res) => {
  try {
    const card = await Flashcard.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: card });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- EXAM HISTORY ---
app.post('/api/exams/history', async (req, res) => {
  try {
    const history = new ExamHistory(req.body);
    await history.save();
    res.json({ success: true, data: history });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/exams/history', async (req, res) => {
  try {
    const records = await ExamHistory.find({});
    res.json({ success: true, data: records });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- POMODORO SESSIONS LOG ---
app.post('/api/pomodoro/log', async (req, res) => {
  try {
    const log = new PomodoroLog(req.body);
    await log.save();
    res.json({ success: true, data: log });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- KNOWLEDGE LIBRARY NOTES ---
app.post('/api/library/notes', async (req, res) => {
  try {
    const { topicName, subject, notes, lastUpdated } = req.body;
    const updatedNote = await LibraryNote.findOneAndUpdate(
      { topicName },
      { topicName, subject, notes, lastUpdated },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updatedNote });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/library/notes', async (req, res) => {
  try {
    const notes = await LibraryNote.find({});
    res.json({ success: true, data: notes });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});