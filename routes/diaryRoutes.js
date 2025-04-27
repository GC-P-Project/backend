const express = require('express');
const router = express.Router();
const Diary = require('../models/diaryModel');


/**
 * @swagger
 * tags:
 *   name: Diaries
 *   description: 일기 관련 API
 */

/**
 * @swagger
 * /diaries:
 *   post:
 *     summary: 일기 작성
 *     tags: [Diaries]
 *     requestBody:
 *       description: 작성할 일기 정보
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - diaryId
 *               - contents
 *             properties:
 *               uid:
 *                 type: string
 *               diaryId:
 *                 type: string
 *               contents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 일기 생성 성공
 */
// 1. Create - 일기 작성
router.post('/', async (req, res) => {
  try {
    const diary = new Diary(req.body);
    await diary.save();
    res.status(201).json(diary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/**
 * @swagger
 * /diaries/{diaryId}:
 *   get:
 *     summary: 특정 일기 조회
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 일기 조회 성공
 */
// 2. Read - 일기 조회
router.get('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOne({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });
    res.json(diary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /diaries/{diaryId}:
 *   put:
 *     summary: 일기 수정 (새로운 내용 추가)
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: 추가할 일기 내용
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: 일기 수정 성공
 */
// 3. Update - 일기 수정 (새로운 텍스트 추가)
router.put('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOne({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });

    const { newContent } = req.body;
    if (!newContent) {
      return res.status(400).json({ error: 'newContent is required' });
    }

    diary.contents.push(newContent); // contents 배열에 추가
    await diary.save();

    res.json({
      message: 'Diary updated successfully',
      latestContent: newContent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /diaries/{diaryId}:
 *   delete:
 *     summary: 특정 일기 삭제
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 일기 삭제 성공
 */
// 4. Delete - 일기 삭제
router.delete('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOneAndDelete({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });

    res.json({ message: 'Diary deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
