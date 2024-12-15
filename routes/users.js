const express = require('express');
const router = express.Router();
const User = require('../models/user'); // User 모델 불러오기
const bcrypt = require('bcrypt');

// 모든 사용자 정보 가져오기 (비밀번호 제외)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // 비밀번호 필드를 제외한 사용자 정보 조회
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message }); // 서버 오류 시 500 상태 코드 반환
  }
});

// 새로운 사용자 생성 (회원가입)
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // **진단 코드: 비밀번호 값 확인**
  console.log('Received email:', email);
  console.log('Received password:', password);

  // 1. 이메일 유효성 검증
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: '잘못된 이메일 형식입니다.' });
  }

  // 2. 비밀번호 유효성 검증 (6자 이상)
  if (!password || password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });
  }

  try {
    // 3. 중복된 이메일 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
    }

    // 4. 새 사용자 저장 (비밀번호 암호화 제거)
    console.log('Saving user without hashing password...');
    const newUser = new User({ email, password }); // 평문 비밀번호 저장
    const savedUser = await newUser.save();

    console.log('Saved user:', savedUser);

    res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: savedUser._id });
  } catch (err) {
    console.error('회원가입 오류:', err.message);
    res.status(500).json({ error: '서버 내부 오류' }); // 서버 오류 처리
  }
});

// 사용자 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // **진단 코드: 비밀번호 값 확인**
  console.log('Login request received. Email:', email);
  console.log('Password received:', password);
  
  try {
    // 1. 이메일로 사용자 확인
    const user = await User.findOne({ email });

    const flag = await bcrypt.compare(password, user.password);

    if (!user) {
      console.log('User not found with email:', email);
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    console.log('User found:', user);

    // 2. 비밀번호 검증 (평문 비교)
    if (!flag) {
      console.log('Passwords do not match.');
      return res.status(401).json({ error: '비밀번호가 잘못되었습니다.' });
    }

    // 3. 로그인 성공 시 사용자 정보 반환 (비밀번호 제외)
    res.status(200).json({
      message: '로그인 성공',
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('로그인 오류:', err.message);
    res.status(500).json({ error: '서버 내부 오류' }); // 서버 오류 처리
  }
});

module.exports = router;
