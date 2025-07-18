import React, { useState } from 'react';
import { Sparkles, User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        setError(result.error || 'Giriş başarısız');
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-slate-100 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.05),transparent_70%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Personel Planlama Sistemi
            </h1>
            <p className="text-gray-600">
              Giriş yapın ve sisteme erişin
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`border rounded-2xl p-4 mb-6 ${
              error.includes('Email onayı gerekli') 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-red-50 border-red-200'
            }`}>
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
                      <div className="bg-orange-100 rounded-xl p-3">
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
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="kullaniciadi"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Kullanıcı adınızı girin (email adresi de kullanabilirsiniz)
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-2xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Sorun mu yaşıyorsunuz?
              <a
                href="https://www.melihkochan.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 cursor-pointer ml-1"
              >
                Destek alın
              </a>

            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Personel Planlama Sistemi • Melih KOÇHAN
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 