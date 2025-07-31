import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus, Eye, EyeOff, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { createPendingRegistration } from '../../services/supabase';

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();

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
        if (result.hasPendingRegistration) {
          setError('🎯 İsteğiniz admin onayında bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.');
        } else {
        setError(result.error || 'Giriş başarısız');
        }
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!fullName || !username || !password) {
      setError('Ad soyad, kullanıcı adı ve şifre gerekli');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Kayıt isteği admin onayına gönderilecek
      const registrationData = {
        fullName: fullName, // Database'de fullName olarak kaydediliyor
        username: username, // @gratis.com eklemiyoruz
        password,
        status: 'pending', // Admin onayı bekliyor
        role: 'kullanıcı', // Varsayılan rol
        created_at: new Date().toISOString() // Database'de created_at olarak kaydediliyor
      };

      const result = await createPendingRegistration(registrationData);

      if (result.success) {
        setSuccess('Kayıt isteğiniz yönetici onayına gönderildi. Onaylandıktan sonra giriş yapabilirsiniz.');
        setFullName('');
        setUsername('');
        setPassword('');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccess('');
        }, 3000);
          } else {
        setError('Kayıt isteği gönderilemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-4xl h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        
        {/* Login View */}
        <motion.div 
          className="w-full h-full flex relative z-10"
          animate={{
            x: isSignUp ? '100%' : 0,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          
          {/* Left Panel - Login Form */}
          <div className="w-1/2 h-full p-12 flex flex-col justify-center">
          <motion.div 
              animate={{ opacity: isSignUp ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm mx-auto"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Giriş Yap</h2>
              
          <AnimatePresence>
                {error && !isSignUp && (
              <motion.div 
                    className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                  placeholder="kullaniciadi"
                  required
                />
              </div>
                </div>

                <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
                </div>

            <motion.button
              type="submit"
              disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                      <ArrowRight className="w-5 h-5" />
                      <span>GİRİŞ YAP</span>
                    </>
                  )}
                </motion.button>
              </form>

              
            </motion.div>
          </div>

          {/* Right Panel - Welcome */}
          <div className="w-1/2 h-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-r-3xl p-12 flex flex-col justify-center">
            <motion.div
              animate={{ opacity: isSignUp ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm mx-auto text-white text-center"
            >
              <div>
                <h2 className="text-3xl font-bold mb-4">Merhaba!</h2>
                <p className="text-white/90 mb-8 text-lg">
                  Tüm site özelliklerini kullanmak için kişisel bilgilerinizi girin
                </p>
                
                <motion.button
                  onClick={() => setIsSignUp(true)}
                  className="w-full bg-white/20 border border-white/30 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>+ KAYIT OL</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Registration View */}
        <motion.div 
          className="absolute top-0 left-0 w-full h-full flex z-20"
          animate={{
            x: isSignUp ? 0 : '-100%',
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          
          {/* Left Panel - Registration Form */}
          <div className="w-1/2 h-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-l-3xl p-12 flex flex-col justify-center">
            <motion.div
              animate={{ opacity: isSignUp ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm mx-auto text-white text-center"
            >
              <h2 className="text-3xl font-bold mb-8 text-center">Kayıt Ol</h2>

              <AnimatePresence>
                {error && isSignUp && (
                  <motion.div
                    className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {success && (
                  <motion.div
                    className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-500" />
                      <span className="text-green-700 text-sm">{success}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="group">
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 border-b-2 border-white/30 focus:border-white transition-all bg-transparent text-white placeholder-white/70"
                      placeholder="Ad Soyad"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 border-b-2 border-white/30 focus:border-white transition-all bg-transparent text-white placeholder-white/70"
                      placeholder="Kullanıcı Adı"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 border-b-2 border-white/30 focus:border-white transition-all bg-transparent text-white placeholder-white/70"
                      placeholder="Şifre"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white/20 border border-white/30 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center justify-center gap-3 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      <span>KAYIT İSTEĞİ GÖNDER</span>
                </>
              )}
            </motion.button>
              </form>

            </motion.div>
          </div>

          {/* Right Panel - Welcome Back */}
          <div className="w-1/2 h-full bg-white rounded-r-3xl p-12 flex flex-col justify-center">
          <motion.div 
              animate={{ opacity: isSignUp ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm mx-auto text-center"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Hoş Geldiniz!</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Zaten hesabınız var mı? Giriş yaparak devam edin
              </p>
              
              <motion.button
                onClick={() => setIsSignUp(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogIn className="w-5 h-5" />
                <span>GİRİŞ YAP</span>
              </motion.button>
          </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginForm; 