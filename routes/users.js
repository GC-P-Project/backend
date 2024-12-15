const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user with validation and duplication check
router.post('/', async (req, res) => {
  const { name, email, age } = req.body;

  // 1. 이메일 유효성 검증
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // 2. 나이 유효성 검증 (예: 양수여야 함)
  if (age <= 0 || !Number.isInteger(age)) {
    return res.status(400).json({ error: 'Age must be a positive integer.' });
  }

  // 3. 중복된 이메일 방지
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    // 4. 새 User 생성
    const newUser = new User({ name, email, age });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);

  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;