const express = require('express');
const router = express.Router();
const Emotion = require('../models/emotion_result'); // 새로 만든 스키마 파일

// 일기장 저장 (감정 분석 결과 포함)
router.post('/add', async (req, res) => {
  try {
    const { userId, context, emotions } = req.body;

    const newEmotion = new Emotion({
      userId,
      context,
      emotions
    });

    const savedEmotion = await newEmotion.save();
    res.status(201).json(savedEmotion); // 저장된 데이터 반환
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving Emotion entry", error });
  }
});

// 모든 감정 결과 가져오기
router.get('/', async (req, res) => {
    try {
      const emotions = await Emotion.find();
      res.json(emotions);
    } catch (error) {
      console.error('Error fetching emotion results:', error.message);
      res.status(500).json({ message: "Error fetching diary entries", error: error.message });
    }
  });
  
  module.exports = router;
