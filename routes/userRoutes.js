const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/UserModel'); // User 모델 불러오기

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
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호 해싱
    const user = new User({ ...rest, password: hashedPassword });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

module.exports = router;
