const { startDiaryWriting } = require('./gptClient');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB Connected');
  startDiaryWriting();
}).catch((err) => {
  console.error('MongoDB Connection Error:', err);
});