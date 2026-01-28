const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'media-' + uniqueSuffix + ext);
    }
});

// Filter for Audio/Video only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only audio and video files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: fileFilter
});

// POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the static URL relative to server root
        // Assuming static files are served from /uploads route
        const fileUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

module.exports = router;
