import React, { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, AlertCircle, X, FileSpreadsheet, Users, Car, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

const FileUpload = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel') {
        setFile(file);
        processFile(file);
      } else {
        setError('Lütfen geçerli bir Excel dosyası seçin (.xlsx veya .xls)');
      }
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      processFile(file);
    }
  };

  const processFile = async (file) => {
    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Excel verisi okundu:', jsonData);

      // Personel verilerini filtrele
      const personnel = jsonData.filter(item => {
        const job = item.GOREV?.toString()?.toUpperCase()?.trim() || 
                   item.GÖREVİ?.toString()?.toUpperCase()?.trim() ||
                   item.GÖREVI?.toString()?.toUpperCase()?.trim();
        
        return job && (job === 'ŞOFÖR' || job === 'SEVKİYAT ELEMANI');
      }).map(item => {
        // GOREV bilgisini normalize et
        const job = item.GOREV?.toString()?.toUpperCase()?.trim() || 
                   item.GÖREVİ?.toString()?.toUpperCase()?.trim() ||
                   item.GÖREVI?.toString()?.toUpperCase()?.trim();
        
        return {
          ...item,
          GOREV: job
        };
      });

      // Araç verilerini çıkar
      const vehicles = [];
      jsonData.forEach(item => {
        const plaka = item.Plaka || item.PLAKA;
        if (plaka?.toString()?.trim()) {
          const vehicle = {
            PLAKA: plaka,
            NOKTA: item.NOKTA || item.Nokta || 'Orta',
            MAĞAZA: item.MAĞAZA || item.Mağaza || '',
            SOFOR_1: item['1.Şoför'] || item['1.ŞOFÖR'] || '',
            SOFOR_2: item['2.Şoför'] || item['2.ŞOFÖR'] || '',
            SABIT_SOFOR: item['1.Şoför'] || item['1.ŞOFÖR'] || '', // 1.Şoför sabit kabul ediliyor
            TIP: item.TIP || item.Tip || item.tip || 'Kamyon'
          };
          vehicles.push(vehicle);
        }
      });

      // İstatistikler
      const statistics = {
        totalRows: jsonData.length,
        personnelCount: personnel.length,
        vehicleCount: vehicles.length,
        driverCount: personnel.filter(p => p.GOREV === 'ŞOFÖR').length,
        shippingCount: personnel.filter(p => p.GOREV === 'SEVKİYAT ELEMANI').length
      };

      setStats(statistics);
      onDataLoaded({ personnel, vehicles, raw: jsonData });
      
    } catch (err) {
      console.error('Excel dosyası işleme hatası:', err);
      setError('Excel dosyası işlenirken bir hata oluştu. Lütfen dosya formatını kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setStats(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
          ${isDragging 
            ? 'border-green-400 bg-green-50 scale-105' 
            : 'border-blue-400/50 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/50'
          }
          ${loading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              ${isDragging ? 'bg-green-500 animate-bounce' : 'bg-blue-500 animate-pulse'}
            `}>
              <Upload className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Excel dosyasını sürükleyin veya seçin
            </h3>
            <p className="text-gray-600 text-lg">
              Desteklenen formatlar: .xlsx, .xls
            </p>
          </div>

          <div className="flex justify-center">
            <label className="relative group cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                            text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 
                            transform hover:scale-105 hover:shadow-neon">
                Dosya Seçin
              </div>
            </label>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-3xl">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-900 font-semibold">Dosya işleniyor...</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-red-800 font-semibold text-lg">Hata</h4>
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* File Info */}
      {file && (
        <div className="modern-card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-gray-900 font-semibold text-lg">{file.name}</h4>
              <p className="text-gray-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-400">{stats.personnelCount}</p>
                <p className="text-gray-400 text-sm">Personel</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <Car className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-400">{stats.vehicleCount}</p>
                <p className="text-gray-400 text-sm">Araç</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">{stats.driverCount}</p>
                <p className="text-gray-400 text-sm">Şoför</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                <Calendar className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-400">{stats.shippingCount}</p>
                <p className="text-gray-400 text-sm">Sevkiyat Elemanı</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expected Format Info */}
      <div className="modern-card p-6">
        <h4 className="text-gray-900 font-semibold text-lg mb-4 flex items-center gap-2">
          <File className="w-5 h-5" />
          Beklenen Excel Formatı:
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h5 className="text-blue-700 font-semibold">Personel Kolonları:</h5>
            <ul className="text-gray-700 space-y-1">
              <li>• <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded">ADI SOYADI</code> - Personel adı</li>
              <li>• <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded">GOREV</code> - ŞOFÖR veya SEVKİYAT ELEMANI</li>
              <li>• <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded">Vardiya</code> - Vardiya bilgisi</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="text-purple-700 font-semibold">Araç Bilgileri:</h5>
            <ul className="text-gray-700 space-y-1">
              <li>• <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded">Plaka</code> - Araç plakası</li>
              <li>• <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded">NOKTA</code> - Yakin/Orta/Uzak</li>
              <li>• <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded">Şoför</code> - Sabit şoför</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 