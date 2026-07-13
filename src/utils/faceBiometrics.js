import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
  } catch (error) {
    throw new Error('Failed to load biometric models.', { cause: error });
  }
}

function averageDescriptors(descriptors) {
  if (descriptors.length === 0) return null;
  const avg = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    let sum = 0;
    for (let j = 0; j < descriptors.length; j++) {
      sum += descriptors[j][i];
    }
    avg[i] = sum / descriptors.length;
  }
  return avg;
}

export async function captureEnrollment(videoElement, onProgress) {
  if (!modelsLoaded) await loadModels();
  const descriptors = [];
  const captureCount = 4;
  const delayMs = 400;
  const maxAttempts = 20;
  let attempts = 0;
  let validFrames = 0;
  while (validFrames < captureCount && attempts < maxAttempts) {
    attempts++;
    const detection = await faceapi.detectSingleFace(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection && detection.detection.score >= 0.75) {
      descriptors.push(detection.descriptor);
      validFrames++;
      if (onProgress) onProgress((validFrames / captureCount) * 100);
    }
    if (validFrames < captureCount) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  if (validFrames < captureCount) {
    throw new Error('Could not capture enough clear frames.');
  }
  const finalDescriptor = averageDescriptors(descriptors);
  return JSON.stringify(Array.from(finalDescriptor));
}

export async function checkLiveness(videoElement) {
  if (!modelsLoaded) await loadModels();
  const det1 = await faceapi.detectSingleFace(videoElement).withFaceLandmarks();
  if (!det1) throw new Error('No face detected for liveness check.');
  await new Promise(r => setTimeout(r, 800));
  const det2 = await faceapi.detectSingleFace(videoElement).withFaceLandmarks();
  if (!det2) throw new Error('Face lost during liveness check.');
  const nose1 = det1.landmarks.getNose()[0];
  const nose2 = det2.landmarks.getNose()[0];
  const dist = Math.sqrt((nose2.x - nose1.x) ** 2 + (nose2.y - nose1.y) ** 2);
  if (dist < 1.0) throw new Error('Liveness check failed. Static image detected.');
  if (dist > 100) throw new Error('Too much movement. Please hold still.');
  return true;
}

export async function captureSingleDescriptor(videoElement) {
  if (!modelsLoaded) await loadModels();
  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) throw new Error('No face detected.');
  return JSON.stringify(Array.from(detection.descriptor));
}
