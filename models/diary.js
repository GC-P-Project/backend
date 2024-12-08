// models/Diary.js
const mongoose = require('mongoose');

const DiarySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // User와 연결
    content: { type: String, required: true }, // 일기 내용
    emotion: { type: String }, // 감정 분석 결과 (선택사항)
    createdAt: { type: Date, default: Date.now } // 생성 날짜
});

module.exports = mongoose.model('Diary', DiarySchema);
