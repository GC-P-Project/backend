const express = require('express');
const router = express.Router();
const Diary = require('../models/diaryModel');
const User = require('../models/UserModel');
const InterventionLog = require('../models/InterventionLog');
const {detectTrigger, getEmotionIntensity, sendToGPT, updateUserTraits, emotionAnalysis} = require('../utils/gptClient');
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
 *       description: | 
 *         일기를 저장하면 gpt가 trigger check까지 하는 코드.
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
 *       200:
 *         description: 일기 생성 완료. gpt 개입 실행됨.
 *       201:
 *         description: 일기 생성 완료. gpt 개입은 안됨
 *       404:
 *         description: uid로 유저 정보를 찾을 수 없음.
 *       500:
 *         description: 서버 로직 오류
 */
router.post('/', async (req, res) => {
  const { uid, diaryId, diaryDate, content } = req.body;

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contents = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log("uid:", uid);
    console.log("diaryID:", diaryId);
    console.log("diaryDate:", diaryDate);
    console.log("contents:", contents);

    let emotions;
    
    try {
      const responseContent = await emotionAnalysis(user.traits, contents);

      if (!responseContent) return res.status(404).json({ error: "Fail get emotion to context" });
      console.log("ResponseContent: " + responseContent);

      // JSON 문자열만 추출
      const jsonMatch = responseContent.match(/{[\s\S]*}/);
      if (!jsonMatch) return res.status(400).json({ error: "Invalid JSON format from GPT" });
      console.log("JsonMatch 결과: "+jsonMatch);
      emotions = JSON.parse(jsonMatch[0]);
      console.log("감정 저장 분석 결과:", emotions);
      console.log("emotion 필드 존재:", 'emotion' in Diary.schema.paths);

      if (Diary.schema.paths.emotion) {
        console.log("✅ emotion 필드가 스키마에 있습니다");
      } else {
        console.log("❌ emotion 필드가 스키마에 없습니다!");
      }
      const diary = new Diary({
        uid,
        diaryId,
        diaryDate,
        contents,
        emotion: emotions}
      );
      await diary.save();
      
    } catch (e) {
      console.error("Emotion analysis error:", e);
      return res.status(501).json({ error: "Fail analysis emotion" });
    }
    console.log("이모션스: "+ emotions);
    console.log("이모션스 타입: " + typeof(emotions));
    console.log("이모션스 stringfy: " + JSON.stringify(emotions));
    console.log("emotions:", emotions); // 객체 그대로
    console.log("emotions stringified:", JSON.stringify(emotions)); // 문자열
    Object.entries(emotions).forEach(([key, value]) => {
      console.log(`${key}: ${value}, 타입: ${typeof value}`);
    });
    
    
    let interventionStarted = false;
    let firstIntervention = null;

    for (const line of contents) {
      const trigger = detectTrigger(line);
      if (trigger) {
        const score = await getEmotionIntensity(line, user.traits);
        if (score >= user.interventionSensitivity) {
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

          await updateUserTraits(uid, contents, intervention.conversation);
          interventionStarted = true;
          firstIntervention = gptReply;
          break;
        }
      }
    }

    if (interventionStarted) {
      console.log(`${user.id}: Diary saved & intervention started`);
      return res.status(200).json({
        message: 'Diary saved & intervention started',
        gptReply: firstIntervention
      });
    } else {
      await updateUserTraits(uid, contents); // 개입 없이 trait 업데이트
      console.log(`${user.id}: Diary saved & intervention not started`);
      return res.status(201).json({
        message: 'Diary saved & intervention not started'
      });
    }

  } catch (err) {
    console.error("Diary save error:", err);
    res.status(500).json({ error: err.message });
  }
});


/** 특정 유저의 특정 날짜에 작성된 가장 최신 일기 내용 조회 
 * @swagger
 * /diaries/latest-content:
 *   get:
 *     summary: 특정 유저의 특정 날짜에 작성된 가장 최신 일기 내용 조회
 *     description: |
 *       유저 UID와 날짜를 입력받아 해당 날짜에 작성된 일기 중 가장 최근에 생성된(createdAt 기준) 일기의 내용을 반환합니다.\
 *       같은 날짜에 여러 개의 일기가 있을 경우, createdAt이 가장 늦은 일기를 반환합니다.
 *       
 *       **Flutter/Dart 프론트엔드 호출 방법:**
 *       ```dart
 *       // 기본 호출 함수
 *       Future<Map<String, dynamic>> getLatestDiaryContent(String uid, String diaryDate) async {
 *         final response = await http.get(
 *           Uri.parse('$baseUrl/diaries/latest-content?uid=$uid&diaryDate=$diaryDate'),
 *         );
 *         
 *         return json.decode(response.body);
 *       }
 *       ```
 *     tags: [Diaries]
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           사용자의 고유 식별자 (유저 uid)
 *           - 로그인한 사용자의 UID를 전달
 *           - 빈 문자열이나 null 값은 허용되지 않음
 *       - in: query
 *         name: diaryDate
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: |
 *           조회할 일기의 날짜 (YYYY-MM-DD 형식)
 *           - 반드시 YYYY-MM-DD 형식으로 입력
 *           - 예: 2024-01-15, 2024-12-25
 *           - 존재하지 않는 날짜는 오류 발생 가능
 *     responses:
 *       200:
 *         description: |
 *           해당 날짜에 일기가 존재하지 않는 경우
 *           빈 문자열("")을 contents에 담아서 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contents:
 *                   type: string
 *                   description: 일기 내용 (해당 날짜에 일기가 없으면 빈 문자열)
 *             examples:
 *               no_diary:
 *                 summary: 해당 날짜에 일기가 없는 경우
 *                 value:
 *                   contents: ""
 *       201:
 *         description: |
 *           성공적으로 일기 내용을 찾아서 반환
 *           해당 날짜의 가장 최신 일기 내용을 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contents:
 *                   type: string
 *                   description: 해당 날짜의 가장 최신 일기 내용
 *             examples:
 *               success:
 *                 summary: 일기를 성공적으로 찾은 경우
 *                 value:
 *                   contents: ["오늘은 정말 좋은 하루였다."]
 *       400:
 *         description: |
 *           필수 파라미터 누락 또는 잘못된 형식
 *           - uid나 diaryDate가 없는 경우
 *           - 파라미터가 빈 문자열인 경우
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 *             examples:
 *               missing_params:
 *                 summary: 필수 파라미터 누락
 *                 value:
 *                   error: "uid와 diaryDate를 모두 입력해야 합니다."
 *       500:
 *         description: |
 *           서버 내부 오류
 *           - 데이터베이스 연결 오류
 *           - 예상치 못한 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: 오류 메시지
 *             examples:
 *               server_error:
 *                 summary: 서버 내부 오류
 *                 value:
 *                   error: "Internal server error"
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
      return res.status(200).json({ contents: ""});
    }

    // contents 반환 (배열)
    console.log(uid + ": " +diaryDate + ", " + latestDiary.contents);
    return res.status(201).json({ contents: latestDiary.contents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** (코드수정예정)유저의 최신 일기를 전부 반환 
 * @swagger
 * /diaries/AlldiaryId?$uid={uid}:
 *   get:
 *     summary: (코드수정예정)유저의 최신 일기를 전부 반환
 *     description: |
 *        유저 uid를 받아서 해당 유저가 가진 전체 최신 일기 날짜와 일기 내용을 찾아서 "날짜":"내용" 형식으로 반환합니다.\
 *        예시: {"2025-01-01": "오늘은 ~", "2025-01-02": "즐거운 하루"} 
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
 *         description: "{날짜: 내용} 형식으로 유저가 가진 일기의 최신 데이터를 반환"
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

/** 유저가 갖고있는 일기 데이터의 전체 날짜를 반환 
 * @swagger
 * /diaries/AlldiaryDates:
 *   get:
 *     summary: 유저가 갖고있는 일기 데이터의 전체 날짜를 반환
 *     description: |
 *        유저의 uid를 사용하여 유저가 가진 일기 데이터의 전체 날짜를 리스트 형태로 반환합니다.\
 *        예시: ["2025-05-01", "2025-05-02", ...]
 *     
 *        ** 코드 호출 예시 **
 *        ```dart
 *        final response = await http.get(
 *           Uri.parse('$baseUrl/diaries/AlldiaryDates?uid=$uid'),
 *        );
 *        ```
 * 
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
 *         description: 유저가 작성한 일기가 없는 경우 빈 배열 반환
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
        diaryDate: [],
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
      diaryDate: uniqueDates,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** 특정 날짜의 유저 최신 일기 정보를 반환 
 * @swagger
 * /diaries/diaryContent:
 *   get:
 *     summary: 특정 날짜의 유저 최신 일기 정보를 반환
 *     description: |
 *       유저 UID와 일기 날짜를 이용해 해당 날짜에 작성된 일기 중 가장 최신(createdAt 기준) 일기를 반환합니다.
 *       
 *       Flutter/Dart 호출 예시:
 *       ```dart
 *       final response = await http.get(
 *         Uri.parse('$baseUrl/diaries/diaryContent?uid=$uid&diaryDate=$diaryDate')
 *       );
 *       ```
 *     tags:
 *       - Diaries
 *     parameters:
 *       - name: uid
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 uid
 *         example: "user123"
 *       - name: diaryDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 선택한 일기의 날짜 (yyyy-mm-dd 형식 유지)
 *         example: "2025-05-21"
 *     responses:
 *       200:
 *         description: 일기 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: MongoDB ObjectId
 *                 uid:
 *                   type: string
 *                   description: 사용자 고유 식별자
 *                 diaryDate:
 *                   type: string
 *                   format: date
 *                   description: 일기 날짜
 *                 contents:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 일기 내용 배열
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: 일기 생성 날짜 및 시간
 *                 emotion:
 *                   type: string
 *                   description: 일기 감정 분석 결과
 *             example:
 *               _id: "60f7b1b3b3f3f3f3f3f3f3f3"
 *               uid: "user123"
 *               diaryDate: "2025-05-21"
 *               contents: ["오늘은 좋은 하루였다.", "친구들과 즐거운 시간을 보냈다."]
 *               createdAt: "2025-05-21T15:30:45.123Z"
 *               emotion: {"emotions": {'fear':0.05, 'surprise':0.1, 'anger':0.1, 'sadness':0.15, 'disgust':0.05, 'neutral':0.2, 'happiness':0.3}}
 *       400:
 *         description: 잘못된 요청 - uid 또는 diaryDate 누락
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "uid and diaryDate are required"
 *       404:
 *         description: 일기를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Diary not found"
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Internal server error message"
 */
router.get('/diaryContent', async (req, res) => {
  try {
    const { uid, diaryDate } = req.query;
    
    if (!uid || !diaryDate) {
      return res.status(400).json({ error: 'uid and diaryDate are required' });
    }
    
    const diary = await Diary.findOne({ 
      uid: uid, 
      diaryDate: diaryDate 
    })
    .sort({ createdAt: -1 }); // createdAt 기준 내림차순 정렬 (가장 최신이 먼저)
    
    if (!diary) return res.status(404).json({ error: 'Diary not found' });
    res.status(200).json(diary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** 일기 수정 (새로운 내용 추가) 
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
router.put('/:diaryId', async (req, res) => {
  try {
    const diary = await Diary.findOne({ diaryId: req.params.diaryId });
    if (!diary) return res.status(404).json({ error: 'Diary not found' });

    const { newContent } = req.body;
    if (!newContent) {
      return res.status(400).json({ error: 'newContent is required' });
    }

    diary.contents = newContent;

    let emotions;
    try {
      const user = await User.findOne({ uid: diary.uid });
      if (!user) return res.status(404).json({ error: "유저 정보 찾기 불가" });

      const responseContent = await emotionAnalysis(user.traits, newContent);
      if (!responseContent) return res.status(404).json({ error: "Fail get emotion to context" });
      emotions = JSON.parse(responseContent);
      console.log("EMOTION 분석 결과: " + JSON.stringify(emotions));
      //  개입 없이 trait 업데이트 추가
      // newContent가 string이므로 줄바꿈 기준 배열로 변환
      const contents = newContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      await updateUserTraits(user.uid, contents);

    } catch (e) {
      console.log("Try-Catch 오류 : " + e);
      return res.status(501).json({ error: "Fail analysis emotion" });
    }
    console.log("diaryRoutes: emotion은 다음과 같습니다 \n" +emotions);
    diary.emotion = emotions;
    await diary.save();
    console.log("diaryRoutes: 다이어리 수정이 완료되었습니다.");
    res.status(200).json({
      message: 'Diary updated successfully',
      lastestContent: newContent,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** 특정 일기 삭제
 * @swagger
 * /diaries/deleteDiary:
 *   delete:
 *     summary: 특정 일기 삭제
 *     description: |
 *       ```dart
 *       Uri.parse('$baseUrl/diaries/deleteDiary?uid=$uid&diaryDate=$diaryDate')
 *       ```
 *     tags: [Diaries]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: diaryDate
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
router.delete('/deleteDiary', async (req, res) => {
  try {
    const result = await Diary.deleteMany({ 
      uid : req.query.uid,
      diaryDate : req.query.diaryDate
    });
    const invetionResult = await InterventionLog.deleteMany({
      uid : req.query.uid,
      diaryDate : req.query.diaryDate
    });
    if (invetionResult.deletedCount > 0 || result.deletedCount > 0){
      res.status(200).json({message: 'Diary Deleted'});
    }
    else{
      res.status(404).json({message: "Diary not exist!"});
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;