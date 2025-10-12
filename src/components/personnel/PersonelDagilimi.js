import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, Filter, Download, RefreshCw } from 'lucide-react';
import { getAllPersonnel, getPerformanceData } from '../../services/supabase';

const PersonelDagilimi = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMatrix, setTeamMatrix] = useState({});
  const [filterPosition, setFilterPosition] = useState('all');
  const [selectedPersonnel, setSelectedPersonnel] = useState([]);
  const [analysisDate, setAnalysisDate] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc', personId: null });
  const [maxCountInfo, setMaxCountInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Personel verilerini yükle
      const personnelResult = await getAllPersonnel();
      if (personnelResult.success) {
        // Sadece Anadolu personelini filtrele
        const anadoluPersonnel = personnelResult.data.filter(p => 
          p.position === 'ŞOFÖR' || p.position === 'SEVKİYAT ELEMANI'
        );
        setPersonnelData(anadoluPersonnel);
      }

      // Performans verilerini yükle
      const performanceResult = await getPerformanceData();
      if (performanceResult.success) {
        setPerformanceData(performanceResult.data);
        // Veriler yüklendikten sonra analiz et
        analyzeTeamData(performanceResult.data);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Takım verilerini analiz et
  const analyzeTeamData = (data) => {
    const teamMatrix = {};
    
    // Tarih bazında grupla
    const dateGroups = {};
    data.forEach(record => {
      const date = record.date;
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(record);
    });

    // Her tarih için aynı store_codes'a sahip personelleri bul
    Object.entries(dateGroups).forEach(([date, records]) => {
      // Store codes bazında grupla
      const storeGroups = {};
      records.forEach(record => {
        if (record.store_codes) {
          const storeCode = record.store_codes.toString();
          if (!storeGroups[storeCode]) {
            storeGroups[storeCode] = [];
          }
          storeGroups[storeCode].push(record);
        }
      });

      // Aynı store'a giden personelleri eşleştir (her tarih için sadece 1 kez)
      Object.values(storeGroups).forEach(team => {
        if (team.length > 1) { // En az 2 kişi olmalı
          // Her personel çiftini sadece 1 kez say
          const processedPairs = new Set();
          
          team.forEach(person1 => {
            team.forEach(person2 => {
              if (person1.employee_code !== person2.employee_code) {
                // Çifti benzersiz hale getir (küçük sicil önce)
                const pairKey = [person1.employee_code, person2.employee_code].sort().join('-');
                
                if (!processedPairs.has(pairKey)) {
                  processedPairs.add(pairKey);
                  
                  const key1 = person1.employee_name || person1.employee_code;
                  const key2 = person2.employee_name || person2.employee_code;
                  
                  if (!teamMatrix[key1]) {
                    teamMatrix[key1] = {};
                  }
                  if (!teamMatrix[key1][key2]) {
                    teamMatrix[key1][key2] = 0;
                  }
                  teamMatrix[key1][key2]++;
                }
              }
            });
          });
        }
      });
    });

    setTeamMatrix(teamMatrix);
    
    // En çok veri olan tarihi bul
    const dateCounts = Object.keys(dateGroups).map(date => ({
      date,
      count: dateGroups[date].length
    })).sort((a, b) => b.count - a.count);
    
    if (dateCounts.length > 0) {
      setAnalysisDate(dateCounts[0].date);
    }
  };

  // Verileri yeniden yükle
  const refreshData = () => {
    loadData();
  };

  // İsme göre personel bul
  const findPersonByName = (name) => {
    if (!name) return null;
    
    // Önce tam eşleşme ara
    let person = personnelData.find(p => 
      p.full_name?.toUpperCase() === name.toUpperCase() ||
      p.employee_code === name
    );
    
    if (person) return person;
    
    // Kısmi eşleşme ara
    const nameParts = name.toUpperCase().split(' ').filter(p => p.length > 2);
    
    return personnelData.find(person => {
      const fullName = person.full_name?.toUpperCase() || '';
      return nameParts.every(part => fullName.includes(part));
    });
  };

  // Tüm personel listesi - Önce Sevkiyat Elemanları (A-Z), sonra Şoförler (A-Z)
  const getAllPersonnelSorted = () => {
    let filtered = filterPosition === 'all' ? personnelData : personnelData.filter(p => p.position === filterPosition);
    
    // Sevkiyat elemanları ve şoförleri ayır
    const sevkiyat = filtered.filter(p => p.position === 'SEVKİYAT ELEMANI').sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));
    const soforler = filtered.filter(p => p.position === 'ŞOFÖR').sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));
    
    // Önce sevkiyat elemanları, sonra şoförler
    return [...sevkiyat, ...soforler];
  };

  // Sadece seçili personeller için filtreleme (matrix'te vurgulama için)
  const getFilteredPersonnel = () => {
    if (selectedPersonnel.length === 0) {
      return getAllPersonnelSorted();
    }
    
    const allPersonnel = getAllPersonnelSorted();
    return allPersonnel.filter(p => selectedPersonnel.includes(p.id));
  };

  // Sıralama fonksiyonu - personelin çıkış sayılarına göre
  const handleSort = (personId) => {
    let direction = 'asc';
    if (sortConfig.personId === personId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: 'personCount', direction, personId });
  };

  // Personelin en çok çıktığı sayıyı bul
  const getMaxCountForPerson = (person) => {
    const personName = person.full_name;
    const partners = teamMatrix[personName] || {};
    
    if (Object.keys(partners).length === 0) {
      return { count: 0, partnerName: 'Kimse ile çıkış yapmamış' };
    }
    
    let maxCount = 0;
    let maxPartner = '';
    
    Object.entries(partners).forEach(([partnerName, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxPartner = partnerName;
      }
    });
    
    return { count: maxCount, partnerName: maxPartner };
  };

  // Üstteki isme tıklama fonksiyonu
  const handleNameClick = (person) => {
    const maxInfo = getMaxCountForPerson(person);
    setMaxCountInfo({
      personName: person.full_name,
      ...maxInfo
    });
  };

  // Personelin toplam çıkış sayısını hesapla
  const getPersonTotalCount = (person) => {
    const personName = person.full_name;
    const partners = teamMatrix[personName] || {};
    return Object.values(partners).reduce((sum, count) => sum + count, 0);
  };

  // Belirli bir personel ile diğer personellerin çıkış sayılarını al
  const getPersonCounts = (targetPerson) => {
    const targetPersonName = targetPerson.full_name;
    const counts = [];
    
    getAllPersonnelSorted().forEach(person => {
      if (person.id !== targetPerson.id) {
        const count = getTeamCount(targetPerson, person);
        counts.push({ person, count });
      }
    });
    
    return counts;
  };

  // Sıralanmış personel listesi - seçili personelin çıkış sayılarına göre
  const getSortedPersonnel = () => {
    let personnel = getAllPersonnelSorted();

    if (sortConfig.key === 'personCount' && sortConfig.personId) {
      const targetPerson = personnel.find(p => p.id === sortConfig.personId);
      if (targetPerson) {
        const personCounts = getPersonCounts(targetPerson);
        
        if (sortConfig.direction === 'asc') {
          personCounts.sort((a, b) => a.count - b.count);
        } else {
          personCounts.sort((a, b) => b.count - a.count);
        }
        
        // Target person'i başa koy, sonra sıralanmış listeyi ekle
        personnel = [targetPerson, ...personCounts.map(pc => pc.person)];
      }
    }
    
    return personnel;
  };

  // Matrix için personel listesi
  const getMatrixPersonnel = () => {
    return getSortedPersonnel();
  };

  // İki personel arasındaki çıkış sayısını al
  const getTeamCount = (person1, person2) => {
    if (person1 === person2) return '-';
    
    const person1Name = person1.full_name;
    const person2Name = person2.full_name;
    
    // Her iki yönden de kontrol et
    const count1 = teamMatrix[person1Name]?.[person2Name] || 0;
    const count2 = teamMatrix[person2Name]?.[person1Name] || 0;
    
    return Math.max(count1, count2);
  };

  // Maksimum çıkış sayısını bul (renk gradyanı için)
  const getMaxCount = () => {
    let max = 0;
    Object.values(teamMatrix).forEach(partners => {
      Object.values(partners).forEach(count => {
        if (count > max) max = count;
      });
    });
    return max;
  };

  // Sayıya göre renk döndür (yumuşak gradyan - konum dağılımı gibi)
  const getColorForCount = (count) => {
    if (count === 0 || count === '-') return { bg: 'bg-white', text: 'text-gray-300' };
    
    const maxCount = getMaxCount();
    const percentage = (count / maxCount) * 100;
    
    if (percentage <= 10) return { bg: 'bg-green-100', text: 'text-green-800' };
    if (percentage <= 25) return { bg: 'bg-blue-100', text: 'text-blue-800' };
    if (percentage <= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    if (percentage <= 75) return { bg: 'bg-orange-100', text: 'text-orange-800' };
    if (percentage <= 90) return { bg: 'bg-red-100', text: 'text-red-800' };
    return { bg: 'bg-red-200', text: 'text-red-900' };
  };

  // Excel'e aktar - Matrix formatında
  const exportToExcel = () => {
    if (!teamMatrix || Object.keys(teamMatrix).length === 0) {
      alert('Veri bulunamadı!');
      return;
    }

    const personnel = getMatrixPersonnel();
    
    // Başlık satırı
    const headers = ['Personel', 'Sicil No', 'Pozisyon', ...personnel.map(p => p.full_name)];
    
    // Veri satırları
    const rows = personnel.map(person => {
      const row = [
        person.full_name,
        person.employee_code,
        person.position,
        ...personnel.map(otherPerson => getTeamCount(person, otherPerson))
      ];
      return row;
    });

    // Excel oluştur
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Dağılımı Matrix');
    
    XLSX.writeFile(wb, `Personel_Dagilimi_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading && personnelData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Anadolu Personel Dağılımı
            </h1>
            <p className="text-gray-600">
              Hangi personelin kiminle kaç kez çıktığını görüntüleyin
            </p>
          </div>
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Veri Analizi</h2>
          </div>
          {teamMatrix && Object.keys(teamMatrix).length > 0 && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Dışa Aktar
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-blue-600 text-sm font-medium mb-1">Toplam Personel</div>
            <div className="text-2xl font-bold text-blue-900">
              {personnelData.length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-green-600 text-sm font-medium mb-1">Analiz Edilen</div>
            <div className="text-2xl font-bold text-green-900">
              {Object.keys(teamMatrix).length}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-purple-600 text-sm font-medium mb-1">Analiz Tarihi</div>
            <div className="text-lg font-bold text-purple-900">
              {analysisDate || 'Bilinmiyor'}
            </div>
          </div>
        </div>
      </div>

      {/* Filtre Butonu */}
      <div className="mb-6">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Personel Filtrele</span>
          {selectedPersonnel.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {selectedPersonnel.length}
            </span>
          )}
          <span className={`ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>

      {/* Açılır Filtre Paneli */}
      {isFilterOpen && (
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Personel Seçimi</span>
            </div>
            {selectedPersonnel.length > 0 && (
              <button
                onClick={() => setSelectedPersonnel([])}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Temizle ({selectedPersonnel.length})
              </button>
            )}
          </div>
          
          <div className="mb-4">
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Tüm Pozisyonlar</option>
              <option value="ŞOFÖR">Şoförler</option>
              <option value="SEVKİYAT ELEMANI">Sevkiyat Elemanları</option>
            </select>
          </div>

          <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
            {(() => {
              const positionFiltered = filterPosition === 'all' ? personnelData : personnelData.filter(p => p.position === filterPosition);
              const sevkiyat = positionFiltered.filter(p => p.position === 'SEVKİYAT ELEMANI').sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));
              const soforler = positionFiltered.filter(p => p.position === 'ŞOFÖR').sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'));
              
              const allPersonnel = [...sevkiyat, ...soforler];
              
              return allPersonnel.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedPersonnel.includes(person.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPersonnel([...selectedPersonnel, person.id]);
                      } else {
                        setSelectedPersonnel(selectedPersonnel.filter(id => id !== person.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {person.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {person.employee_code}
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    person.position === 'ŞOFÖR'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {person.position === 'ŞOFÖR' ? 'Ş' : 'S'}
                  </span>
                </label>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Matrix */}
      <div>

        {teamMatrix && Object.keys(teamMatrix).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Personel Çıkış Matrix
                {selectedPersonnel.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({selectedPersonnel.length} personel seçili - vurgulanıyor)
                  </span>
                )}
              </h3>
              {maxCountInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-sm font-medium text-blue-900">
                    {maxCountInfo.personName}
                  </div>
                  <div className="text-xs text-blue-700">
                    En çok çıktığı: {maxCountInfo.partnerName} ({maxCountInfo.count} kez)
                  </div>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#9CA3AF #F3F4F6',
              maxHeight: '600px'
            }}>
              {/* Webkit scrollbar styles */}
              <style jsx>{`
                div::-webkit-scrollbar {
                  height: 12px;
                }
                div::-webkit-scrollbar-track {
                  background: #F3F4F6;
                  border-radius: 6px;
                }
                div::-webkit-scrollbar-thumb {
                  background: #9CA3AF;
                  border-radius: 6px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #6B7280;
                }
              `}</style>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 font-semibold text-gray-900 min-w-[200px] sticky left-0 bg-white z-10">
                      Personel
                    </th>
                    {getMatrixPersonnel().map((person, idx) => (
                      <th 
                        key={idx}
                        className={`text-center py-3 px-1 font-semibold min-w-[60px] sticky top-0 bg-white z-20 ${
                          selectedPersonnel.includes(person.id) ? 'bg-yellow-50 border-b-4 border-yellow-400' : 'text-gray-900'
                        }`}
                        style={{ writingMode: 'vertical-rl' }}
                        title={`${person.full_name} (${person.employee_code}) - ${person.position} - Tıkla: En çok çıktığı kişiyi göster`}
                      >
                        <button
                          onClick={() => handleNameClick(person)}
                          className="flex flex-col items-center w-full hover:bg-gray-100 rounded transition-colors"
                        >
                          <span className={`text-xs font-medium truncate max-w-[45px] ${
                            selectedPersonnel.includes(person.id) ? 'text-yellow-800 font-bold' : ''
                          }`}>
                            {person.full_name.split(' ')[0]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {person.employee_code}
                          </span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getMatrixPersonnel().map((person, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className={`py-3 px-2 sticky left-0 bg-white z-10 ${
                        selectedPersonnel.includes(person.id) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                      }`}>
                        <div className="flex flex-col">
                          <span className={`font-medium text-xs ${
                            selectedPersonnel.includes(person.id) ? 'text-yellow-800 font-bold' : 'text-gray-900'
                          }`}>
                            {person.full_name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {person.employee_code}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              person.position === 'ŞOFÖR'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {person.position === 'ŞOFÖR' ? 'Şoför' : 'Sevkiyat'}
                            </span>
                          </div>
                        </div>
                      </td>
                      {getMatrixPersonnel().map((otherPerson, colIdx) => {
                        const count = getTeamCount(person, otherPerson);
                        const isDiagonal = rowIdx === colIdx;
                        const colors = getColorForCount(count);
                        
                        const isSelectedRow = selectedPersonnel.includes(person.id);
                        const isSelectedCol = selectedPersonnel.includes(otherPerson.id);
                        const isSelectedIntersection = isSelectedRow || isSelectedCol;
                        
                        return (
                          <td 
                            key={colIdx}
                            className={`py-3 px-2 text-center ${
                              isDiagonal ? 'bg-gray-100' : 
                              isSelectedIntersection ? 'bg-yellow-50' : ''
                            }`}
                          >
                            {isDiagonal ? (
                              <span className="text-gray-400 text-sm">-</span>
                            ) : count > 0 ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 ${colors.bg} ${colors.text} rounded-full text-sm font-semibold ${
                                isSelectedIntersection ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                              }`}>
                                {count}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-100 rounded-full"></div>
                  <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
                  <div className="w-3 h-3 bg-red-100 rounded-full"></div>
                  <div className="w-3 h-3 bg-red-200 rounded-full"></div>
                </div>
                <span className="text-gray-600">Az → Çok çıkış (Yumuşak gradyan)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded-full"></div>
                <span className="text-gray-600">Aynı kişi</span>
              </div>
              {selectedPersonnel.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-50 border border-yellow-400 rounded"></div>
                  <span className="text-gray-600">Seçili personel</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(!teamMatrix || Object.keys(teamMatrix).length === 0) && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Veri Bulunamadı
              </h3>
              <p className="text-gray-500 mb-6">
                Henüz personel dağılım verisi bulunmuyor. Performans verileri yüklendikten sonra burada görüntülenecektir.
              </p>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tekrar Dene
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PersonelDagilimi;

