import * as fs from 'fs';
import * as path from 'path';
import * as amqp from 'amqplib';
import express from 'express';
import fileUpload from 'express-fileupload';
import { WebSocketServer } from 'ws';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

// Initialize database
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, 'db.json');

// Ensure db.json exists with default structure
if (!fs.existsSync(dbFile)) {
  console.log('db.json not found, creating with default structure...');
  fs.writeFileSync(dbFile, JSON.stringify({ jobs: [] }, null, 2));
}

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { jobs: [] });
await db.read();

// Ensure db.data.jobs exists
if (!db.data || !db.data.jobs) {
  db.data = { jobs: [] };
  await db.write();
}

const RABBIT_MQ_URL = 'amqp://user:pass@localhost:5672/';
const SHARED_DIR = '/opt/authenta/data/';

console.log('Starting application with:');
console.log('  RABBIT_MQ_URL:', RABBIT_MQ_URL);
console.log('  SHARED_DIR:', SHARED_DIR);
console.log('  PORT:', process.env.PORT || 3000);

if (!fs.existsSync(SHARED_DIR)) {
  fs.mkdirSync(SHARED_DIR, { recursive: true });
}

// Express app setup
const app = express();
const port = process.env.PORT || 3000;

// Helper function to get next result folder number
function getNextResultFolderNumber() {
  if (!fs.existsSync(SHARED_DIR)) {
    return 1;
  }

  const folders = fs
    .readdirSync(SHARED_DIR)
    .filter((f) => f.startsWith('authenta_') && fs.lstatSync(path.join(SHARED_DIR, f)).isDirectory())
    .map((f) => parseInt(f.split('_')[1]))
    .filter((n) => !isNaN(n));

  return folders.length > 0 ? Math.max(...folders) + 1 : 1;
}

// Helper function to create result folder
function createResultFolder() {
  const folderNumber = getNextResultFolderNumber();
  const folderName = `authenta_${String(folderNumber).padStart(4, '0')}`;
  const folderPath = path.join(SHARED_DIR, folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return { folderName, folderPath };
}

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(fileUpload());

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

async function setupRabbitMQ() {
  try {
    console.log('Attempting to connect to RabbitMQ...');
    console.log('RABBIT_MQ_URL:', RABBIT_MQ_URL);
    const conn = await amqp.connect(RABBIT_MQ_URL).catch((err) => {
      console.error('Connection error details:', {
        message: err.message,
        code: err.code,
        errno: err.errno,
      });
      throw err;
    });
    console.log('Connected to RabbitMQ, creating channel...');
    const ch = await conn.createChannel();

    await ch.assertQueue('task_queue', { durable: true });
    await ch.assertQueue('task_response', { durable: true });

    // Listen for task responses
    ch.consume('task_response', async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        const job = db.data.jobs.find((j) => j.id === content.id);

        if (job) {
          if (content.error || content.exception) {
            job.status = 'ERROR';
            job.error = content.error || content.exception;
          } else {
            job.status = 'COMPLETED';
            job.result = content;
          }
          await db.write();

          // Notify connected clients
          const update = { ...job };
          
          // Add heatmap info to the update
          if (job.resultFolder) {
            const heatmapsPath = path.join(SHARED_DIR, job.resultFolder, 'heatmaps');
            const heatmapsExist = fs.existsSync(heatmapsPath) && fs.readdirSync(heatmapsPath).length > 0;
            update.hasHeatmaps = job.outputType === 'result + heatmaps';
            update.heatmapsReady = heatmapsExist;
          }
          
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify(update));
            }
          });
        }
        ch.ack(msg);
      }
    });

    return ch;
  } catch (err) {
    console.error('Failed to connect to RabbitMQ:', err);
    throw err;
  }
}

app.get('/api/history', async (req, res) => {
  try {
    await db.read();
    // Return all jobs sorted by timestamp (newest first)
    const sortedJobs = [...db.data.jobs].sort((a, b) => b.timestamp - a.timestamp);

    // Add heatmap availability info
    const jobsWithHeatmaps = sortedJobs.map((job) => {
      const jobWithMeta = { ...job };
      if (job.resultFolder) {
        const heatmapsPath = path.join(SHARED_DIR, job.resultFolder, 'heatmaps');
        const heatmapsExist = fs.existsSync(heatmapsPath) && fs.readdirSync(heatmapsPath).length > 0;
        
        // Set hasHeatmaps to true if heatmaps were requested (regardless of existence)
        jobWithMeta.hasHeatmaps = job.outputType === 'result + heatmaps';
        // Add a flag to indicate if they actually exist
        jobWithMeta.heatmapsReady = heatmapsExist;
      }
      return jobWithMeta;
    });

    res.json(jobsWithHeatmaps);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history/clear', async (req, res) => {
  try {
    await db.read();
    
    // Optionally delete result folders from disk
    if (db.data.jobs && db.data.jobs.length > 0) {
      db.data.jobs.forEach(job => {
        if (job.resultFolder) {
          const folderPath = path.join(SHARED_DIR, job.resultFolder);
          if (fs.existsSync(folderPath)) {
            try {
              fs.rmSync(folderPath, { recursive: true, force: true });
              console.log(`Deleted folder: ${folderPath}`);
            } catch (err) {
              console.error(`Failed to delete folder ${folderPath}:`, err);
            }
          }
        }
      });
    }
    
    // Clear the jobs array
    db.data.jobs = [];
    await db.write();
    
    res.json({ success: true, message: 'History cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

app.delete('/api/history/:jobId', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Delete result folder from disk
    if (job.resultFolder) {
      const folderPath = path.join(SHARED_DIR, job.resultFolder);
      if (fs.existsSync(folderPath)) {
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
          console.log(`Deleted folder: ${folderPath}`);
        } catch (err) {
          console.error(`Failed to delete folder ${folderPath}:`, err);
          return res.status(500).json({ error: 'Failed to delete result folder' });
        }
      }
    }

    // Remove job from database
    db.data.jobs = db.data.jobs.filter((j) => j.id !== req.params.jobId);
    await db.write();

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.get('/api/heatmaps/:jobId', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.resultFolder) {
      return res.status(404).json({ error: 'No result folder found for this job' });
    }

    const heatmapsPath = path.join(SHARED_DIR, job.resultFolder, 'heatmaps');

    if (!fs.existsSync(heatmapsPath)) {
      return res.status(404).json({ error: 'No heatmaps found for this job' });
    }

    const heatmapFiles = fs
      .readdirSync(heatmapsPath)
      .filter((f) => !f.startsWith('.'))
      .map((filename) => ({
        filename,
        url: `/api/heatmaps/${req.params.jobId}/file/${filename}`,
      }));

    res.json({ heatmaps: heatmapFiles });
  } catch (error) {
    console.error('Error fetching heatmaps:', error);
    res.status(500).json({ error: 'Failed to fetch heatmaps' });
  }
});
app.get('/api/heatmaps/:jobId/file/:filename', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job || !job.resultFolder) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const filePath = path.join(
      SHARED_DIR,
      job.resultFolder,
      'heatmaps',
      req.params.filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(req.params.filename).toLowerCase();

    // --- VIDEO FILE HANDLING ---
    if (ext === '.mp4') {
      if (!range) {
        // Full file fallback
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
        });
        return fs.createReadStream(filePath).pipe(res);
      }

      // Proper range support
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send("Requested range not satisfiable");
        return;
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
      });

      return fileStream.pipe(res);
    }

    // --- IMAGE FILE HANDLING ---
    if (ext === ".png") res.type("png");
    else if (ext === ".jpg" || ext === ".jpeg") res.type("jpeg");
    else res.type("application/octet-stream");

    return res.sendFile(path.resolve(filePath));

  } catch (err) {
    console.error("Error serving heatmap:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to load heatmap file" });
    }
  }
});

// Download all heatmaps as ZIP
app.get('/api/heatmaps/:jobId/download-all', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job || !job.resultFolder) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const heatmapsPath = path.join(SHARED_DIR, job.resultFolder, 'heatmaps');

    if (!fs.existsSync(heatmapsPath)) {
      return res.status(404).json({ error: 'No heatmaps found for this job' });
    }

    const files = fs.readdirSync(heatmapsPath).filter((f) => !f.startsWith('.'));

    if (files.length === 0) {
      return res.status(404).json({ error: 'No heatmap files to download' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="heatmaps_${req.params.jobId}.zip"`);

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    for (const filename of files) {
      const filePath = path.join(heatmapsPath, filename);
      archive.file(filePath, { name: filename });
    }

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    console.error('Error creating ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP file' });
    }
  }
});


app.get('/api/result/:jobId', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.resultFolder) {
      return res.status(404).json({ error: 'No result folder found for this job' });
    }

    const resultPath = path.join(SHARED_DIR, job.resultFolder, 'result.json');

    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({ error: 'Result file not found' });
    }

    const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    res.json(resultData);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

app.get('/api/original/:jobId', async (req, res) => {
  try {
    await db.read();
    const job = db.data.jobs.find((j) => j.id === req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.resultFolder) {
      return res.status(404).json({ error: 'No result folder found for this job' });
    }

    const folderPath = path.join(SHARED_DIR, job.resultFolder);
    
    // Find the original file in the folder (could be any name)
    const files = fs.readdirSync(folderPath);
    const originalFile = files.find(f => 
      !f.startsWith('.') && 
      f !== 'result.json' && 
      f !== 'heatmaps' &&
      fs.lstatSync(path.join(folderPath, f)).isFile()
    );

    if (!originalFile) {
      return res.status(404).json({ error: 'Original file not found' });
    }

    const filePath = path.join(folderPath, originalFile);
    
    // Set appropriate content type based on file extension
    const ext = path.extname(originalFile).toLowerCase();
    if (ext === '.mp4' || ext === '.avi' || ext === '.mov') {
      res.contentType('video/mp4');
    } else if (ext === '.png') {
      res.contentType('image/png');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.contentType('image/jpeg');
    }
    
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving original file:', error);
    res.status(500).json({ error: 'Failed to serve original file' });
  }
});

app.post('/api/process', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const model = req.body.model;
    const outputType = req.body.outputType || 'result'; // 'result' or 'result + heatmaps'

    if (!['ac-1', 'df-1'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model selection' });
    }

    // Create a new result folder
    const { folderName, folderPath } = createResultFolder();

    // Save file to result folder with absolute path
    const inputFilePath = path.resolve(folderPath, file.name);
    console.log('Saving file to:', inputFilePath);
    await file.mv(inputFilePath);

    // Verify file was saved
    if (!fs.existsSync(inputFilePath)) {
      throw new Error('File was not saved successfully');
    }

    // Prepare outputs array with absolute paths
    const outputs = [
      {
        kind: 'result',
        mimeType: 'application/json',
        provider: 'local_dir',
        path: path.resolve(folderPath, 'result.json'),
      },
    ];

    // Add heatmap output if requested
    if (outputType === 'result + heatmaps') {
      const heatmapsPath = path.resolve(folderPath, 'heatmaps');
      fs.mkdirSync(heatmapsPath, { recursive: true });

      if (model === 'ac-1') {
        outputs.push({
          kind: 'heatmaps',
          mimeType: 'image/png',
          provider: 'local_dir',
          path: heatmapsPath,
          filename: 'processed-image{ext}',
        });
      } else if (model === 'df-1') {
        outputs.push({
          kind: 'heatmaps',
          mimeType: 'video/mp4',
          provider: 'local_dir',
          path: heatmapsPath,
          filename: 'video-heatmap-{faceid}{ext}',
        });
      }
    }

    // Prepare job message
    const jobId = `job-${Date.now()}`;
    const jobMsg = {
      id: jobId,
      version: 1,
      op: { name: model, version: '1.0.0' },
      input: {
        mimeType: file.mimetype,
        provider: 'local_dir',
        path: inputFilePath,
      },
      outputs: outputs,
      callback: { mode: 'rabbitmq', replyTo: 'task_response' },
    };

    console.log('Job message:', JSON.stringify(jobMsg, null, 2));

    // Save job to database
    const job = {
      id: jobId,
      fileName: file.name,
      model,
      status: 'PROCESSING',
      timestamp: Date.now(),
      resultFolder: folderName,
      outputType: outputType,
    };
    db.data.jobs.push(job);
    await db.write();

    // Send to RabbitMQ
    const channel = await setupRabbitMQ();
    channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(jobMsg)), { persistent: true });

    res.json(job);
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shut down');
  });
});
