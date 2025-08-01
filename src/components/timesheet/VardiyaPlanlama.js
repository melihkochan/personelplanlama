import React from 'react';
import { Calendar, Settings, Wrench, Construction } from 'lucide-react';

const VardiyaPlanlama = ({ userRole, onDataUpdate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Vardiya Planlama</h1>
                <p className="text-sm text-gray-600">Haftalık personel vardiya planı oluşturun</p>
              </div>
            </div>
          </div>
        </div>

        {/* Geliştiriliyor Mesajı */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {/* İkon */}
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Construction className="w-8 h-8 text-white" />
            </div>
            
            {/* Başlık */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Geliştiriliyor</h2>
              <p className="text-base text-gray-600">Vardiya planlama sistemi yakında hazır olacak</p>
            </div>
            
            {/* Özellikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-4xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Akıllı Planlama</h3>
                <p className="text-gray-600 text-xs">
                  Yapay zeka destekli vardiya planlama algoritması ile optimal personel dağılımı
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Otomatik Optimizasyon</h3>
                <p className="text-gray-600 text-xs">
                  Personel yetenekleri, vardiya kuralları ve iş yüküne göre otomatik plan oluşturma
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Gelişmiş Analiz</h3>
                <p className="text-gray-600 text-xs">
                  Vardiya performans analizi, çakışma kontrolü ve raporlama özellikleri
                </p>
              </div>
            </div>
            
            {/* Durum Mesajı */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Construction className="w-3 h-3 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 text-sm">Geliştirme Aşamasında</h4>
                  <p className="text-xs text-gray-600">
                    Bu özellik aktif olarak geliştiriliyor. Yakında kullanıma açılacak.
                  </p>
                </div>
              </div>
            </div>
            
            {/* İlerleme Çubuğu */}
            <div className="w-full max-w-md mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Geliştirme İlerlemesi</span>
                <span className="text-xs text-gray-500">%65</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VardiyaPlanlama; 