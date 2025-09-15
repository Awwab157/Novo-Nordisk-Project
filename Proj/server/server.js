const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
// FIX: Expose the Content-Disposition header so the frontend can read the filename.
app.use(cors({
    exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// --- File Storage Setup with Multer ---
const uploadsDir = path.join(__dirname, 'uploads');
const generatedDir = path.join(__dirname, 'generated');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// --- API Route ---
app.post('/api/generate', upload.single('template'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const content = fs.readFileSync(req.file.path, 'binary');
        
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const data = JSON.parse(req.body.data);

        // Pass data directly to the render() method.
        doc.render(data);

        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        const outputFormat = req.body.outputFormat || 'docx';
        const outputFileName = `${path.basename(req.file.originalname, path.extname(req.file.originalname))}-generated.${outputFormat}`;
        const generatedPath = path.join(generatedDir, outputFileName);
        
        let fileToSend;
        let mimeType;

        if (outputFormat === 'pdf') {
            console.log('Converting to PDF...');
            
            // Using a manual Promise wrapper for libreoffice-convert.
            const pdfBuf = await new Promise((resolve, reject) => {
                libre.convert(buf, '.pdf', undefined, (err, done) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(done);
                });
            });

            fs.writeFileSync(generatedPath, pdfBuf);
            fileToSend = pdfBuf;
            mimeType = 'application/pdf';
            console.log('PDF conversion successful.');

        } else {
            fs.writeFileSync(generatedPath, buf);
            fileToSend = buf;
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        
        res.setHeader('Content-Disposition', `attachment; filename=${outputFileName}`);
        res.setHeader('Content-Type', mimeType);
        res.send(fileToSend);

    } catch (error) {
        console.error('Error generating document:', error);
        if (error.properties && error.properties.errors) {
            const templateErrors = error.properties.errors.map(err => err.properties.explanation).join('\n');
            return res.status(500).send(`Template Error: \n${templateErrors}`);
        }
        res.status(500).send('An internal server error occurred.');
    } finally {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

