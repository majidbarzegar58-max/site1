const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// دیتابیس موقت در حافظه
const users = [];

// مسیر ثبت‌نام
app.post('/register', (req, res) => {
  const { email, password, username } = req.body;
  
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "این ایمیل قبلاً ثبت شده است." });
  }

  users.push({ email, password, username });
  res.json({ message: "ثبت‌نام موفقیت‌آمیز بود!" });
});

// مسیر ورود
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ message: "ایمیل یا رمز عبور اشتباه است." });
  }

  res.json({ message: "ورود موفقیت‌آمیز!", username: user.username });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));