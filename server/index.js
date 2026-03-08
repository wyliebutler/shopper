const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 9001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Support SHOPPER_PASSWORD (new) and APP_PASSWORD (legacy/local)
const APP_PASSWORD = process.env.SHOPPER_PASSWORD || process.env.APP_PASSWORD || 'todo'; 

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket');
    });
});

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Routes

// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === APP_PASSWORD) {
        // Token is now permanent (no expiresIn)
        const token = jwt.sign({ user: 'family' }, JWT_SECRET);
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all stores
app.get('/api/stores', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM stores ORDER BY name ASC');
        const stores = stmt.all();
        res.json(stores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new store
app.post('/api/stores', authenticateToken, (req, res) => {
    const { name, color } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO stores (name, color) VALUES (?, ?)');
        const info = stmt.run(name, color || '#ffffff');
        const newStore = db.prepare('SELECT * FROM stores WHERE id = ?').get(info.lastInsertRowid);
        io.emit('store_added', newStore);
        res.json(newStore);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a store
app.put('/api/stores/:id', authenticateToken, (req, res) => {
    const { name, color } = req.body;
    const { id } = req.params;
    try {
        const stmt = db.prepare('UPDATE stores SET name = ?, color = ? WHERE id = ?');
        stmt.run(name, color, id);
        io.emit('store_updated', { id: parseInt(id), name, color });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a store
app.delete('/api/stores/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
        const stmt = db.prepare('DELETE FROM stores WHERE id = ?');
        stmt.run(id);
        io.emit('store_deleted', parseInt(id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all items
app.get('/api/items', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM items ORDER BY created_at DESC');
        const items = stmt.all();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new item
app.post('/api/items', authenticateToken, (req, res) => {
    const { text, store_id } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO items (text, store_id) VALUES (?, ?)');
        const info = stmt.run(text, store_id || null);
        const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
        io.emit('item_added', newItem);
        res.json(newItem);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get app configuration (e.g., if AI is enabled)
app.get('/api/config', authenticateToken, (req, res) => {
    res.json({
        aiEnabled: !!process.env.GEMINI_API_KEY
    });
});

// Upload image and identify item
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    const placeholderText = 'Identifying...';

    try {
        const stmt = db.prepare('INSERT INTO items (text, image_path) VALUES (?, ?)');
        const info = stmt.run(placeholderText, imagePath);
        const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
        
        // Return immediately
        res.json(newItem);
        io.emit('item_added', newItem);

        // Process AI in background
        if (process.env.GEMINI_API_KEY) {
            (async () => {
                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                    const imageData = fs.readFileSync(req.file.path);
                    const imageBase64 = imageData.toString('base64');
                    const prompt = "Identify the main object in this image. Return ONLY the name of the object, nothing else. Keep it short (e.g., 'Apple', 'Milk Carton').";

                    const result = await model.generateContent([
                        prompt,
                        { inlineData: { data: imageBase64, mimeType: req.file.mimetype } }
                    ]);
                    const response = await result.response;
                    const identifiedText = response.text()?.trim() || 'New Item';

                    // Update DB with results
                    db.prepare('UPDATE items SET text = ? WHERE id = ?').run(identifiedText, newItem.id);
                    
                    // Notify clients
                    io.emit('item_updated', { id: newItem.id, text: identifiedText });
                } catch (error) {
                    console.error("Background Gemini API Error:", error);
                    // Update to a generic fallback if AI fails
                    const fallbackText = 'New Item (AI failed)';
                    db.prepare('UPDATE items SET text = ? WHERE id = ?').run(fallbackText, newItem.id);
                    io.emit('item_updated', { id: newItem.id, text: fallbackText });
                }
            })();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update item (completed status or text or store_id)
app.put('/api/items/:id', authenticateToken, (req, res) => {
    const { completed, text, store_id } = req.body;
    const { id } = req.params;
    
    try {
        const updates = [];
        const params = [];
        
        if (text !== undefined) {
            updates.push('text = ?');
            params.push(text);
        }
        if (completed !== undefined) {
            updates.push('completed = ?');
            params.push(completed ? 1 : 0);
        }
        if (store_id !== undefined) {
            updates.push('store_id = ?');
            params.push(store_id);
        }
        
        if (updates.length > 0) {
            params.push(id);
            const sql = `UPDATE items SET ${updates.join(', ')} WHERE id = ?`;
            db.prepare(sql).run(...params);
            
            // Re-fetch to get complete updated state for websocket
            const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
            io.emit('item_updated', updatedItem);
            res.json({ success: true, item: updatedItem });
        } else {
            res.json({ success: true, message: 'No changes provided' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all completed items
app.delete('/api/items/completed', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM items WHERE completed = 1');
        const info = stmt.run();
        io.emit('items_cleared');
        res.json({ success: true, changes: info.changes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete item
app.delete('/api/items/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
        const stmt = db.prepare('DELETE FROM items WHERE id = ?');
        stmt.run(id);
        io.emit('item_deleted', parseInt(id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Catch-all handler for any request that doesn't match one above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    try {
        const genAIVersion = require('@google/generative-ai/package.json').version;
        console.log(`Google Generative AI SDK Version: ${genAIVersion}`);
    } catch (e) {
        console.log('Could not determine Google Generative AI SDK version');
    }
});
