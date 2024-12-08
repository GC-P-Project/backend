const express = require('express');
const router = express.Router();
const Diary = require('../models/diary');

// Create a new diary entry
router.post('/', async (req, res) => {
    try {
        const { user, content, emotion } = req.body; // 요청 본문에서 데이터 가져오기
        const newDiary = new Diary({ user, content, emotion }); // Diary 모델 생성
        const savedDiary = await newDiary.save(); // MongoDB에 저장
        res.status(201).json(savedDiary); // 성공 응답
    } catch (err) {
        res.status(400).json({ error: err.message }); // 오류 응답
    }
});

// Get all diary entries for a user
router.get('/:userId', async (req, res) => {
    try {
        const diaries = await Diary.find({ user: req.params.userId }); // 특정 사용자 일기 찾기
        res.json(diaries); // 데이터 반환
    } catch (err) {
        res.status(500).json({ error: err.message }); // 서버 오류
    }
});

module.exports = router;
