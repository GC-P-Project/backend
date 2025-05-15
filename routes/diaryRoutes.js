const express = require('express');
const router = express.Router();
const Diary = require('../models/diaryModel');
const User = require('../models/UserModel');
const InterventionLog = require('../models/InterventionLog');
const {detectTrigger} = require('../utils/gptClient');
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
// 
router.post('/', async (req, res) => {
  const { uid, diaryId, diaryDate, content } = req.body; // content는 하나의 문자열 (Flutter에서 전달)

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found: '+ user });

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
    
    console.log(user.id + "Diary save");

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
      console.log(user.id + 'Diary saved & intervention started');
      return res.status(200).json({ message: 'Diary saved & intervention started', gptReply: firstIntervention });
    } else {
      console.log(user.id + 'Diary save without intervention');
      return res.status(200).json({ message: 'Diary saved without intervention' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/latest-content', async (req, res) => {
  try {
    const { uid, diaryDate } = req.query; // GET 방식의 쿼리 파라미터로 가정

    if (!uid || !diaryDate) {
      return res.status(400).json({ error: 'uid와 diaryDate를 모두 입력해야 합니다.' });
    }

    // 해당 조건으로 최신 일기 하나만 조회 (createdAt 내림차순)
    const latestDiary = await Diary.findOne(
      { uid: uid, diaryDate: diaryDate },
      { contents: 1, _id: 0 }
    ).sort({ createdAt: -1 });

    if (!latestDiary) {
      // 해당 일기가 없는 경우
      return res.json({ contents: ""});
    }

    // contents 반환 (배열)
    console.log(uid + ": " +diaryDate + ", " + latestDiary.contents);
    return res.json({ contents: latestDiary.contents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 유저의 전체 다이어리 데이터 반환하는 api
router.get('/:AlldiaryId', async(req, res) =>{
  try{
    const user = await User.findOne({uid: req.params.uid});
    if (!user) return res.status(404).json({ error: 'user uid not found' });
    
    const diaries = await Diary.find({ uid: user });

    // 2. diaryDate별로 최신 것만 남기는 로직
    const diaryMap = {};
    for (const diary of diaries) {
      const date = diary.diaryDate;
      if (
        !diaryMap[date] || 
        new Date(diary.createdAt) > new Date(diaryMap[date].createdAt)
      ) {
        // 이 날짜에 더 최신 다이어리라면 갱신
        diaryMap[date] = diary;
      }
    }

    // 3. diaryDate: contents만 추출해서 리턴
    const result = {};
    for (const [date, diary] of Object.entries(diaryMap)) {
      result[date] = diary.contents;
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
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
// 특정 다이어리 
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
