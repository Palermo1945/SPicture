import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url'; 
import dotenv from 'dotenv'; // Import dotenv to manage environment variables
import FormData from 'form-data';

dotenv.config(); // Load environment variables

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Get __dirname using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// Set up storage for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route for uploading and processing DOCX files and generating video
app.post('/api/upload-and-generate', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';
    let extractedImages = [];

    if (fileExt !== '.docx') {
        return res.status(400).json({ error: 'Unsupported file format. Please upload a .docx file.' });
    }

    try {
        // Extract text from DOCX
        const docxText = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = docxText.value;

        // Extract images from DOCX
        const zip = await JSZip.loadAsync(req.file.buffer);
        const imagePromises = Object.keys(zip.files)
            .filter(filename => filename.startsWith('word/media/')) 
            .map(async (filename) => {
                const fileData = await zip.file(filename).async('base64'); 
                const base64Image = `data:image/png;base64,${fileData}`;
                const imageName = path.basename(filename);
                return { filename: imageName, data: base64Image };
            });
        extractedImages = await Promise.all(imagePromises);

        // Upload images to D-ID API and collect the resulting URLs
        const uploadedImageUrls = [];
        const apiKey = process.env.D_ID_API_KEY; // Get API key from .env
        for (const image of extractedImages) {
            try {
                const formData = new FormData();
                const imageBuffer = Buffer.from(image.data.split(',')[1], 'base64'); 
                formData.append('image', imageBuffer, image.filename);

                const options = {
                    method: 'POST',
                    url: 'https://api.d-id.com/images',
                    headers: {
                        accept: 'application/json',
                        'Content-Type': 'multipart/form-data',
                        'Authorization': apiKey, 
                        ...formData.getHeaders(),
                    },
                    data: formData,
                };

                const response = await axios.request(options);
                uploadedImageUrls.push(response.data.url); 
            } catch (uploadError) {
                console.error('Error uploading image to D-ID API:', uploadError.message);
            }
        }

        // Prepare payload for video generation
        const url = "https://api.d-id.com/talks";
        const payload = {
            script: {
                type: "text",
                input: extractedText,
                provider: {
                    type: "microsoft",
                    voice_id: "en-CA-LiamNeural"
                }
            },
            source_url: uploadedImageUrls[0], 
            config: { stitch: true }
        };
        const headers = {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: apiKey
        };

        const videoResponse = await axios.post(url, payload, { headers });
        const talkId = videoResponse.data.id;

        let statusData;
        const statusUrl = `https://api.d-id.com/talks/${talkId}`;
        while (true) {
            const statusResponse = await axios.get(statusUrl, { headers });
            statusData = statusResponse.data;
            if (statusData.status === 'done' && statusData.result_url) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        // Send the result URL to the frontend
        res.json({ result_url: statusData.result_url });
    } catch (error) {
        console.error('Error processing file or generating video:', error);
        return res.status(500).json({ error: 'Error processing file or generating video', details: error.message });
    }
});

// Catch-all route to serve the index.html file in dist
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// Bind server to the correct port (Heroku or local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${process.env.HOST || 'http://localhost'}:${PORT}`);
});