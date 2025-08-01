import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTeamShifts } from '../../services/supabase';

const TeamShifts = () => {
  const [shiftData, setShiftData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [loading, setLoading] = useState(false);

  // Load data from database when month/year changes
  useEffect(() => {
    loadShiftData();
  }, [selectedMonth, selectedYear]);

  const loadShiftData = async () => {
    setLoading(true);
    try {
      let data;
      if (selectedMonth === 'all') {
        data = await getTeamShifts(selectedYear, null);
      } else {
        data = await getTeamShifts(selectedYear, selectedMonth);
      }
      
      if (data && data.length > 0) {
        const convertedData = data.map(item => ({
          id: item.date,
          date: new Date(item.date),
          dayName: item.day_name,
          nightShift: item.night_shift || '',
          morningShift: item.morning_shift || '',
          eveningShift: item.evening_shift || '',
          leaveShift: item.leave_shift || ''
        }));
        setShiftData(convertedData);
      } else {
        if (selectedMonth === 'all') {
          const allMonthsData = [];
          for (let month = 0; month < 12; month++) {
            const monthData = generateMonthData(selectedYear, month);
            allMonthsData.push(...monthData);
          }
          setShiftData(allMonthsData);
        } else {
          const initialData = generateMonthData(selectedYear, selectedMonth);
          setShiftData(initialData);
        }
      }
    } catch (error) {
      console.error('Error loading shift data:', error);
      if (selectedMonth === 'all') {
        const allMonthsData = [];
        for (let month = 0; month < 12; month++) {
          const monthData = generateMonthData(selectedYear, month);
          allMonthsData.push(...monthData);
        }
        setShiftData(allMonthsData);
      } else {
        const initialData = generateMonthData(selectedYear, selectedMonth);
        setShiftData(initialData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar data for the selected month
  const generateMonthData = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      
      monthData.push({
        id: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        date: date,
        dayName: dayNames[date.getDay()],
        nightShift: '',
        morningShift: '',
        eveningShift: '',
        leaveShift: ''
      });
    }

    return monthData;
  };

  const getShiftColor = (teamName) => {
    if (!teamName) return 'bg-gray-100 text-gray-800';
    
    switch (teamName) {
      case '1.Ekip': return 'bg-green-100 text-green-800';
      case '2.Ekip': return 'bg-blue-100 text-blue-800';
      case '3.Ekip': return 'bg-gray-100 text-gray-800';
      case '4.Ekip': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveShiftColor = (leaveShift) => {
    if (!leaveShift) return 'bg-gray-100 text-gray-800';
    
    // Apply team-specific colors for leave shifts
    switch (leaveShift) {
      case '1.Ekip': return 'bg-green-100 text-green-800';
      case '2.Ekip': return 'bg-blue-100 text-blue-800';
      case '3.Ekip': return 'bg-gray-100 text-gray-800';
      case '4.Ekip': return 'bg-orange-100 text-orange-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6 w-full px-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ekip Vardiyaları</h1>
            <p className="text-blue-100 text-sm mt-1">2025 Yılı Ekip Vardiya Planlaması</p>
          </div>
          <div className="bg-white/20 rounded-lg p-2">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Month/Year Navigation */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                if (selectedMonth === 'all') {
                  setSelectedMonth(11);
                } else if (selectedMonth === 0) {
                  setSelectedMonth(11);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-2">
              <select 
                value={selectedMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setSelectedMonth('all');
                  } else {
                    setSelectedMonth(parseInt(value));
                  }
                }}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">Tüm Aylar</option>
                <option value={0}>Ocak</option>
                <option value={1}>Şubat</option>
                <option value={2}>Mart</option>
                <option value={3}>Nisan</option>
                <option value={4}>Mayıs</option>
                <option value={5}>Haziran</option>
                <option value={6}>Temmuz</option>
                <option value={7}>Ağustos</option>
                <option value={8}>Eylül</option>
                <option value={9}>Ekim</option>
                <option value={10}>Kasım</option>
                <option value={11}>Aralık</option>
              </select>
              
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value={2025}>2025</option>
              </select>
            </div>
            
            <button 
              onClick={() => {
                if (selectedMonth === 'all') {
                  setSelectedMonth(0);
                } else if (selectedMonth === 11) {
                  setSelectedMonth(0);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>



      {/* Shift Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 text-sm">Veriler yükleniyor...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gün
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    24:00-08:00
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    08:00-16:00
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    16:00-24:00
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İzinli Vardiya
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shiftData.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                                                              <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                       <div>
                         <div>{shift.date.toLocaleDateString('tr-TR')}</div>
                         <div className="text-gray-500 text-xs">{shift.date.toLocaleDateString('tr-TR', { month: 'long' })}</div>
                       </div>
                     </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {shift.dayName}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {shift.nightShift ? (
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getShiftColor(shift.nightShift)}`}>
                          {shift.nightShift}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {shift.morningShift ? (
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getShiftColor(shift.morningShift)}`}>
                          {shift.morningShift}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {shift.eveningShift ? (
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getShiftColor(shift.eveningShift)}`}>
                          {shift.eveningShift}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {shift.leaveShift ? (
                        <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${getLeaveShiftColor(shift.leaveShift)}`}>
                          {shift.leaveShift}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamShifts; 