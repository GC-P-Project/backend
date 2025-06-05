// models/diaryModel.js
const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
  },
  diaryId: {
    type: String,
    required: true,
    unique: true,
  },
  diaryDate: {
    type: String,
    required: true,
    unique: true,
  },
  emotion: {
    fear: { type: Number, default: 0.0 },
    surprise: { type: Number, default: 0.0 },
    anger: { type: Number, default: 0.0 },
    sadness: { type: Number, default: 0.0 },
    neutral: { type: Number, default: 1.0 },
    happiness: { type: Number, default: 0.0 },
    disgust: { type: Number, default: 0.0 }
  },
  createdAt: {
    type: Date,
    default: Date.now, // 생성 시간 자동 기록
  },
  contents: {
    type: [String], // 일기 내용 배열 (수정 버전별 저장)
    default: [],
  },
  
});

module.exports = mongoose.models.Diary || mongoose.model('Diary', diarySchema);