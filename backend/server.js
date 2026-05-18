require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static frontend engine deployment configuration serve
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== MONGODB CONNECTION =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===================== MONGOOSE SCHEMAS =====================

// Topic Schema config support dynamic metadata flags
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
  customReviewHistoryDates: { type: [String], default: [] },
  isGoalNode: { type: Boolean, default: false } // Strategic trajectory task nodes indicator mapping flag
});

const Topic = mongoose.model('Topic', topicSchema);

// Routine configuration schema rules matrix
const routineSchema = new mongoose.Schema({
  userId: { type: String, default: 'default' },
  routine: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Routine = mongoose.model('Routine', routineSchema);

// ===================== API CONTROLLER ROUTING =====================

// helper aggregate processor function blocks duplication optimization passes
async function fetchAndFormatGroupedTopics(res) {
  const topics = await Topic.find({});
  const grouped = topics.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});
  return res.json({ success: true, data: grouped });
}

// 1. GET ALL TOPICS
app.get('/api/topics', async (req, res) => {
  try { return await fetchAndFormatGroupedTopics(res); } 
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 2. INJECT NEW TOPIC OR BLUEPRINT GOALS TARGET PATHWAYS
app.post('/api/topics', async (req, res) => {
  try {
    const rawData = req.body;
    let numericId = typeof rawData.id === 'string' && rawData.id.startsWith('goal-') 
      ? parseInt(rawData.id.replace('goal-', '')) 
      : Number(rawData.id);

    const newTopic = new Topic({ ...rawData, id: numericId });
    await newTopic.save();
    return await fetchAndFormatGroupedTopics(res);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 3. EDIT STATUS ARCHIVES OR CALENDAR ATOMIC DATES RESCHEDULE DATA
app.put('/api/topics/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    await Topic.findOneAndUpdate({ id: targetId }, req.body, { new: true });
    return await fetchAndFormatGroupedTopics(res);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 4. PURGE TIMELINE ENTITY CODES FROM DATABASE
app.delete('/api/topics/:id', async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    await Topic.deleteOne({ id: targetId });
    return await fetchAndFormatGroupedTopics(res);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 5. GET THE ROUTINE BLUEPRINT RULES MATRIX
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
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 6. UPDATE STATIC MATRIX RULES SETUP CONFIGURATIONS
app.put('/api/routine', async (req, res) => {
  try {
    await Routine.findOneAndUpdate({ userId: 'default' }, { userId: 'default', routine: req.body }, { upsert: true, new: true });
    res.json({ success: true, data: req.body });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ===================== FALLBACK STATIC CATCH INTERFACE FOR CLIENTS =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===================== LIVE NODE ENGINE PORT LISTENER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`🚀 API System Node Engine live on port: ${PORT}`); });