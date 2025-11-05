'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Hand connections for drawing hand skeleton
// These are the standard MediaPipe hand landmark connections
const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

// Types for MediaPipe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Hands = any;
type DrawingUtils = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawConnectors: (ctx: CanvasRenderingContext2D, landmarks: any[], connections: Array<[number, number]>, style?: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawLandmarks: (ctx: CanvasRenderingContext2D, landmarks: any[], style?: any) => void;
};

// Video URL - Play meme.mp4 when all scans are successful
const PREDICTION_VIDEO_URL = '/meme.mp4';

type ScanStep = 'idle' | 'left-hand' | 'right-hand' | 'scanning' | 'complete';

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const stepRef = useRef<ScanStep>('idle');
  const scanningRef = useRef(false);
  const handsDetectedRef = useRef({ left: false, right: false });
  const [step, setStep] = useState<ScanStep>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [handsDetected, setHandsDetected] = useState({ left: false, right: false });
  const [showVideo, setShowVideo] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [mediapipeLoaded, setMediapipeLoaded] = useState(false);
  const detectionThreshold = 30; // Number of consecutive detections needed

  // Keep refs in sync with state
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    handsDetectedRef.current = handsDetected;
  }, [handsDetected]);

  // Load MediaPipe dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('@mediapipe/hands'),
        import('@mediapipe/drawing_utils')
      ]).then(([, drawingModule]) => {
        drawingUtilsRef.current = {
          drawConnectors: drawingModule.drawConnectors,
          drawLandmarks: drawingModule.drawLandmarks
        };
        setMediapipeLoaded(true);
      }).catch((err) => {
        console.error('Error loading MediaPipe:', err);
        setError('Failed to load hand detection library. Please refresh the page.');
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [stream]);

  // Draw hand skeleton guide overlay
  const drawHandSkeletonGuide = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Center position for the guide
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.3; // Scale based on canvas size

    ctx.save();
    ctx.globalAlpha = 0.6; // Semi-transparent
    
    // Draw a hand outline/skeleton guide
    // This is a simplified hand outline to guide users
    ctx.strokeStyle = '#00FFFF'; // Cyan color for visibility
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw palm (center oval)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + scale * 0.3, scale * 0.4, scale * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw fingers
    const fingerSpacing = scale * 0.25;
    const fingerBaseX = centerX - fingerSpacing * 1.5;
    
    for (let i = 0; i < 5; i++) {
      const fingerX = fingerBaseX + i * fingerSpacing;
      const fingerY = centerY - scale * 0.2;
      
      // Draw finger segments
      ctx.beginPath();
      ctx.moveTo(fingerX, fingerY);
      ctx.lineTo(fingerX, fingerY - scale * 0.8);
      ctx.lineTo(fingerX + (i === 0 || i === 4 ? -scale * 0.1 : scale * 0.1), fingerY - scale * 1.0);
      ctx.stroke();
    }

    // Draw thumb
    ctx.beginPath();
    ctx.moveTo(centerX - scale * 0.5, centerY + scale * 0.2);
    ctx.lineTo(centerX - scale * 0.8, centerY - scale * 0.3);
    ctx.lineTo(centerX - scale * 0.9, centerY - scale * 0.5);
    ctx.stroke();

    // Add text instruction
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(20, scale * 0.15)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Place your hand here', centerX, centerY + scale * 1.2);
    
    ctx.restore();
  };

  const initializeHandDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !mediapipeLoaded || !drawingUtilsRef.current) {
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Clean up existing instances
    if (handsRef.current) {
      handsRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Dynamically import Hands class
    const { Hands: HandsClass } = await import('@mediapipe/hands');

    const hands = new HandsClass({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
      if (!canvasRef.current || !canvasCtx || !drawingUtilsRef.current) return;

      // Get current state from refs (always up-to-date)
      const currentStep = stepRef.current;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame
      if (videoRef.current) {
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }

      // Draw hand skeleton guide when ready to scan but no hand detected
      if ((currentStep === 'left-hand' || currentStep === 'right-hand')) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          drawHandSkeletonGuide(canvasCtx, canvasRef.current.width, canvasRef.current.height);
        }
      }

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Draw hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
          drawingUtilsRef.current.drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 3
          });
          drawingUtilsRef.current.drawLandmarks(canvasCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: 4
          });
        }

        // Automatically detect hand when in left-hand or right-hand step
        if (currentStep === 'left-hand' || currentStep === 'right-hand') {
          setDetectionCount(prev => {
            const newCount = prev + 1;
            if (newCount >= detectionThreshold) {
              // Hand successfully detected
              setTimeout(() => {
                handleScanSuccess();
              }, 0);
              return 0;
            }
            return newCount;
          });
        }
      } else {
        // Reset detection count if no hands detected
        if (currentStep === 'left-hand' || currentStep === 'right-hand') {
          setDetectionCount(0);
        }
      }

      canvasCtx.restore();
    });

    handsRef.current = hands;

    // Start frame capture loop using requestAnimationFrame
    const startFrameCapture = () => {
      const captureFrame = async () => {
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (error) {
            console.error('Error sending frame to hands:', error);
          }
        }
        animationFrameRef.current = requestAnimationFrame(captureFrame);
      };
      
      captureFrame();
    };

    // Wait for video to be ready before starting frame capture
    if (videoRef.current && videoRef.current.readyState >= 2) {
      startFrameCapture();
    } else {
      // Wait for video to load
      const checkVideo = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          clearInterval(checkVideo);
          startFrameCapture();
        }
      }, 100);

      // Cleanup interval after 5 seconds
      setTimeout(() => clearInterval(checkVideo), 5000);
    }
  };

  const handleScanSuccess = () => {
    // Get current state from refs (always up-to-date)
    const currentHandsDetected = handsDetectedRef.current;
    
    setScanning(false);
    setDetectionCount(0);
    
    // Determine which step we're in based on current state
    if (!currentHandsDetected.left) {
      // Left hand detected
      setHandsDetected(prev => ({ ...prev, left: true }));
      setStep('right-hand');
    } else if (!currentHandsDetected.right) {
      // Right hand detected - all scans complete
      setHandsDetected(prev => ({ ...prev, right: true }));
      setStep('complete');
      stopCamera();
      // Auto-play video after all scans complete
      setTimeout(() => {
        setShowVideo(true);
      }, 1000);
    }
  };

  const requestCameraPermission = async () => {
    try {
      setError('');
      
      // Wait for MediaPipe to load
      if (!mediapipeLoaded) {
        setError('Please wait, loading hand detection library...');
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        // Set canvas size to match video
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 1280;
          canvasRef.current.height = videoRef.current.videoHeight || 720;
        }
        
        // Initialize hand detection after video is ready
        setTimeout(() => {
          initializeHandDetection();
        }, 500);
      }
      setStep('left-hand');
      // Automatically start detection when step changes to left-hand
      setScanning(true);
    } catch (err) {
      setError('Camera permission denied. Please allow camera access to continue.');
      console.error('Error accessing camera:', err);
    }
  };


  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const resetScan = () => {
    stopCamera();
    setStep('idle');
    setHandsDetected({ left: false, right: false });
    setShowVideo(false);
    setScanning(false);
    setDetectionCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/50 to-yellow-900/40 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Hand Scanning
          </h1>
          <p className="text-xl text-gray-300">
            {step === 'idle' && 'Click the button below to start scanning'}
            {step === 'left-hand' && detectionCount === 0 && 'Position your left hand in the camera view'}
            {step === 'left-hand' && detectionCount > 0 && `Detecting left hand... (${Math.min(detectionCount, detectionThreshold)}/${detectionThreshold})`}
            {step === 'right-hand' && detectionCount === 0 && 'Position your right hand in the camera view'}
            {step === 'right-hand' && detectionCount > 0 && `Detecting right hand... (${Math.min(detectionCount, detectionThreshold)}/${detectionThreshold})`}
            {step === 'complete' && 'Scanning complete!'}
          </p>
        </motion.div>

        {/* Video/Canvas Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-black rounded-2xl overflow-hidden mb-8 aspect-video"
        >
          {!showVideo ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${step === 'idle' ? 'hidden' : ''}`}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {step === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 border-4 border-white/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="w-24 h-24 border-4 border-white/50 rounded-full" />
                    </div>
                    <p className="text-white text-xl">Camera will appear here</p>
                  </div>
                </div>
              )}
              {(step === 'left-hand' || step === 'right-hand') && detectionCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <motion.div
                    className="text-center"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="w-20 h-20 border-4 border-purple-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-2xl font-semibold">
                      {detectionCount > 0 ? 'Hand Detected!' : 'Scanning...'}
                    </p>
                    {detectionCount > 0 && (
                      <div className="mt-4 w-64 bg-gray-700 rounded-full h-2 mx-auto">
                        <motion.div
                          className="bg-purple-500 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(detectionCount / detectionThreshold) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </>
          ) : (
            <video
              src={PREDICTION_VIDEO_URL}
              autoPlay
              loop
              controls
              className="w-full h-full"
              onEnded={() => {
                // Video will loop automatically
              }}
            />
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {['left', 'right'].map((hand, index) => {
            const isActive = 
              (hand === 'left' && step === 'left-hand') ||
              (hand === 'right' && step === 'right-hand');
            const isComplete = handsDetected[hand as keyof typeof handsDetected];
            
            return (
              <motion.div
                key={hand}
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive || (step === 'scanning' && isActive)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isComplete ? '✓' : index + 1}
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {step === 'idle' && (
            <motion.button
              onClick={requestCameraPermission}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-semibold rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Scan Hand
            </motion.button>
          )}

          {(step === 'left-hand' || step === 'right-hand') && (
            <motion.button
              onClick={resetScan}
              className="px-8 py-4 bg-gray-700 text-white text-xl font-semibold rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Reset
            </motion.button>
          )}

          {step === 'complete' && showVideo && (
            <motion.button
              onClick={() => {
                resetScan();
                router.push('/');
              }}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white text-xl font-semibold rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Home
            </motion.button>
          )}

          {step !== 'idle' && step !== 'complete' && (
            <motion.button
              onClick={() => {
                stopCamera();
                router.push('/');
              }}
              className="px-8 py-4 bg-gray-700 text-white text-xl font-semibold rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Home
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
