import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, User, Phone, Mail, MapPin, Calendar, Clock, Shield, Star, Award, TrendingUp } from 'lucide-react';

const TeamPersonnel = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');

  // Mock data for development
  const mockPersonnel = [
    {
      id: 1,
      name: 'Ahmet Yılmaz',
      team: '1.Ekip',
      position: 'Sürücü',
      phone: '+90 532 123 4567',
      email: 'ahmet.yilmaz@company.com',
      startDate: '2023-01-15',
      experience: '5 yıl',
      status: 'Aktif',
      performance: 'Yüksek'
    },
    {
      id: 2,
      name: 'Mehmet Demir',
      team: '2.Ekip',
      position: 'Yükleyici',
      phone: '+90 533 234 5678',
      email: 'mehmet.demir@company.com',
      startDate: '2022-08-20',
      experience: '3 yıl',
      status: 'Aktif',
      performance: 'Orta'
    },
    {
      id: 3,
      name: 'Fatma Kaya',
      team: '3.Ekip',
      position: 'Sürücü',
      phone: '+90 534 345 6789',
      email: 'fatma.kaya@company.com',
      startDate: '2024-03-10',
      experience: '1 yıl',
      status: 'Aktif',
      performance: 'Yüksek'
    },
    {
      id: 4,
      name: 'Ali Özkan',
      team: '4.Ekip',
      position: 'Yükleyici',
      phone: '+90 535 456 7890',
      email: 'ali.ozkan@company.com',
      startDate: '2021-11-05',
      experience: '7 yıl',
      status: 'Aktif',
      performance: 'Yüksek'
    }
  ];

  useEffect(() => {
    setPersonnel(mockPersonnel);
  }, []);

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeam === 'all' || person.team === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  const getTeamColor = (team) => {
    switch (team) {
      case '1.Ekip': return 'bg-green-100 text-green-800';
      case '2.Ekip': return 'bg-blue-100 text-blue-800';
      case '3.Ekip': return 'bg-gray-100 text-gray-800';
      case '4.Ekip': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'Yüksek': return 'bg-green-100 text-green-800';
      case 'Orta': return 'bg-yellow-100 text-yellow-800';
      case 'Düşük': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 w-full px-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ekip Personel Bilgileri</h1>
            <p className="text-purple-100 text-sm mt-1">Ekip Personel Yönetimi ve Takibi</p>
          </div>
          <div className="bg-white/20 rounded-lg p-2">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Personel ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tüm Ekipler</option>
              <option value="1.Ekip">1. Ekip</option>
              <option value="2.Ekip">2. Ekip</option>
              <option value="3.Ekip">3. Ekip</option>
              <option value="4.Ekip">4. Ekip</option>
            </select>
          </div>
        </div>
      </div>

      {/* Development Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Geliştirme Aşamasında</h3>
            <p className="text-xs text-yellow-700 mt-1">
              Bu sayfa şu anda geliştirme aşamasındadır. Personel bilgileri yönetimi yakında eklenecektir.
            </p>
          </div>
        </div>
      </div>

      {/* Personnel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPersonnel.map((person) => (
          <div key={person.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{person.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTeamColor(person.team)}`}>
                    {person.team}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {person.performance === 'Yüksek' && <Star className="w-4 h-4 text-yellow-500" />}
                {person.experience.includes('5') && <Award className="w-4 h-4 text-blue-500" />}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Shield className="w-3 h-3" />
                <span>{person.position}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{person.phone}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Mail className="w-3 h-3" />
                <span className="truncate">{person.email}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>Başlangıç: {new Date(person.startDate).toLocaleDateString('tr-TR')}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Clock className="w-3 h-3" />
                <span>Deneyim: {person.experience}</span>
              </div>
            </div>

            {/* Performance */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Performans:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceColor(person.performance)}`}>
                  {person.performance}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Personel</p>
              <p className="text-2xl font-bold text-gray-900">{personnel.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Yüksek Performans</p>
              <p className="text-2xl font-bold text-gray-900">
                {personnel.filter(p => p.performance === 'Yüksek').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Deneyimli</p>
              <p className="text-2xl font-bold text-gray-900">
                {personnel.filter(p => p.experience.includes('5') || p.experience.includes('7')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {personnel.filter(p => p.status === 'Aktif').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPersonnel; 