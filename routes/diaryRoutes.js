const express = require('express');
const router = express.Router();
const Diary = require('../models/diaryModel');
const User = require('../models/UserModel');
const InterventionLog = require('../models/InterventionLog');
const {detectTrigger, getEmotionIntensity, sendToGPT, updateUserTraits} = require('../utils/gptClient');
/**
 * @swagger
 * tags:
 *   name: Diaries
 *   description: 일기 데이터 저장, 수정, 삭제 등 관련 api
 */

/**
 * @swagger
 * /diaries:
 *   post:
 *     summary: (수정필요)일기 저장 요청 시 → 저장 + trigger check + 개입 시작까지 처리
 *     tags: [Diaries]
 *     requestBody:
 *       description: 일기를 저장하면 gpt가 trigger check까지 하는 코드.
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
 *                 example: "2025-04-12"
 *               contents:
 *                 type: array
 *                 items:
 *                   type: string 
 *     responses:
 *       202:
 *         description: 일기 생성 완료. gpt 개입 실행됨.
 *       203:
 *         description: 일기 생성 완료. gpt 개입은 안됨
 *       404:
 *         description: uid로 유저 정보를 찾을 수 없음.
 *       500:
 *         description: 서버 로직 오류
 */
router.post('/', async (req, res) => {
  const { uid, diaryId, diaryDate, content } = req.body; // content는 하나의 문자열 (Flutter에서 전달)

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found: '});

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
      console.log(user.id+'${user.id} : Diary saved & intervention started');
      return res.status(202).json({ message: 'Diary saved & intervention started', gptReply: firstIntervention });
    } else {
      console.log(user.id+'${user.id} Diary save without intervention');
      return res.status(203).json({ message: 'Diary saved without intervention' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 유저가 원하는 날짜를 입력 받아서 가장 최신의 일기 데이터를 반환
/**
 * @swagger
 * /diaries/lastest-content?$uid={uid}&&$diaryDate={diaryDate}:
 *  get:
 *    summary: 유저가 원하는 날짜를 입력하면 해당하는 가장 최신 일기 데이터 반환
 *    tags: [Diaries]
 *    requestBody:
 *       description: 유저가 원하는 날짜를 입력하면 해당하는 가장 최신 일기 데이터 반환
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - diaryDate
 *             properties:
 *               uid:
 *                 type: string
 *               diaryDate:
 *                 type: string
 *                 example: "yyyy-mm-dd"
 *    responses:
 *       201:
 *         description: {content: "내용"} 형식으로 결과 반환
 *       400: 
 *         description: uid, diaryDate 값 or 변수 이름 에러
 *       500:
 *         description: 서버 이슈 
 */
router.get('/latest-content', async (req, res) => {
  try {
    const { uid, diaryDate } = req.query; // GET 방식의 쿼리 파라미터로 가정
    console.log("lastest-content()|" + uid +", "+ diaryDate);
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
      console.log(uid + ": " +diaryDate + ", ");
      return res.json({ contents: ""});
    }

    // contents 반환 (배열)
    console.log(uid + ": " +diaryDate + ", " + latestDiary.contents);
    return res.status(201).json({ contents: latestDiary.contents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 유저의 전체 다이어리 데이터 반환하는 api
/**
 * @swagger
 * /diaries/AlldiaryId?$uid={uid}:
 *   get:
 *     summary: (코드수정예정)유저의 최신 일기를 반환 
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *           description: "유저 uid"
 *     responses:
 *       200:
 *         description: {날짜: 내용} 형식으로 유저가 가진 일기의 최신 데이터를 반환
 */
router.get('/AlldiaryId', async(req, res) =>{
  try{
    const user = await User.findOne({uid: req.query.uid});
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
      result.append(diary.contents);
    }
    console.log(result);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /diaries/AlldiaryDates?$uid={uid}:
 *   get:
 *     summary: 유저가 갖고있는 일기 데이터의 날짜를 반환
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *           description: "유저 uid"
 *     responses:
 *       200:
 *         description: 갖고있는 일기 날짜 리스트 형태 반환
 *       201:
 *         description: 유저가 작성한 일기가 없음
 *       404:
 *         description: 유저를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/AlldiaryDates', async(req,res) =>{
  try{
    const user = await User.findOne({uid: req.query.uid});
    if (!user) return res.status(404).json({ error: 'user uid not found' });
    
    // uid로 직접 조회 (user 객체가 아닌 uid 문자열 사용)
    const diaries = await Diary.find({ uid: req.query.uid });
    if (diaries.length === 0) { // 일기가 없는 경우 처리
      console.log('해당 유저의 일기가 없습니다:', req.query.uid);
      return res.status(201).json({
        success: true,
        uid: req.query.uid,
        dates: [],
        count: 0,
        message: '작성된 일기가 없습니다.'
      });
    }

    // diaryDate만 추출하여 배열로 반환
    const diaryDates = diaries.map(diary => diary.diaryDate);
    
    // 중복 제거 (같은 날짜에 여러 일기가 있을 수 있으므로)
    const uniqueDates = [...new Set(diaryDates)];
    
    // 날짜 순으로 정렬
    uniqueDates.sort();

    console.log('조회된 일기 날짜들:', uniqueDates);
    return res.status(200).json({
      success: true,
      uid: req.query.uid,
      dates: uniqueDates,
      count: uniqueDates.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// 특정 다이어리 데이터 반환하기
/**
 * @swagger
 * /diaries/{diaryId}:
 *   get:
 *     summary: diaryId로 데이터 반환
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: diaryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 일기 조회 성공 --> 일기 텍스트 반환
 *       500:
 *         description: 일기 조회 실패
 */
router.get('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOne({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });
    res.status(200).json(diary);
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
 *         description: {message: 성공 로그, lastestContent: 일기 수정 내용}
 *       400:
 *         description: 일기 내용 변화 없음
 *       500:
 *         description: 서버 에러 메세지
 */
// 일기 수정하는 내용
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

    res.status(200).json({
      message: 'Diary updated successfully',
      lastestContent: newContent,
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
 *       404:
 *         description: 다이어리 찾을 수 없음
 *       500:
 *         description: 서버 에러 메세지
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
