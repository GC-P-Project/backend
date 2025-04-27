// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: null, // 선택사항
  },
  age: {
    type: Number,
    default: null, // 선택사항
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'], // 선택사항
    default: null,
  },
  location: {
    type: String,
    default: null, // 선택사항
  },
  physicalInfo: {
    type: mongoose.Schema.Types.Mixed, // 신체 정보는 다양하게 받을 수 있으니 유연하게 설정
    default: null,
  },
  interventionStrength: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
  },
  traits: {
    honestyHumility: { type: Number, default: 0.5 },
    emotionalStability: { type: Number, default: 0.5 },
    extraversion: { type: Number, default: 0.5 },
    conscientiousness: { type: Number, default: 0.5 },
    openness: { type: Number, default: 0.5 },
    riskPropensity: { type: Number, default: 0.5 },
    needForCognition: { type: Number, default: 0.5 },
    futureTimePerspective: { type: Number, default: 0.5 }
  },
  consent: {
    type: Boolean,
    required: true,
    default: false // 기본은 미동의 상태
  }
}, { timestamps: true }); // createdAt, updatedAt 자동 생성

module.exports = mongoose.model('User', userSchema);
