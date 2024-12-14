const mongoose = require('mongoose');

// User 스키마 정의
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '사용자 이름은 필수입니다.'],
  },
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
  },
  age: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// User 모델 생성 및 내보내기
module.exports = mongoose.model('User', userSchema);

