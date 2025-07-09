import React, { useState } from 'react';
import { Calendar, Download, Filter, Eye, Sun, Moon, Users, Car, MapPin, Clock, ChevronDown, ChevronUp, Table, Grid, AlertTriangle, X, Brain, Coffee, FileText, FileSpreadsheet } from 'lucide-react';

const PlanDisplay = ({ plan }) => {
  const [selectedShift, setSelectedShift] = useState('all');
  const [expandedDates, setExpandedDates] = useState({});
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [showWarnings, setShowWarnings] = useState(true);
  const [showRestingPersonnel, setShowRestingPersonnel] = useState(false);
  const [showLastPlans, setShowLastPlans] = useState(false);

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Henüz plan oluşturulmadı</h3>
          <p className="text-gray-500">Lütfen "Vardiya Planlama" sekmesinden plan oluşturun.</p>
        </div>
      </div>
    );
  }

  // Uyarıları göster
  const renderWarnings = () => {
    if (!plan.warnings || plan.warnings.length === 0 || !showWarnings) return null;

    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Planlama Uyarıları ({plan.warnings.length})
          </h3>
          <button
            onClick={() => setShowWarnings(false)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {plan.warnings.map((warning, index) => (
            <div key={index} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{warning}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Dinlendirilmiş personeli göster
  const renderRestingPersonnel = () => {
    if (!showRestingPersonnel || !plan.restingPersonnel) return null;

    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            Dinlendirilmiş Personel
          </h3>
          <button
            onClick={() => setShowRestingPersonnel(false)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Sadece Gece Vardiyası Dinlenen Personel */}
        <div className="bg-white border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Gece Vardiyası (22:00 - 06:00)
          </h4>
          {plan.restingPersonnel.nightShift?.drivers?.map((dayData, index) => (
            <div key={index} className="mb-3">
              <p className="text-sm font-medium text-gray-700">{formatDate(dayData.date)}</p>
              <div className="ml-4 mt-1">
                <p className="text-xs text-gray-600">Dinlenen Şoförler: {dayData.personnel.length > 0 ? dayData.personnel.join(', ') : 'Yok'}</p>
                <p className="text-xs text-gray-600">Dinlenen Sevkiyat Personeli: {plan.restingPersonnel.nightShift.shippingStaff?.[index]?.personnel?.length > 0 ? plan.restingPersonnel.nightShift.shippingStaff[index].personnel.join(', ') : 'Yok'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const toggleDateExpansion = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const getDifficultyInfo = (vehicle) => {
    if (!vehicle) return { level: 'Orta', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⚪' };
    
    const difficulty = vehicle.displayDifficulty || 'orta';
    const baseLocation = vehicle.baseLocation || 'Orta';
    
    switch (difficulty) {
      case 'basit':
        return { 
          level: 'Basit', 
          color: 'bg-green-100 text-green-800 border-green-300', 
          icon: '🟢',
          baseLocation: baseLocation
        };
      case 'zor':
        return { 
          level: 'Zor', 
          color: 'bg-red-100 text-red-800 border-red-300', 
          icon: '🔴',
          baseLocation: baseLocation
        };
      case 'orta':
      default:
        return { 
          level: 'Orta', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
          icon: '🟡',
          baseLocation: baseLocation
        };
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('tr-TR', options);
  };

  const getAllDates = () => {
    const dates = new Set();
    
    if (plan.plan) {
      Object.keys(plan.plan).forEach(date => dates.add(date));
    }
    
    return Array.from(dates).sort();
  };

  const renderNightShiftCard = (vehicleData, vehicleId, date) => {
    const { vehicle, driver, shipping } = vehicleData;
    const difficulty = getDifficultyInfo(vehicle);
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800">{vehicleId}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs border ${difficulty.color}`}>
                {difficulty.icon} {difficulty.level}
              </span>
              <span className="text-gray-600 text-sm">({difficulty.baseLocation})</span>
              <span className="text-blue-600 text-sm font-medium">{vehicle.vehicleType || 'Kamyon'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Şoför */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-800">Şoför</span>
              {driver.isSabit && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">SABİT</span>}
            </div>
            <p className={`text-sm mt-1 ${driver.isWarning ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
              {driver['ADI SOYADI']}
            </p>
          </div>

          {/* Sevkiyat Elemanları */}
          <div className="space-y-2">
            {shipping.map((person, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-800">Sevkiyat #{index + 1}</span>
                </div>
                <p className={`text-sm mt-1 ${person.isWarning ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                  {person['ADI SOYADI']}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayShiftCard = (shiftData, date) => {
    if (!shiftData || shiftData.type !== 'gunduz_sevkiyat') return null;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center shadow-md">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-800">Gündüz Vardiyası</h4>
            <p className="text-gray-600 text-sm font-medium">08:00 - 16:00</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Karşı Bölgesi */}
          <div className="bg-white border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h5 className="font-bold text-gray-800 text-lg">Karşı Bölgesi</h5>
                <p className="text-gray-600 text-sm">2 sevkiyat personeli</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Sevkiyat Personeli */}
              {shiftData.karsiPersonel?.map((person, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-800">{person['ADI SOYADI']}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{person.GOREV}</p>
                </div>
              ))}
              
              {(!shiftData.karsiPersonel || shiftData.karsiPersonel.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Sevkiyat personeli atanmadı</p>
                </div>
              )}
            </div>
          </div>

          {/* Anadolu Bölgesi */}
          <div className="bg-white border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h5 className="font-bold text-gray-800 text-lg">Anadolu Bölgesi</h5>
                <p className="text-gray-600 text-sm">2 sevkiyat personeli</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Sevkiyat Personeli */}
              {shiftData.anadoluPersonel?.map((person, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-800">{person['ADI SOYADI']}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{person.GOREV}</p>
                </div>
              ))}
              
              {(!shiftData.anadoluPersonel || shiftData.anadoluPersonel.length === 0) && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Sevkiyat personeli atanmadı</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCardView = () => {
    const dates = getAllDates();
    
    return (
      <div className="space-y-6">
        {dates.map((date) => {
          const isExpanded = expandedDates[date];
          const dayShiftData = plan.plan?.[date]?.dayShift;
          const nightShiftData = plan.plan?.[date]?.nightShift;
          
          return (
            <div key={date} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 cursor-pointer hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
                onClick={() => toggleDateExpansion(date)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6" />
                    <div>
                      <h3 className="text-xl font-bold">{formatDate(date)}</h3>
                      <p className="text-indigo-100 text-sm">
                        Gece: Araç bazlı, Gündüz: Sevkiyat elemanı bazlı
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-6 space-y-8">
                  {/* Gece Vardiyası */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <Moon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800">Gece Vardiyası</h4>
                        <p className="text-gray-600 text-sm font-medium">22:00 - 06:00</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nightShiftData && Object.entries(nightShiftData).map(([vehicleId, vehicleData]) => (
                        <div key={vehicleId}>
                          {renderNightShiftCard(vehicleData, vehicleId, date)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gündüz Vardiyası */}
                  {dayShiftData && renderDayShiftCard(dayShiftData, date)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableView = () => {
    const dates = getAllDates();
    
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Tarih</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Vardiya</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Araç/Bölge</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Şoför</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Sevkiyat #1</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Sevkiyat #2</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b">Zorluk</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dayShiftData = plan.plan?.[date]?.dayShift;
                const nightShiftData = plan.plan?.[date]?.nightShift;
                const rows = [];
                
                // Gece vardiyası satırları
                if (nightShiftData) {
                  Object.entries(nightShiftData).forEach(([vehicleId, vehicleData]) => {
                    const { vehicle, driver, shipping } = vehicleData;
                    const difficulty = getDifficultyInfo(vehicle);
                    
                    rows.push(
                      <tr key={`${date}-night-${vehicleId}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 border-b">{formatDate(date)}</td>
                        <td className="px-6 py-4 text-sm border-b">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 font-medium">Gece</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm border-b">
                          <div className="font-medium text-gray-800">{vehicleId}</div>
                          <div className="text-gray-600 text-xs">{vehicle.baseLocation || vehicle.NOKTA}</div>
                          <div className="text-blue-600 text-xs font-medium">{vehicle.vehicleType || 'Kamyon'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm border-b">
                          <div className={`${driver.isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                            {driver['ADI SOYADI']}
                          </div>
                          {driver.isSabit && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">SABİT</span>}
                        </td>
                        <td className="px-6 py-4 text-sm border-b">
                          <div className={`${shipping[0]?.isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                            {shipping[0]?.['ADI SOYADI'] || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm border-b">
                          <div className={`${shipping[1]?.isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                            {shipping[1]?.['ADI SOYADI'] || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm border-b">
                          <span className={`px-2 py-1 rounded-full text-xs border ${difficulty.color}`}>
                            {difficulty.icon} {difficulty.level}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                }
                
                // Gündüz vardiyası satırları - Her gün 2 satır (1 karşı, 1 anadolu)
                if (dayShiftData && dayShiftData.type === 'gunduz_sevkiyat') {
                  // Karşı bölgesi satırı
                  rows.push(
                    <tr key={`${date}-day-karsi`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700 border-b">{formatDate(date)}</td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-600 font-medium">Gündüz</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="font-medium text-gray-800">Karşı Bölgesi</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-500">Şoför atanmadı</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-700">
                          {dayShiftData.karsiPersonel?.[0]?.['ADI SOYADI'] || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-700">
                          {dayShiftData.karsiPersonel?.[1]?.['ADI SOYADI'] || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <span className="px-2 py-1 rounded-full text-xs border bg-green-100 text-green-800 border-green-300">
                          🟢 Basit
                        </span>
                      </td>
                    </tr>
                  );
                  
                  // Anadolu bölgesi satırı
                  rows.push(
                    <tr key={`${date}-day-anadolu`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700 border-b"></td>
                      <td className="px-6 py-4 text-sm border-b"></td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="font-medium text-gray-800">Anadolu Bölgesi</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-500">Şoför atanmadı</div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-700">
                          {dayShiftData.anadoluPersonel?.[0]?.['ADI SOYADI'] || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <div className="text-gray-700">
                          {dayShiftData.anadoluPersonel?.[1]?.['ADI SOYADI'] || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm border-b">
                        <span className="px-2 py-1 rounded-full text-xs border bg-orange-100 text-orange-800 border-orange-300">
                          🟠 Gündüz
                        </span>
                      </td>
                    </tr>
                  );
                }
                
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Excel export fonksiyonu
  const exportToExcel = () => {
    const dates = getAllDates();
    
    // BOM (Byte Order Mark) ekleyerek Türkçe karakterleri düzgün göster
    let csvContent = '\ufeff';
    
    // Ana başlık
    csvContent += 'VARDİYA PLANI\n';
    csvContent += `Tarih Aralığı: ${plan.summary.startDate} - ${plan.summary.endDate}\n`;
    csvContent += `Toplam Gün: ${plan.summary.totalDays}\n\n`;
    
    // Sütun başlıkları
    csvContent += 'Tarih;Vardiya;Araç/Bölge;Araç Tipi;Şoför;Sevkiyat #1;Sevkiyat #2;Zorluk Seviyesi;Bölge\n';
    
    dates.forEach((date) => {
      const dayShiftData = plan.plan?.[date]?.dayShift;
      const nightShiftData = plan.plan?.[date]?.nightShift;
      
      // Gece vardiyası
      if (nightShiftData) {
        Object.entries(nightShiftData).forEach(([vehicleId, vehicleData]) => {
          const { vehicle, driver, shipping } = vehicleData;
          const difficulty = getDifficultyInfo(vehicle);
          const formattedDate = new Date(date).toLocaleDateString('tr-TR');
          
          // CSV değerlerini düzgün formatla
          const cleanData = [
            formattedDate,
            'Gece (22:00-06:00)',
            vehicleId,
            vehicle.vehicleType || 'Kamyon',
            (driver['ADI SOYADI'] || '').replace(/;/g, ','),
            (shipping[0]?.['ADI SOYADI'] || '').replace(/;/g, ','),
            (shipping[1]?.['ADI SOYADI'] || '').replace(/;/g, ','),
            difficulty.level,
            vehicle.baseLocation || vehicle.NOKTA || ''
          ];
          
          csvContent += cleanData.join(';') + '\n';
        });
      }
      
      // Gündüz vardiyası
      if (dayShiftData && dayShiftData.type === 'gunduz_sevkiyat') {
        const formattedDate = new Date(date).toLocaleDateString('tr-TR');
        
        // Karşı bölgesi
        const karsiPerson1 = (dayShiftData.karsiPersonel?.[0]?.['ADI SOYADI'] || '').replace(/;/g, ',');
        const karsiPerson2 = (dayShiftData.karsiPersonel?.[1]?.['ADI SOYADI'] || '').replace(/;/g, ',');
        
        const karsiData = [
          formattedDate,
          'Gündüz (08:00-16:00)',
          'Karşı Bölgesi',
          'Sevkiyat',
          'Şoför atanmadı',
          karsiPerson1,
          karsiPerson2,
          'Gündüz',
          'Karşı'
        ];
        csvContent += karsiData.join(';') + '\n';
        
        // Anadolu bölgesi
        const anadoluPerson1 = (dayShiftData.anadoluPersonel?.[0]?.['ADI SOYADI'] || '').replace(/;/g, ',');
        const anadoluPerson2 = (dayShiftData.anadoluPersonel?.[1]?.['ADI SOYADI'] || '').replace(/;/g, ',');
        
        const anadoluData = [
          '',
          '',
          'Anadolu Bölgesi',
          'Sevkiyat',
          'Şoför atanmadı',
          anadoluPerson1,
          anadoluPerson2,
          'Gündüz',
          'Anadolu'
        ];
        csvContent += anadoluData.join(';') + '\n';
      }
    });
    
    // Dinlendirilmiş personel bilgisi
    if (plan.restingPersonnel && plan.restingPersonnel.nightShift?.drivers?.length > 0) {
      csvContent += '\n\nDİNLENDİRİLMİŞ PERSONEL\n';
      csvContent += 'Tarih;Vardiya;Dinlenen Şoförler;Dinlenen Sevkiyat Elemanları\n';
      
      plan.restingPersonnel.nightShift.drivers.forEach((dayData, index) => {
        const shippingData = plan.restingPersonnel.nightShift.shippingStaff?.[index];
        const formattedDate = new Date(dayData.date).toLocaleDateString('tr-TR');
        
        const restingData = [
          formattedDate,
          'Gece',
          dayData.personnel.join(', ').replace(/;/g, ','),
          (shippingData?.personnel?.join(', ') || '').replace(/;/g, ',')
        ];
        csvContent += restingData.join(';') + '\n';
      });
    }
    
    // Uyarılar
    if (plan.warnings && plan.warnings.length > 0) {
      csvContent += '\n\nUYARILAR\n';
      plan.warnings.forEach((warning) => {
        csvContent += `"${warning.replace(/"/g, '""')}"\n`;
      });
    }
    
    // Dosyayı indir
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vardiya_plani_${plan.summary.startDate}_${plan.summary.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metin dosyası export fonksiyonu
  const exportToText = () => {
    const dates = getAllDates();
    let content = `VARDİYA PLANI\n`;
    content += `Tarih Aralığı: ${plan.summary.startDate} - ${plan.summary.endDate}\n`;
    content += `Toplam Gün: ${plan.summary.totalDays}\n`;
    content += `=${'='.repeat(60)}\n\n`;
    
    dates.forEach((date) => {
      content += `${formatDate(date)}\n`;
      content += `${'-'.repeat(40)}\n`;
      
      const dayShiftData = plan.plan?.[date]?.dayShift;
      const nightShiftData = plan.plan?.[date]?.nightShift;
      
      // Gece vardiyası
      if (nightShiftData) {
        content += `GECE VARDİYASI (22:00 - 06:00)\n`;
        Object.entries(nightShiftData).forEach(([vehicleId, vehicleData]) => {
          const { vehicle, driver, shipping } = vehicleData;
          const difficulty = getDifficultyInfo(vehicle);
          
          content += `  ${vehicleId} - ${vehicle.baseLocation || vehicle.NOKTA} (${difficulty.level})\n`;
          content += `    Araç Tipi: ${vehicle.vehicleType || 'Kamyon'}\n`;
          content += `    Şoför: ${driver['ADI SOYADI']}${driver.isSabit ? ' (SABİT)' : ''}\n`;
          content += `    Sevkiyat #1: ${shipping[0]?.['ADI SOYADI'] || 'YOK'}\n`;
          content += `    Sevkiyat #2: ${shipping[1]?.['ADI SOYADI'] || 'YOK'}\n`;
          content += `\n`;
        });
      }
      
      // Gündüz vardiyası
      if (dayShiftData && dayShiftData.type === 'gunduz_sevkiyat') {
        content += `GÜNDÜZ VARDİYASI (08:00 - 16:00)\n`;
        
        // Karşı bölgesi
        content += `  Karşı Bölgesi:\n`;
        content += `    Şoför: Atanmadı (sadece sevkiyat personeli)\n`;
        if (dayShiftData.karsiPersonel?.length > 0) {
          content += `    Sevkiyat Personeli:\n`;
          dayShiftData.karsiPersonel.forEach((person) => {
            content += `      - ${person['ADI SOYADI']}\n`;
          });
        } else {
          content += `    Sevkiyat Personeli: Yok\n`;
        }
        
        // Anadolu bölgesi
        content += `  Anadolu Bölgesi:\n`;
        content += `    Şoför: Atanmadı (sadece sevkiyat personeli)\n`;
        if (dayShiftData.anadoluPersonel?.length > 0) {
          content += `    Sevkiyat Personeli:\n`;
          dayShiftData.anadoluPersonel.forEach((person) => {
            content += `      - ${person['ADI SOYADI']}\n`;
          });
        } else {
          content += `    Sevkiyat Personeli: Yok\n`;
        }
        content += `\n`;
      }
      
      content += `\n`;
    });
    
    // Dinlendirilmiş personel
    if (plan.restingPersonnel) {
      content += `DİNLENDİRİLMİŞ PERSONEL\n`;
      content += `=${'='.repeat(60)}\n`;
      
      plan.restingPersonnel.nightShift?.drivers?.forEach((dayData, index) => {
        const shippingData = plan.restingPersonnel.nightShift.shippingStaff?.[index];
        content += `${formatDate(dayData.date)} - Gece Vardiyası\n`;
        content += `  Dinlenen Şoförler: ${dayData.personnel.join(', ') || 'Yok'}\n`;
        content += `  Dinlenen Sevkiyat: ${shippingData?.personnel?.join(', ') || 'Yok'}\n\n`;
      });
    }
    
    // Uyarılar
    if (plan.warnings && plan.warnings.length > 0) {
      content += `UYARILAR\n`;
      content += `=${'='.repeat(60)}\n`;
      plan.warnings.forEach((warning) => {
        content += `- ${warning}\n`;
      });
    }
    
    // Dosyayı indir
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vardiya_plani_${plan.summary.startDate}_${plan.summary.endDate}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vardiya Planı</h1>
          <p className="text-gray-600">
            {plan.summary.startDate} - {plan.summary.endDate} ({plan.summary.totalDays} gün)
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowLastPlans(!showLastPlans)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Son Planlar
          </button>
        </div>
      </div>

      {/* Son Planlar Modal */}
      {showLastPlans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Son Planlar
              </h3>
              <button
                onClick={() => setShowLastPlans(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-700 mb-2">Planlama Aşamasında</h4>
              <p className="text-gray-500">Bu özellik şu anda geliştiriliyor.</p>
            </div>
          </div>
        </div>
      )}

      {/* Kontrol Paneli */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Görünüm Modu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-4 h-4" />
                Kart Görünümü
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Table className="w-4 h-4" />
                Tablo Görünümü
              </button>
            </div>

            {/* Dinlendirilmiş Personel */}
            <button
              onClick={() => setShowRestingPersonnel(!showRestingPersonnel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showRestingPersonnel
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Coffee className="w-4 h-4" />
              Dinlendirilmiş Personel
            </button>
          </div>

          {/* Export Butonları */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToText}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Metin İndir
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel İndir
            </button>
          </div>
        </div>
      </div>

      {/* Uyarılar */}
      {renderWarnings()}

      {/* Dinlendirilmiş Personel */}
      {renderRestingPersonnel()}

      {/* Plan İçeriği */}
      {viewMode === 'card' ? renderCardView() : renderTableView()}
    </div>
  );
};

export default PlanDisplay; 