import * as fs from 'fs';
import * as path from 'path';
import * as amqp from 'amqplib';
import inquirer from 'inquirer';

const RABBITMQ_URL = 'amqp://user:pass@rabbitmq:5672/';
const SHARED_DIR = path.resolve('./shared/');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

const INPUT_IMAGES = ['./input/images/fake.jpg', './input/images/real.jpg'];
const INPUT_VIDEOS = ['./input/videos/fake.mp4', './input/videos/real.mp4'];

function colorBlock(text, color) {
  return `${colors.bold}${color}${text}${colors.reset}`;
}

function clearSharedFolder() {
  if (fs.existsSync(SHARED_DIR)) {
    fs.readdirSync(SHARED_DIR).forEach((file) => {
      const curPath = path.join(SHARED_DIR, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        fs.rmSync(curPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(curPath);
      }
    });
  }
}

function copyToShared(srcPath) {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file does not exist: ${srcPath}`);
  }
  if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
  }
  const filename = path.basename(srcPath);
  const destPath = path.join(SHARED_DIR, filename);
  fs.copyFileSync(srcPath, destPath);
  return destPath;
}

async function promptInputFile() {
  const { fileType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fileType',
      message: 'Select input type:',
      choices: ['image', 'video'],
      default: 0,
    },
  ]);
  const choices = fileType === 'image' ? INPUT_IMAGES : INPUT_VIDEOS;
  const { inputFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'inputFile',
      message: 'Select input file:',
      choices,
      default: 0,
    },
  ]);
  return inputFile;
}

async function promptJobParams(inputPath) {
  const isVideo = inputPath.endsWith('.mp4');
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputType',
      message: 'Select output type:',
      choices: ['result', 'result + heatmaps'],
      default: 0,
    },
  ]);
  answers.op = isVideo ? 'df-1' : 'ac-1';
  answers.inputPath = inputPath;
  return answers;
}

function buildJobMsg(params) {
  const outputs = [];
  outputs.push({
    kind: 'result',
    mimeType: 'application/json',
    provider: 'local_dir',
    path: './shared/result.json',
  });

  if (params.outputType === 'result + heatmaps') {
    if (params.op === 'ac-1') {
      outputs.push({
        kind: 'heatmaps',
        mimeType: 'image/png',
        provider: 'local_dir',
        path: './shared/heatmaps-results',
        filename: 'processed-image{ext}',
      });
    } else if (params.op === 'df-1') {
      outputs.push({
        kind: 'heatmaps',
        mimeType: 'video/mp4',
        provider: 'local_dir',
        path: './shared/heatmaps-results',
        filename: `video-heatmap-{faceid}{ext}`,
      });
    }
  }

  const callback = { mode: 'rabbitmq', replyTo: 'task_response' };

  return {
    id: `job-${Math.floor(Math.random() * 10000)}`,
    version: 1,
    op: { name: params.op, version: '1.0.0' },
    input: {
      mimeType: 'application/octet-stream',
      provider: 'local_dir',
      path: params.inputPath,
    },
    outputs,
    callback,
  };
}

async function main() {
  console.log(colorBlock('\n[Step 1] Clearing shared folder...', colors.cyan));
  clearSharedFolder();
  console.log(colorBlock('Shared folder cleaned.', colors.green));

  console.log(colorBlock('\n[Step 2] Select input file...', colors.cyan));
  const selectedInput = await promptInputFile();

  console.log(colorBlock('\n[Step 3] Copying file to shared folder...', colors.cyan));
  const sharedInputPath = copyToShared(selectedInput);
  console.log(colorBlock(`File copied to ${sharedInputPath}`, colors.green));

  const params = await promptJobParams(sharedInputPath);

  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  await ch.assertQueue('task_queue', { durable: true });
  await ch.assertQueue('task_response', { durable: true });

  const jobMsg = buildJobMsg(params);

  console.log(colorBlock('\n[Step 4] Connect to rabbitmq and publish...', colors.cyan));
  console.log(colorBlock('Publishing job to queue:', colors.yellow), colorBlock('task_queue', colors.magenta));
  ch.sendToQueue('task_queue', Buffer.from(JSON.stringify(jobMsg)), { persistent: true });
  console.log(colorBlock('Message Published.', colors.green));

  console.log(colorBlock('\nJob message example:', colors.cyan));
  console.log(colorBlock(JSON.stringify(jobMsg, null, 2), colors.green));

  console.log(colorBlock('\n[Step 5] Waiting for response...', colors.cyan));
  console.log(colorBlock('Listening for response on queue:', colors.yellow), colorBlock('task_response', colors.magenta));
  await new Promise((resolve) => {
    ch.consume('task_response', (msg) => {
      if (msg !== null) {
        const content = msg.content.toString();
        let response;
        try {
          response = JSON.parse(content);
        } catch (e) {
          response = null;
        }

        console.log(colorBlock('\n[Response message received]:', colors.yellow));
        console.log(colorBlock(JSON.stringify(response, null, 2), colors.magenta));

        if (response && response.id === jobMsg.id) {
          let errorShown = false;
          if (response.error || response.exception) {
            errorShown = true;
            console.log(colorBlock('Handler error:', colors.red));
            console.log(colorBlock(response.error || response.exception, colors.red));
          }
          ch.ack(msg);

          if (!errorShown) {
            console.log(colorBlock('\n[Step 6] Producing final output...', colors.cyan));
            console.log(colorBlock('Result present at:', colors.cyan), colorBlock(path.join(SHARED_DIR, 'result.json'), colors.magenta));
            if (params.outputType === 'result + heatmaps') {
              console.log(colorBlock('Heatmaps present at:', colors.cyan), colorBlock(path.join(SHARED_DIR, 'heatmaps-results'), colors.magenta));
            }
          }
          resolve();
        } else {
          ch.ack(msg);
        }
      }
    });
  });

  await ch.close();
  await conn.close();
  console.log(colorBlock('\nAll done. Exiting.', colors.green));
  process.exit(0);
}

async function runWithReconnect() {
  while (true) {
    try {
      await main();
      break;
    } catch (err) {
      console.error(colorBlock('RabbitMQ error, retrying in 5s:', colors.red), err);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
}
runWithReconnect();
