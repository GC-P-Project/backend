const express = require('express');
const router = express.Router();
const Diary = require('../models/diaryModel');
const User = require('../models/UserModel');

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
 *               - diaryDate
 *               - contents
 *             properties:
 *               uid:
 *                 type: string
 *               diaryId:
 *                 type: string
 *               diaryDate:
 *                 type: string
 *                 example: "4월 27일의 일기"
 *               contents:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 일기 생성 성공
 */
//  Flutter에서 일기 저장 요청 시 → 저장 + trigger check + 개입 시작까지 처리
router.post('/', async (req, res) => {
  const { uid, diaryId, diaryDate, content } = req.body; // content는 하나의 문자열 (Flutter에서 전달)

  try {
    const user = await User.findOne({ uid });
    console.log(uid+ ': '+ user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 일기 contents 배열로 변환 (줄바꿈 기준)
    const contents = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // 일기 저장
    const diary = new Diary({
      uid,
      diaryId,
      diaryDate,
      contents
    });
    await diary.save();

    //  트리거 + 감정 강도 검사
    let interventionStarted = false;
    let firstIntervention = null;

    for (const line of contents) {
      const trigger = detectTrigger(line);
      if (trigger) {
        const score = await getEmotionIntensity(line, user.traits);
        if (score >= user.interventionSensitivity) {
          //  개입 세션 시작
          const messages = [
            { role: 'system', content: initialSystemPrompt },
            { role: 'user', content: line }
          ];
          const gptReply = await sendToGPT(messages);

          const intervention = await InterventionLog.create({
            uid,
            diaryId,
            diaryDate,
            revisionNumber: 1,
            conversation: [
              { speaker: 'user', message: line },
              { speaker: 'gpt', message: gptReply }
            ],
            trigger,
            triggeredText: line
          });

          //  traits 업데이트
          await updateUserTraits(uid, contents, intervention.conversation);
          interventionStarted = true;
          firstIntervention = gptReply;
          break; // 첫 개입만
        }
      }
    }

    if (interventionStarted) {
      return res.status(200).json({ message: 'Diary saved & intervention started', gptReply: firstIntervention });
    } else {
      return res.status(200).json({ message: 'Diary saved without intervention' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
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
router.put('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOne({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });

    const { newContent } = req.body;
    if (!newContent) {
      return res.status(400).json({ error: 'newContent is required' });
    }

    diary.contents.push(newContent);
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
