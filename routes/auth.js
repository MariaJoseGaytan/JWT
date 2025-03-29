const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// POST /api/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(400).json({ error: 'Error al registrar usuario', details: err.message });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // se define el tiempo de expiración del token
  );

  res.json({ token });
});

// GET /api/protected
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Acceso permitido', usuario: req.user });
});

module.exports = router;
