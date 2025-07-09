import React, { useState } from 'react';
import { Search, Users, Car, Filter, UserCheck, Truck, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const PersonelList = ({ personnelData, vehicleData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gorevFilter, setGorevFilter] = useState('ALL');
  const [expandedSection, setExpandedSection] = useState('personnel');

  const filteredPersonel = personnelData.filter(personel => {
    const matchesSearch = personel['ADI SOYADI']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel['AD']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel['SOYAD']?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGorev = gorevFilter === 'ALL' || personel.GOREV === gorevFilter;
    
    return matchesSearch && matchesGorev;
  });

  const soforCount = personnelData.filter(p => p.GOREV === 'ŞOFÖR').length;
  const sevkiyatCount = personnelData.filter(p => p.GOREV === 'SEVKİYAT ELEMANI').length;

  const getVardiyaBadge = (vardiya) => {
    if (!vardiya) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
          <Calendar className="w-4 h-4 mr-1" />
          Belirtilmemiş
        </span>
      );
    }
    
    // Gece vardiyası için mavi renk
    if (vardiya.includes('22:00') || vardiya.includes('06:00')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <Calendar className="w-4 h-4 mr-1" />
          {vardiya}
        </span>
      );
    }
    
    // Gündüz vardiyası için turuncu renk
    if (vardiya.includes('08:00') || vardiya.includes('16:00')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-300">
          <Calendar className="w-4 h-4 mr-1" />
          {vardiya}
        </span>
      );
    }
    
    // Diğer vardiyalar için gri renk
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
        <Calendar className="w-4 h-4 mr-1" />
        {vardiya}
      </span>
    );
  };

  const getJobBadge = (job) => {
    if (job === 'ŞOFÖR') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <UserCheck className="w-4 h-4 mr-1" />
          Şoför
        </span>
      );
    } else if (job === 'SEVKİYAT ELEMANI') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300">
          <Truck className="w-4 h-4 mr-1" />
          Sevkiyat Elemanı
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
        <Users className="w-4 h-4 mr-1" />
        Belirtilmemiş
      </span>
    );
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-6 animate-pulse-slow">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 gradient-text">
          Personel ve Araç Listesi
        </h2>
        <p className="text-gray-600 text-lg">
          Excel dosyasından yüklenen personel ve araç bilgileri
        </p>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="modern-card border-l-4 border-blue-500 p-6 text-center hover-glow transition-all duration-300">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-blue-600 mb-2">{personnelData.length}</h3>
          <p className="text-gray-600">Toplam Personel</p>
        </div>
        <div className="modern-card border-l-4 border-green-500 p-6 text-center hover-glow-green transition-all duration-300">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">{soforCount}</h3>
          <p className="text-gray-600">Şoför</p>
        </div>
        <div className="modern-card border-l-4 border-purple-500 p-6 text-center hover-glow-purple transition-all duration-300">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-purple-600 mb-2">{sevkiyatCount}</h3>
          <p className="text-gray-600">Sevkiyat Elemanı</p>
        </div>
      </div>

      {/* Personnel Section */}
      <div className="modern-card overflow-hidden">
        <div 
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('personnel')}
        >
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-6 h-6" />
            Personel Listesi ({filteredPersonel.length})
          </h3>
          {expandedSection === 'personnel' ? 
            <ChevronUp className="w-5 h-5 text-gray-600" /> : 
            <ChevronDown className="w-5 h-5 text-gray-600" />
          }
        </div>
        
        {expandedSection === 'personnel' && (
          <div className="p-6 border-t border-gray-200">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Personel ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                />
              </div>
              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <select
                  value={gorevFilter}
                  onChange={(e) => setGorevFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white appearance-none cursor-pointer"
                >
                  <option value="ALL">Tüm Görevler</option>
                  <option value="ŞOFÖR">Şoför</option>
                  <option value="SEVKİYAT ELEMANI">Sevkiyat Elemanı</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Personnel Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      Ad Soyad
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      Görev
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      Vardiya
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPersonel.map((personel, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {(personel['ADI SOYADI'] || personel['AD'] || 'N').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {personel['ADI SOYADI'] || `${personel['AD'] || ''} ${personel['SOYAD'] || ''}`.trim()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getJobBadge(personel.GOREV)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getVardiyaBadge(personel.Vardiya)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredPersonel.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Personel bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Section */}
      <div className="modern-card overflow-hidden">
        <div 
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('vehicles')}
        >
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Car className="w-6 h-6" />
            Araç Listesi ({vehicleData.length})
          </h3>
          {expandedSection === 'vehicles' ? 
            <ChevronUp className="w-5 h-5 text-gray-600" /> : 
            <ChevronDown className="w-5 h-5 text-gray-600" />
          }
        </div>
        
        {expandedSection === 'vehicles' && (
          <div className="p-6 border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="modern-table w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Plaka
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Sabit Şoför
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Sabit Şoför 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleData.map((arac, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                            <Car className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {arac.PLAKA}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {arac.SABIT_SOFOR ? (
                          <span className="modern-badge green">
                            <UserCheck className="w-4 h-4 mr-1" />
                            {arac.SABIT_SOFOR}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {arac.SOFOR_2 ? (
                          <span className="modern-badge blue">
                            <UserCheck className="w-4 h-4 mr-1" />
                            {arac.SOFOR_2}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {vehicleData.length === 0 && (
                <div className="text-center py-12">
                  <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Araç bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonelList; 