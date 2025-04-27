// models/InterventionLog.js
const mongoose = require('mongoose');

const interventionLogSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
  },
  diaryId: {
    type: String,
    required: true,
  },
  revisionNumber: {
    type: Number,
    default: 0, // 기본값 수정 번호 0
  },
  createdAt: {
    type: Date,
    default: Date.now, // 생성 시간 자동 저장
  },
  conversation: [
    {
      speaker: { type: String, enum: ['user', 'gpt'], required: true }, // 누가 말했는지 구분
      message: { type: String, required: true } // 발화 내용
    }
  ],
  trigger: {
    type: String, // 감정 트리거 키워드
    default: null,
  },
  triggeredText: {
    type: String, // 트리거 발생 일기 텍스트
    default: '',
  }
});

module.exports = mongoose.model('InterventionLog', interventionLogSchema);
