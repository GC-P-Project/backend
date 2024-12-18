const mongoose = require('mongoose');

// 감정 분석 결과 스키마 (소수점 4자리 및 퍼센트 변환 적용)
const emotionResultSchema = new mongoose.Schema({
  happiness: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) },  // 행복 확률
  sadness: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) },    // 슬픔 확률
  anger: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) },      // 분노 확률
  surprise: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) },   // 놀람 확률
  neutrality: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) }, // 중립 확률
  fear: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) },       // 공포 확률
  disgust: { type: Number, required: true, set: val => parseFloat((val * 100).toFixed(4)) }     // 혐오 확률
});

// 일기장 스키마 (유저 정보, 텍스트, 감정 결과 포함)
const diarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 유저 정보
  text: { type: String, required: true },                                       // 일기장 텍스트
  emotions: { type: emotionResultSchema, required: true },                      // 감정 분석 결과
  createdAt: { type: Date, default: Date.now }                                  // 생성 시간
});

// 모델 생성
const Diary = mongoose.model('Diary', diarySchema);

module.exports = Diary;