import React, { useState, useEffect } from 'react';
import { Package, Clock, Users, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const TimesheetTracking = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setLoading(false);
      // Mock data
      setTimesheets([
        {
          id: 1,
          employeeName: 'Ahmet Yılmaz',
          employeeId: 'EMP001',
          date: '2024-01-15',
          startTime: '08:00',
          endTime: '17:00',
          totalHours: 9,
          status: 'completed',
          department: 'Sevkiyat',
          notes: 'Normal vardiya'
        },
        {
          id: 2,
          employeeName: 'Fatma Demir',
          employeeId: 'EMP002',
          date: '2024-01-15',
          startTime: '14:00',
          endTime: '22:00',
          totalHours: 8,
          status: 'in-progress',
          department: 'Sevkiyat',
          notes: 'Öğle vardiyası'
        },
        {
          id: 3,
          employeeName: 'Mehmet Kaya',
          employeeId: 'EMP003',
          date: '2024-01-15',
          startTime: '22:00',
          endTime: '06:00',
          totalHours: 8,
          status: 'pending',
          department: 'Sevkiyat',
          notes: 'Gece vardiyası'
        }
      ]);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredTimesheets = timesheets.filter(timesheet => {
    if (filterStatus !== 'all' && timesheet.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const totalHours = filteredTimesheets.reduce((sum, timesheet) => sum + timesheet.totalHours, 0);
  const completedCount = filteredTimesheets.filter(t => t.status === 'completed').length;
  const inProgressCount = filteredTimesheets.filter(t => t.status === 'in-progress').length;
  const pendingCount = filteredTimesheets.filter(t => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Puantaj Takip</h1>
            <p className="text-purple-100 mt-1">Personel vardiya ve çalışma saatleri takibi</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <Package className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Tümü</option>
                <option value="completed">Tamamlanan</option>
                <option value="in-progress">Devam Eden</option>
                <option value="pending">Bekleyen</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Yeni Puantaj
            </button>
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Rapor İndir
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Saat</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Devam Eden</p>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="bg-yellow-100 rounded-lg p-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Timesheet List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Puantaj Listesi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başlangıç
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bitiş
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Saat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTimesheets.map((timesheet) => (
                <tr key={timesheet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{timesheet.employeeName}</div>
                      <div className="text-sm text-gray-500">{timesheet.employeeId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(timesheet.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timesheet.startTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timesheet.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {timesheet.totalHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(timesheet.status)}`}>
                      {getStatusIcon(timesheet.status)}
                      <span className="ml-1">
                        {timesheet.status === 'completed' && 'Tamamlandı'}
                        {timesheet.status === 'in-progress' && 'Devam Ediyor'}
                        {timesheet.status === 'pending' && 'Bekliyor'}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Düzenle</button>
                      <button className="text-red-600 hover:text-red-900">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Hızlı İşlemler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Toplu Puantaj</p>
                <p className="text-sm text-gray-500">Birden fazla personel için puantaj oluştur</p>
              </div>
            </div>
          </button>

          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Performans Raporu</p>
                <p className="text-sm text-gray-500">Personel performans analizi</p>
              </div>
            </div>
          </button>

          <button className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-2 mr-3">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Vardiya Planı</p>
                <p className="text-sm text-gray-500">Gelecek vardiya planlaması</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimesheetTracking; 