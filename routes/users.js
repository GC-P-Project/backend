const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // 비밀번호 필드는 제외
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user with validation and duplication check
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // 1. 이메일 유효성 검증
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // 2. 비밀번호 유효성 검증 (예: 최소 6자 이상)
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // 3. 중복된 이메일 방지
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    // 4. 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. 새 User 생성
    const newUser = new User({ email, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json({ message: 'User created successfully', userId: savedUser._id });

  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;