const express = require('express');
const router = express.Router();
const Diary = require('../models/diary'); // diary.js 파일 연결

// GET 요청: 모든 일기 조회 , 특정 사용자의 다이어리 목록 조회
router.get('/user/:userId', async (req, res) => {
    try {
      const diaries = await Diary.find({ user: req.params.userId }).populate('user', 'name email');
      res.status(200).json(diaries);
    } catch (err) {
      console.error('Error fetching user diaries:', err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
router.get('/', async (req, res) => {
  try{
    console.log("Call");
  } catch(err){
    console.error("ERROR");
  }
});

// Create a new diary entry with validation
router.post('/', async (req, res) => {
    const { user, content } = req.body;
  
    // 1. 사용자 ID가 유효한 ObjectId인지 확인
    if (!/^[0-9a-fA-F]{24}$/.test(user)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
  
    // 2. 내용(content) 필드 유효성 검증
    if (!content || content.length < 5) {
      return res.status(400).json({ error: 'Content must be at least 5 characters long.' });
    }
  
    try {
      // 3. 다이어리 저장
      const newDiary = new Diary({ user, content });
      const savedDiary = await newDiary.save();
      res.status(201).json(savedDiary);
    } catch (err) {
      console.error('Error creating diary:', err.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  module.exports = router;
