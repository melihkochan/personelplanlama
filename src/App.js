import React, { useState } from 'react';
import { Upload, Users, Calendar, FileText, BarChart3, Sparkles } from 'lucide-react';
import FileUpload from './components/FileUpload';
import PersonelList from './components/PersonelList';
import VardiyaPlanlama from './components/VardiyaPlanlama';
import PlanDisplay from './components/PlanDisplay';
import PerformanceAnalysis from './components/PerformanceAnalysis';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleDataLoaded = (data) => {
    setPersonnelData(data.personnel || []);
    setVehicleData(data.vehicles || []);
    console.log('Data loaded:', data);
  };

  const handlePlanGenerated = (plan) => {
    setGeneratedPlan(plan);
    setActiveTab('display');
  };

  const handleExport = (format) => {
    console.log('Export format:', format);
    // Export logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-slate-100">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.05),transparent_70%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass-card border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Personel Planlama Sistemi</h1>
                  <p className="text-sm text-gray-500">Şoför ve Sevkiyat Elemanı Vardiya Planlaması</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('tr-TR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="glass border-b border-slate-200/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-6">
              {/* Progress Steps */}
              <div className="flex items-center space-x-4">
                {/* Step 1 - Upload */}
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium
                      ${activeTab === 'upload' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : personnelData.length > 0
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${activeTab === 'upload' 
                        ? 'bg-white text-blue-600' 
                        : personnelData.length > 0
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {personnelData.length > 0 ? '✓' : '1'}
                    </div>
                    <span>Dosya Yükle</span>
                  </button>
                  {personnelData.length > 0 && (
                    <div className="w-8 h-0.5 bg-green-400 ml-2"></div>
                  )}
                </div>

                {/* Step 2 - List */}
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveTab('list')}
                    disabled={!personnelData.length}
                    className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium
                      ${activeTab === 'list' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : !personnelData.length
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${activeTab === 'list' 
                        ? 'bg-white text-blue-600' 
                        : !personnelData.length
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      2
                    </div>
                    <span>Personel Listesi</span>
                  </button>
                  {personnelData.length > 0 && (
                    <div className="w-8 h-0.5 bg-gray-300 ml-2"></div>
                  )}
                </div>

                {/* Step 3 - Planning */}
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveTab('planning')}
                    disabled={!personnelData.length}
                    className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium
                      ${activeTab === 'planning' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : !personnelData.length
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                          : generatedPlan
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${activeTab === 'planning' 
                        ? 'bg-white text-blue-600' 
                        : !personnelData.length
                          ? 'bg-gray-300 text-gray-500'
                          : generatedPlan
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {generatedPlan ? '✓' : '3'}
                    </div>
                    <span>Vardiya Planlama</span>
                  </button>
                  {generatedPlan && (
                    <div className="w-8 h-0.5 bg-green-400 ml-2"></div>
                  )}
                </div>

                {/* Step 4 - Display */}
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveTab('display')}
                    disabled={!generatedPlan}
                    className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium
                      ${activeTab === 'display' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : !generatedPlan
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${activeTab === 'display' 
                        ? 'bg-white text-blue-600' 
                        : !generatedPlan
                          ? 'bg-gray-300 text-gray-500'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      4
                    </div>
                    <span>Plan Görüntüle</span>
                  </button>
                  <div className="w-8 h-0.5 bg-gray-300 ml-2"></div>
                </div>

                {/* Step 5 - Analysis */}
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`
                      relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium
                      ${activeTab === 'analysis' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${activeTab === 'analysis' 
                        ? 'bg-white text-blue-600' 
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      5
                    </div>
                    <span>Performans Analizi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-fade-in">
            {activeTab === 'upload' && (
              <FileUpload 
                onDataLoaded={handleDataLoaded}
              />
            )}
            
            {activeTab === 'list' && (
              <PersonelList 
                personnelData={personnelData}
                vehicleData={vehicleData}
              />
            )}
            
            {activeTab === 'planning' && (
              <VardiyaPlanlama 
                personnelData={personnelData}
                vehicleData={vehicleData}
                onPlanGenerated={handlePlanGenerated}
              />
            )}
            
            {activeTab === 'display' && generatedPlan && (
              <PlanDisplay 
                plan={generatedPlan}
                onExport={handleExport}
              />
            )}
            
            {activeTab === 'analysis' && (
              <PerformanceAnalysis personnelData={personnelData} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="glass-card border-t border-slate-200/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-600 font-semibold">
                  Modern Personel Planlama Sistemi
                </p>
              </div>
              <div className="flex items-center justify-center gap-6 text-gray-400 text-sm">
                <span>© 2025 Personel Planlama Sistemi</span>
                <span>•</span>
                <span>Melih KOÇHAN</span>
                <span>•</span>
                <span>melihkochan.com</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App; 