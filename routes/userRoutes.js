const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/UserModel'); // User 모델 불러오기
const { encodeUserTraits } = require('../utils/gptClient');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 사용자 관련 API
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: 회원가입 (User 생성)
 *     tags: [Users]
 *     requestBody:
 *       description: 생성할 유저 정보
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *               - id
 *               - password
 *             properties:
 *               uid:
 *                 type: string
 *                 description: 고유 사용자 ID
 *               id:
 *                 type: string
 *                 description: 로그인용 아이디
 *               password:
 *                 type: string
 *                 description: 로그인 비밀번호
 *     responses:
 *       201:
 *         description: 유저 생성 성공
 *       400:
 *         description: 요청 오류
 */
// 1. Create - 회원가입
router.post('/', async (req, res) => {
  try {
    const { id, password, ...rest } = req.body;

    // 1. Id 중복 체크
    const existingUser = await User.findOne({ id });
    if (existingUser) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
    }

    // 2. 비밀번호 유효성 검증 (6자 이상)
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 해싱
    
    // 3. User 데이터 생성
    const user = new User({
      id: id, 
      password: hashedPassword, 
      ...rest });
    user.uid = user._id.toString();
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.log(err.message);
    res.status(400).json({ error: err.message });
  }
});


/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: 로그인
 *     tags: [Users]
 *     requestBody:
 *       description: 로그인 할 유저 정보
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - password
 *             properties:
 *               id:
 *                 type: string
 *                 description: 로그인용 아이디
 *               password:
 *                 type: string
 *                 description: 로그인 비밀번호
 *     responses:
 *       201:
 *         description: 유저 로그인 성공
 *       400:
 *         description: 요청 오류
 */
router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  // **진단 코드: 비밀번호 값 확인**
  console.log('Login request received. Email:', id);
  console.log('Password received:', password);
  
  try {
    // 1. 아이디로 유저 확인
    const user = await User.findOne({id});
    if (!user) {//console.log('User not found with id:', id);
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    const flag = await bcrypt.compare(password, user.password);

    // 2. 비밀번호 검증 (평문 비교)
    if (!flag) {
      console.log('Passwords do not match.');
      return res.status(401).json({ error: '비밀번호가 잘못되었습니다.' });
    }

    // 3. 로그인 성공 시 사용자 정보 반환 (비밀번호 제외)
    res.status(200).json({
      message: '로그인 성공',
      user: {
        id: user._id
      },
    });
  } catch (err) {
    console.error('로그인 오류:', err.message);
    res.status(500).json({ error: '서버 내부 오류' }); // 서버 오류 처리
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 모든 사용자 조회
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 전체 사용자 목록 반환
 */
// 2. Read (전체) - 모든 유저 조회
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



/**
 * @swagger
 * /users/{uid}:
 *   get:
 *     summary: 특정 사용자 조회
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 사용자 정보 반환
 *       404:
 *         description: 사용자 찾을 수 없음
 */
// 3. Read (개별) - 특정 유저 조회
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:getUserUID', async(req,res) => {
  try{
    const userUID = await User.findOne({uid: req.params.id})
    console.log(req.params.id + " User: " + userUID);
    if (!userUID) return res.status(404).json({ error: 'User not found' });
    res.json(userUID);
  } catch(err){
    res.status(500).json({error:err.message});
  }
});

/**
 * @swagger
 * /users/{uid}:
 *   put:
 *     summary: 특정 사용자 수정
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: uid
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
 *         description: 사용자 정보 수정 성공
 */
// 4. Update - 특정 유저 수정
router.put('/:uid', async (req, res) => {
  try {
    const { password, ...rest } = req.body;

    const updateData = { ...rest };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10); // 수정할 때도 비밀번호 해싱
    }

    const user = await User.findOneAndUpdate({ uid: req.params.uid }, updateData, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{uid}:
 *   delete:
 *     summary: 특정 사용자 삭제
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 사용자 삭제 성공
 */
// 5. Delete - 특정 유저 삭제
router.delete('/:uid', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

 /**
 * @swagger
 * /users/{uid}/traits:
 *   get:
 *     summary: 사용자 성격 traits만 조회
 *     description: 특정 사용자의 성격 분석 결과(traits)만 반환합니다.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자의 UID
 *     responses:
 *       200:
 *         description: 사용자 traits 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 honestyHumility:
 *                   type: number
 *                   example: 0.52
 *                 emotionalStability:
 *                   type: number
 *                   example: 0.31
 *                 extraversion:
 *                   type: number
 *                   example: 0.45
 *                 conscientiousness:
 *                   type: number
 *                   example: 0.62
 *                 openness:
 *                   type: number
 *                   example: 0.48
 *                 riskPropensity:
 *                   type: number
 *                   example: 0.39
 *                 needForCognition:
 *                   type: number
 *                   example: 0.54
 *                 futureTimePerspective:
 *                   type: number
 *                   example: 0.6
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

router.get('/:uid/traits', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.traits);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @swagger
 * /users/{uid}/traits/summary:
 *   get:
 *     summary: 사용자의 성격 trait 요약 문장 생성
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 UID
 *     responses:
 *       200:
 *         description: 사용자의 trait 기반 요약 문장을 반환합니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                   example: "당신은 신중하면서도 새로운 시도에 열려 있는 성격입니다. 감정적으로 안정되어 있으며 책임감을 갖고 행동하려는 경향이 있습니다."
 *       404:
 *         description: 사용자를 찾을 수 없거나 trait 정보가 없음
 *       500:
 *         description: 서버 내부 오류
 */
router.get('/:uid/traits/summary', async (req, res) => {
  try {
    const uid = req.params.uid;
    const result = await getTraitSummary(uid);

    res.status(200).json(result); // result는 { summary: "...문장..." }
  } catch (err) {
    console.error("Trait summary router error:", err.message);
    res.status(500).json({ error: '서버 오류로 trait summary를 생성하지 못했습니다.' });
  }
});

router.get('/getTotalTraits', async (req, res) => {
  try{
    const traits = req.params.traits;
    console.log("req.param.traits: " + req.params.traits);
    if(!traits) return res.status(404).json({error:"Traints정보를 찾을 수 없습니다."});
    const result = encodeUserTraits(traits);
    if(!result) return res.status(300).json({error: "유저 traits정보 생성이 되지 못했습니다."});
    return res.status(200).json(result);
  }catch(e){
    console.log("userRoutes/getTotalTraits | Try-Catch error: "+e);
    return res.status(500).json({error: '서버 오류로 유저 성격 정보에 대한 한줄평을 생성하지 못했습니다.'});
  }
  
});
module.exports = router;
