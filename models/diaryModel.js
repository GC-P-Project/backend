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
  
  diaryDate:{
    type: String,
    required: true,
    unique: true,
  },

  createdAt: {
    type: Date,
    default: Date.now, // 생성 시간 자동 기록
  },
  contents: {
    type: [String], // 일기 내용 배열 (수정 버전별 저장)
    default: [],
  },
  emotion: {
    fear: { type: Number, default: 0.5 },
    surprise: { type: Number, default: 0.5 },
    anger: { type: Number, default: 0.5 },
    sadness: { type: Number, default: 0.5 },
    netural: { type: Number, default: 0.5 },
    happyness: { type: Number, default: 0.5 },
    disgust: { type: Number, default: 0.5 }
  },
});

module.exports = mongoose.models.Diary || mongoose.model('Diary', diarySchema);
