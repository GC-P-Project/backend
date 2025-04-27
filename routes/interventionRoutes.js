const express = require('express');
const router = express.Router();
const InterventionLog = require('../models/InterventionLog');


/**
 * @swagger
 * tags:
 *   name: Interventions
 *   description: 개입 로그 관련 API
 */

/**
 * @swagger
 * /interventions:
 *   post:
 *     summary: 개입 로그 생성
 *     tags: [Interventions]
 *     requestBody:
 *       description: 생성할 개입 로그 정보
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - diaryId
 *               - conversation
 *               - trigger
 *               - triggeredText
 *             properties:
 *               uid:
 *                 type: string
 *               diaryId:
 *                 type: string
 *               revisionNumber:
 *                 type: integer
 *               conversation:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     speaker:
 *                       type: string
 *                       enum: [user, gpt]
 *                     message:
 *                       type: string
 *               trigger:
 *                 type: string
 *               triggeredText:
 *                 type: string
 *     responses:
 *       201:
 *         description: 개입 로그 생성 성공
 */
// 1. Create - 개입 로그 작성
router.post('/', async (req, res) => {
  try {
    const log = new InterventionLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/**
 * @swagger
 * /interventions:
 *   get:
 *     summary: 모든 개입 로그 조회
 *     tags: [Interventions]
 *     responses:
 *       200:
 *         description: 전체 개입 로그 조회 성공
 */
// 2. Read (전체) - 모든 개입 로그 조회
router.get('/', async (req, res) => {
  try {
    const logs = await InterventionLog.find();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /interventions/{diaryId}:
 *   get:
 *     summary: 특정 개입 로그 조회
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 개입 로그 조회 성공
 */
// 3. Read (개별) - 특정 다이어리의 개입 로그 조회
router.get('/:diaryId', async (req, res) => {
  try {
    const log = await InterventionLog.findOne({ diaryId: req.params.diaryId });
    if (!log) return res.status(404).json({ error: 'Intervention log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /interventions/{diaryId}:
 *   put:
 *     summary: 특정 개입 로그 수정
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 개입 로그 수정 성공
 */
// 4. Update - 특정 다이어리의 개입 로그 수정
router.put('/:diaryId', async (req, res) => {
  try {
    const updateData = req.body;

    const log = await InterventionLog.findOneAndUpdate(
      { diaryId: req.params.diaryId },
      updateData,
      { new: true }
    );

    if (!log) return res.status(404).json({ error: 'Intervention log not found' });

    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/**
 * @swagger
 * /interventions/{diaryId}:
 *   delete:
 *     summary: 특정 개입 로그 삭제
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 개입 로그 삭제 성공
 */
// 5. Delete - 특정 다이어리의 개입 로그 삭제
router.delete('/:diaryId', async (req, res) => {
  try {
    const log = await InterventionLog.findOneAndDelete({ diaryId: req.params.diaryId });
    if (!log) return res.status(404).json({ error: 'Intervention log not found' });

    res.json({ message: 'Intervention log deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
