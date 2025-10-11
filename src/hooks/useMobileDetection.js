import { useState, useEffect } from 'react';

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Mobil cihaz kontrolü
      const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Ekran boyutu kontrolü
      const screenCheck = window.innerWidth <= 768;
      
      setIsMobile(mobileCheck || screenCheck);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default useMobileDetection;
