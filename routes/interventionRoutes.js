// routes/interventionRoutes.js
const express = require('express');
const router = express.Router();
const InterventionLog = require('../models/InterventionLog');
const {
  startIntervention,
  continueIntervention,
  exitIntervention,
  updateConversation,
} = require('../controllers/interventionController');

/**
 * @swagger
 * /interventions:
 *   post:
 *     summary: Intervention log 생성
 *     tags: [Interventions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InterventionLog'
 *     responses:
 *       201:
 *         description: 생성 성공
 *       400:
 *         description: 요청 오류
 */
router.post('/', async (req, res) => {
  try {
    const intervention = new InterventionLog(req.body);
    await intervention.save();
    res.status(201).json(intervention);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /interventions:
 *   get:
 *     summary: 모든 Intervention log 조회
 *     tags: [Interventions]
 *     responses:
 *       200:
 *         description: 조회 성공
 */
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
 *     summary: 특정 diaryId로 Intervention log 조회
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 조회 성공
 *       404:
 *         description: 찾을 수 없음
 */
router.get('/:diaryId', async (req, res) => {
  try {
    const log = await InterventionLog.findOne({ diaryId: req.params.diaryId });
    if (!log) return res.status(404).json({ error: 'Intervention log not found' });
    res.status(200).json(log.conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /interventions/{diaryId}:
 *   put:
 *     summary: Intervention log 수정
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
 *             $ref: '#/components/schemas/InterventionLog'
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:diaryId', async (req, res) => {
  try {
    const { conversation } = req.body;

    const updated = await InterventionLog.findOneAndUpdate(
      { diaryId: req.params.diaryId },
      { $set: { conversation } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Intervention log not found' });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /interventions/{diaryId}:
 *   delete:
 *     summary: Intervention log 삭제
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 찾을 수 없음
 */
router.delete('/:diaryId', async (req, res) => {
  try {
    const log = await InterventionLog.findOneAndDelete({ diaryId: req.params.diaryId });
    if (!log) return res.status(404).json({ error: 'Intervention log not found' });
    res.status(200).json({ message: 'Intervention log deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /interventions/start:
 *   post:
 *     summary: 개입 트리거 감지 + GPT 개입 시작
 *     tags: [Interventions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: 개입 여부 및 첫 GPT 응답 반환
 */
router.post('/start', startIntervention);

/**
 * @swagger
 * /interventions/continue:
 *   post:
 *     summary: 기존 개입 대화에 사용자 입력 추가
 *     tags: [Interventions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *               userInput:
 *                 type: string
 *     responses:
 *       200:
 *         description: GPT 응답 반환
 */
router.post('/continue', continueIntervention);

/**
 * @swagger
 * /interventions/exit:
 *   post:
 *     summary: 개입 종료 + 로그 저장 + user traits 업데이트
 *     tags: [Interventions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *               diaryId:
 *                 type: string
 *               diaryDate:
 *                 type: string
 *               contents:
 *                 type: array
 *                 items:
 *                   type: string
 *               conversation:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     speaker:
 *                       type: string
 *                     message:
 *                       type: string
 *     responses:
 *       200:
 *         description: 종료 성공
 */
router.post('/exit', exitIntervention);



// router.put('/:diaryid', updateConversation);

module.exports = router;
