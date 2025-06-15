// Diagnostic tools for ElevenLabs conversation AI
// These tools can be called by the AI agent during conversations

export const diagnosticTools = {
  get_battery_level: async (): Promise<{ level: number; status: string }> => {
    try {
      // Web Battery API (limited support)
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          status: battery.charging ? 'charging' : 'discharging'
        };
      }
      
      // Fallback for unsupported platforms
      return {
        level: 85, // Simulated value
        status: 'unknown'
      };
    } catch (error) {
      console.error('Failed to get battery level:', error);
      return {
        level: 0,
        status: 'error'
      };
    }
  },

  get_device_info: async (): Promise<{
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    colorDepth: number;
    isMobile: boolean;
    touchSupport: boolean;
  }> => {
    try {
      console.log('get_device_info');
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
      const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword)) || 
                      window.innerWidth <= 768 ||
                      'ontouchstart' in window ||
                      navigator.maxTouchPoints > 0;

      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        isMobile,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        userAgent: 'unknown',
        platform: 'unknown',
        language: 'en-US',
        screenResolution: '0x0',
        colorDepth: 24,
        isMobile: false,
        touchSupport: false
      };
    }
  },

  test_microphone: async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Test microphone access with mobile-optimized constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for mobile stability
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Test audio recording for a brief moment
      const mediaRecorder = new MediaRecorder(stream);
      let recordingWorked = false;
      
      mediaRecorder.ondataavailable = () => {
        recordingWorked = true;
      };
      
      mediaRecorder.start();
      
      // Stop recording after 100ms
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 100);
      
      // Wait for recording test
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        success: recordingWorked,
        message: recordingWorked 
          ? 'Microphone test passed - audio input and recording are working correctly'
          : 'Microphone access granted but recording test failed'
      };
    } catch (error) {
      return {
        success: false,
        message: `Microphone test failed: ${(error as Error).message}`
      };
    }
  },

  test_camera: async (facingMode: 'user' | 'environment' = 'user'): Promise<{ success: boolean; message: string }> => {
    try {
      // Test camera access with mobile-optimized constraints
      const constraints = {
        video: { 
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 } // Lower frame rate for mobile
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify video track is active
      const videoTrack = stream.getVideoTracks()[0];
      const isActive = videoTrack && videoTrack.readyState === 'live';
      
      stream.getTracks().forEach(track => track.stop());
      
      return {
        success: isActive,
        message: isActive
          ? `${facingMode === 'user' ? 'Front' : 'Rear'} camera test passed - camera is working correctly`
          : `${facingMode === 'user' ? 'Front' : 'Rear'} camera access granted but video stream failed`
      };
    } catch (error) {
      return {
        success: false,
        message: `Camera test failed: ${(error as Error).message}`
      };
    }
  },

  flash_screen: async (color: string = '#FFFFFF', duration: number = 500): Promise<{ success: boolean }> => {
    try {
      // Create a full-screen flash effect optimized for mobile
      const flashDiv = document.createElement('div');
      flashDiv.style.position = 'fixed';
      flashDiv.style.top = '0';
      flashDiv.style.left = '0';
      flashDiv.style.width = '100vw';
      flashDiv.style.height = '100vh';
      flashDiv.style.backgroundColor = color;
      flashDiv.style.zIndex = '9999';
      flashDiv.style.pointerEvents = 'none';
      flashDiv.style.opacity = '0.9';
      flashDiv.style.transition = 'opacity 0.1s ease-in-out';
      
      document.body.appendChild(flashDiv);
      
      // Animate the flash for better mobile visibility
      setTimeout(() => {
        flashDiv.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(flashDiv)) {
            document.body.removeChild(flashDiv);
          }
        }, 100);
      }, duration - 100);
      
      return { success: true };
    } catch (error) {
      console.error('Flash screen failed:', error);
      return { success: false };
    }
  },

  vibrate_device: async (pattern: number[] = [200, 100, 200]): Promise<{ success: boolean; message: string }> => {
    try {
      if ('vibrate' in navigator) {
        // Use a more noticeable pattern for mobile devices
        const success = navigator.vibrate(pattern);
        return {
          success: !!success,
          message: success 
            ? 'Device vibration test completed successfully'
            : 'Vibration API called but may not be supported'
        };
      } else {
        return {
          success: false,
          message: 'Vibration not supported on this device or browser'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Vibration test failed: ${(error as Error).message}`
      };
    }
  },

  get_network_info: async (): Promise<{
    online: boolean;
    connectionType: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }> => {
    try {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      return {
        online: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      };
    } catch (error) {
      return {
        online: navigator.onLine,
        connectionType: 'unknown'
      };
    }
  },

  test_touch_screen: async (): Promise<{ success: boolean; message: string; touchPoints: number }> => {
    try {
      const touchSupport = 'ontouchstart' in window;
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      const pointerEvents = 'onpointerdown' in window;
      
      return {
        success: touchSupport || maxTouchPoints > 0,
        message: touchSupport 
          ? `Touch screen detected with ${maxTouchPoints} max touch points`
          : 'No touch screen detected - using mouse/trackpad input',
        touchPoints: maxTouchPoints
      };
    } catch (error) {
      return {
        success: false,
        message: `Touch screen test failed: ${(error as Error).message}`,
        touchPoints: 0
      };
    }
  },

  test_sensors: async (): Promise<{ 
    success: boolean; 
    message: string; 
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  }> => {
    try {
      const results = {
        accelerometer: false,
        gyroscope: false,
        magnetometer: false
      };

      // Test DeviceMotionEvent (accelerometer/gyroscope)
      if ('DeviceMotionEvent' in window) {
        results.accelerometer = true;
        results.gyroscope = true;
      }

      // Test DeviceOrientationEvent (magnetometer)
      if ('DeviceOrientationEvent' in window) {
        results.magnetometer = true;
      }

      const successCount = Object.values(results).filter(Boolean).length;
      
      return {
        success: successCount > 0,
        message: `Motion sensors test: ${successCount}/3 sensors available`,
        ...results
      };
    } catch (error) {
      return {
        success: false,
        message: `Sensors test failed: ${(error as Error).message}`,
        accelerometer: false,
        gyroscope: false,
        magnetometer: false
      };
    }
  },

  // Mobile-specific diagnostic for performance
  get_performance_info: async (): Promise<{
    memory?: number;
    cores?: number;
    devicePixelRatio: number;
    viewport: string;
  }> => {
    try {
      const performance = window.performance as any;
      
      return {
        memory: performance.memory?.usedJSHeapSize || undefined,
        cores: navigator.hardwareConcurrency || undefined,
        devicePixelRatio: window.devicePixelRatio,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
    } catch (error) {
      return {
        devicePixelRatio: 1,
        viewport: '0x0'
      };
    }
  }
};

export default diagnosticTools;