import React, { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';

const DriverSelection = ({ personnelData, onDriverSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Personnel tablosundan şoförleri çek
  const getDriversFromPersonnel = () => {
    return personnelData.filter(person => 
      person.position && person.position.toUpperCase() === 'ŞOFÖR'
    );
  };

  const drivers = getDriversFromPersonnel();

  const filteredDrivers = drivers
    .filter(driver =>
      driver.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Yakıt Fiş Takip
        </h1>
        <p className="text-gray-600">
          İsminizi seçin
        </p>
      </div>

      {/* Arama */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="İsminizi arayın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {/* Şoför Listesi */}
      <div className="space-y-3">
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm ? 'Arama kriterlerine uygun kişi bulunamadı' : 'Henüz personel eklenmemiş'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Personnel tablosunda position'ı "ŞOFÖR" olan kayıtları kontrol edin
            </p>
          </div>
        ) : (
          filteredDrivers.map((driver, index) => (
            <div
              key={index}
              onClick={() => onDriverSelect(driver)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {driver.full_name}
                    </h3>
                    {driver.phone && (
                      <p className="text-sm text-gray-600">
                        {driver.phone}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                      ŞOFÖR
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center space-y-3">
        <p className="text-xs text-gray-500">
          Sadece yetkili şoförler giriş yapabilir
        </p>
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-400">
            Developed by{' '}
            <a 
              href="https://www.melihkochan.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 font-medium underline"
            >
              Melih KOÇHAN
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverSelection;
