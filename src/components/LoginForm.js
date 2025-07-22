import React, { useState, useEffect } from 'react';
import { Sparkles, User, Lock, LogIn, AlertCircle, Shield, Eye, EyeOff, Zap, Globe, Users, Truck, Settings, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ParticleTextEffect } from './ParticleTextEffect';
import { Boxes } from './BackgroundBoxes';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { signIn } = useAuth();

  // Mouse hareketini takip et
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gerekli');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signIn(username, password);
      if (!result.success) {
        setError(result.error || 'Giriş başarısız');
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };



  // Typewriter Text Component
  const TypewriterText = () => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const texts = [
      "Vardiya planlama ve personel yönetimi",
      "Otomatik vardiya optimizasyonu",
      "Gerçek zamanlı personel takibi",
      "Çoklu şube yönetimi",
      "Performans analizi ve raporlama",
      "Dinamik vardiya değişiklikleri"
    ];
    
    const currentText = texts[currentTextIndex];
    
    useEffect(() => {
      const timeout = setTimeout(() => {
        if (!isDeleting) {
          if (currentCharIndex < currentText.length) {
            setCurrentCharIndex(currentCharIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (currentCharIndex > 0) {
            setCurrentCharIndex(currentCharIndex - 1);
          } else {
            setIsDeleting(false);
            setCurrentTextIndex((currentTextIndex + 1) % texts.length);
          }
        }
      }, isDeleting ? 50 : 100);
      
      return () => clearTimeout(timeout);
    }, [currentCharIndex, isDeleting, currentText, currentTextIndex, texts.length]);
    
    return (
      <span className="inline-block">
        {currentText.substring(0, currentCharIndex)}
        <motion.span
          className="inline-block w-0.5 h-5 bg-gray-300 ml-1"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </span>
    );
  };

  // 3D Typewriter Text Component
  const TypewriterText3D = ({ texts, className }) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const currentText = texts[currentTextIndex];
    
    useEffect(() => {
      const timeout = setTimeout(() => {
        if (!isDeleting) {
          if (currentCharIndex < currentText.length) {
            setCurrentCharIndex(currentCharIndex + 1);
          } else {
            setTimeout(() => setIsDeleting(true), 1500);
          }
        } else {
          if (currentCharIndex > 0) {
            setCurrentCharIndex(currentCharIndex - 1);
          } else {
            setIsDeleting(false);
            setCurrentTextIndex((currentTextIndex + 1) % texts.length);
          }
        }
      }, isDeleting ? 30 : 80);
      
      return () => clearTimeout(timeout);
    }, [currentCharIndex, isDeleting, currentText, currentTextIndex, texts.length]);
    
    return (
      <span className={`inline-block ${className}`}>
        {currentText.substring(0, currentCharIndex)}
        <motion.span
          className="inline-block w-0.5 h-6 bg-current ml-1"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      </span>
    );
  };



  // Ana animasyon varyantları
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
            {/* Sol Panel - Sadece Particle Text Effect */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ParticleTextEffect 
          words={[
            "VARDİYA PLANLAMA",
            "PERSONEL YÖNETİMİ", 
            "OTOMATİK OPTİMİZASYON",
            "GERÇEK ZAMANLI TAKİP",
            "MODERN SİSTEM"
          ]}
        />
      </div>

      {/* Sağ Panel - Background Boxes ile Login Formu */}
      <div className="w-full lg:w-1/2 relative overflow-hidden bg-white flex flex-col items-center justify-center">
        {/* Background Boxes */}
        <div className="absolute inset-0 w-full h-full bg-white z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
        <Boxes />
        
        {/* Login Form Overlay */}
        <div className="relative z-30 w-full max-w-md p-8">

        <motion.div 
          className="w-full max-w-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div 
            className="text-center mb-8"
            variants={itemVariants}
          >
            <motion.div 
              className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4"
              animate={{ rotateY: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Personel Planlama
            </h1>
            <p className="text-gray-600">
              Giriş yapın ve sisteme erişin
            </p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className={`border rounded-xl p-4 mb-6 ${
                  error.includes('Email onayı gerekli') 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-red-50 border-red-200'
                }`}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                    error.includes('Email onayı gerekli') 
                      ? 'text-orange-500' 
                      : 'text-red-500'
                  }`} />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      error.includes('Email onayı gerekli') 
                        ? 'text-orange-700' 
                        : 'text-red-700'
                    }`}>
                      {error.includes('Email onayı gerekli') ? 'Email Onayı Gerekli' : 'Giriş Hatası'}
                    </span>
                    
                    {error.includes('Email onayı gerekli') ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-orange-600">
                          Hesabınız oluşturuldu ancak email onayı gerekiyor.
                        </p>
                        <div className="bg-orange-100 rounded-lg p-3">
                          <p className="text-xs font-medium text-orange-700 mb-2">✅ Hızlı Çözüm:</p>
                          <ol className="text-xs text-orange-600 space-y-1 pl-4">
                            <li>1. <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard</a>'a gidin</li>
                            <li>2. <strong>Authentication → Settings → Email Auth</strong></li>
                            <li>3. <strong>"Confirm email"</strong> seçeneğini <strong>OFF</strong> yapın</li>
                            <li>4. <strong>Save</strong> butonuna basın</li>
                            <li>5. Bu sayfaya geri dönüp tekrar giriş yapın</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 mt-1 whitespace-pre-line">{error}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            variants={itemVariants}
          >
            {/* Username Input */}
            <motion.div 
              className="group"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="kullaniciadi"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Kullanıcı adınızı girin (email adresi de kullanabilirsiniz)
              </p>
            </motion.div>

            {/* Password Input */}
            <motion.div 
              className="group"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <motion.div 
                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <LogIn className="w-5 h-5" />
                  </motion.div>
                  <span>Giriş Yap</span>
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div 
            className="mt-8 text-center"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-500">
              Sorun mu yaşıyorsunuz?
              <a
                href="https://www.melihkochan.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 cursor-pointer ml-1 font-medium hover:underline transition-all duration-200"
              >
                Destek alın
              </a>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              © 2025 Personel Planlama Sistemi • Melih KOÇHAN
            </p>
          </motion.div>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 