const mongoose = require('mongoose');
require('./user'); // User 모델 등록

const diarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User 모델 참조
    required: [true, 'User ID는 필수 입력값입니다.'],
  },
  content: {
    type: String,
    required: [true, '일기 내용은 필수 입력값입니다.'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    unique: true
  },
});

module.exports = mongoose.model('Diary', diarySchema);

