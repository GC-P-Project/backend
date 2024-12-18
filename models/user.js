const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User 스키마 정의
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다.'],
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

// 비밀번호 해시화 미들웨어
userSchema.pre('save', async function (next) {
  // 비밀번호가 변경된 경우에만 해시화
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10); // 솔트 생성
      this.password = await bcrypt.hash(this.password, salt); // 비밀번호 해시화
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// User 모델 생성 및 내보내기
module.exports = mongoose.model('User', userSchema);


