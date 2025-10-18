const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
    cb(null, `img_${Date.now()}_${Math.round(Math.random()*1e9)}${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;  
