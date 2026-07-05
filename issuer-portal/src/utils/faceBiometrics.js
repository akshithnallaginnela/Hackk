import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Load the required face-api models.
 */
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
    console.error('Error loading face-api models:', error);
    throw new Error('Failed to load biometric models. Check network and model paths.');
  }
}

/**
 * Averages multiple 128-d descriptors into a single robust descriptor.
 */
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

/**
 * Capture multiple frames over ~2 seconds, extract descriptors, and average them.
 * This provides a stable enrollment descriptor resilient to minor pose changes.
 */
export async function captureEnrollment(videoElement, onProgress) {
  if (!modelsLoaded) await loadModels();

  const descriptors = [];
  const captureCount = 4;
  const delayMs = 500;

  for (let i = 0; i < captureCount; i++) {
    const detection = await faceapi.detectSingleFace(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('No face detected. Please face the camera clearly.');
    }
    
    // Check confidence and bounding box to ensure quality
    if (detection.detection.score < 0.8) {
      throw new Error('Face not clear enough. Please improve lighting.');
    }

    descriptors.push(detection.descriptor);
    if (onProgress) onProgress(((i + 1) / captureCount) * 100);

    if (i < captureCount - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const finalDescriptor = averageDescriptors(descriptors);
  // Convert Float32Array to standard array for JSON storage in Supabase
  return Array.from(finalDescriptor);
}

/**
 * Perform a liveness check by capturing two frames ~800ms apart
 * and measuring the shift in nose/eye landmarks to detect subtle movement.
 */
export async function checkLiveness(videoElement) {
  if (!modelsLoaded) await loadModels();

  const det1 = await faceapi.detectSingleFace(videoElement).withFaceLandmarks();
  if (!det1) throw new Error('No face detected for liveness check.');

  await new Promise(r => setTimeout(r, 800)); // wait for slight movement

  const det2 = await faceapi.detectSingleFace(videoElement).withFaceLandmarks();
  if (!det2) throw new Error('Face lost during liveness check.');

  // Calculate Euclidean distance between the nose tip in frame 1 and frame 2
  const nose1 = det1.landmarks.getNose()[0];
  const nose2 = det2.landmarks.getNose()[0];
  
  const dist = Math.sqrt(Math.pow(nose2.x - nose1.x, 2) + Math.pow(nose2.y - nose1.y, 2));
  
  // Very rigid/static photos will have a distance close to 0. Real humans always have micro-movements.
  // If the distance is exactly 0 or extremely small, it might be a photo.
  if (dist < 1.0) {
    throw new Error('Liveness check failed. Static image detected.');
  }

  // If movement is too erratic (dist > 100), they might be turning away.
  if (dist > 100) {
    throw new Error('Too much movement. Please hold still but remain natural.');
  }

  return true;
}

/**
 * Verify a live face against a stored descriptor.
 * Uses Euclidean distance. Threshold is typically 0.6 for FaceAPI.
 */
export async function verifyFace(videoElement, storedDescriptorArray) {
  if (!modelsLoaded) await loadModels();

  // First, verify liveness
  await checkLiveness(videoElement);

  // Then detect the face for matching
  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    throw new Error('No face detected for verification.');
  }

  // Convert stored array back to Float32Array
  const storedDescriptor = new Float32Array(storedDescriptorArray);
  
  // Calculate euclidean distance
  const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
  
  // 0.6 is the default threshold. Lower is stricter.
  const threshold = 0.55; 
  if (distance > threshold) {
    throw new Error(`Face didn't match closely enough (dist: ${distance.toFixed(2)}).`);
  }

  return { matched: true, distance };
}
