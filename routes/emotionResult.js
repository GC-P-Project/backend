const express = require('express');
const router = express.Router();
const Diary = require('../models/emotion_result'); // 새로 만든 스키마 파일

// 일기장 저장 (감정 분석 결과 포함)
router.post('/add', async (req, res) => {
  try {
    const { userId, text, emotions } = req.body;

    const newDiary = new Diary({
      userId,
      text,
      emotions
    });

    const savedDiary = await newDiary.save();
    res.status(201).json(savedDiary); // 저장된 데이터 반환
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving diary entry", error });
  }
});

// 모든 일기장 데이터 가져오기
router.get('/', async (req, res) => {
  try {
    const diaries = await Diary.find();
    res.json(diaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching diary entries", error });
  }
});

module.exports = router;
