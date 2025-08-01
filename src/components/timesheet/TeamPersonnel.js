import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  FullscreenOutlined,
  CrownOutlined,
  SettingOutlined,
  ToolOutlined,
  CarOutlined,
  UserSwitchOutlined,
  SafetyOutlined,
  BuildOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { getTeamPersonnel, addTeamPersonnel, updateTeamPersonnel, deleteTeamPersonnel, getPersonnelFromPersonnelTable } from '../../services/supabase';

const { Title, Text } = Typography;
const { Option } = Select;

const TeamPersonnel = () => {
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [anadoluPersonnel, setAnadoluPersonnel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [form] = Form.useForm();

  // Konum seçenekleri ve sıralama öncelikleri
  const konumOptions = [
    'Vardiya Amiri',
    'Ekip Lideri',
    'Sistem Operatörü',
    'Sistem Operatör Yrd.',
    'Sevkiyat Sorumlusu',
    'Sevkiyat Veri Giriş Elemanı',
    'Makine Operatörü',
    'Sevkiyat Elemanı',
    'Sevkiyat Elemanı ( Load Audit)'
  ];

  const konumPriority = {
    'Vardiya Amiri': 1,
    'Ekip Lideri': 2,
    'Sistem Operatörü': 3,
    'Sistem Operatör Yrd.': 4,
    'Sevkiyat Sorumlusu': 5,
    'Sevkiyat Veri Giriş Elemanı': 6,
    'Makine Operatörü': 7,
    'Sevkiyat Elemanı': 8,
    'Sevkiyat Elemanı ( Load Audit)': 9
  };

  const ekipOptions = ['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamResult, anadoluResult] = await Promise.all([
        getTeamPersonnel(),
        getPersonnelFromPersonnelTable()
      ]);

      if (teamResult.success) {
        setTeamPersonnel(teamResult.data);
      }
      if (anadoluResult.success) {
        setAnadoluPersonnel(anadoluResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Veriler yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  // Özel sıralama fonksiyonu
  const sortPersonnel = (personnel) => {
    return personnel.sort((a, b) => {
      // Önce konum önceliğine göre sırala
      const priorityA = konumPriority[a.konum] || 999;
      const priorityB = konumPriority[b.konum] || 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Aynı konumda ise sicil_no'ya göre sırala
      const sicilComparison = parseInt(a.sicil_no) - parseInt(b.sicil_no);
      return sicilComparison;
    });
  };

  // Ekip bazında gruplandırılmış personel
  const groupedPersonnel = ekipOptions.reduce((acc, ekip) => {
    const teamMembers = teamPersonnel.filter(p => p.ekip_bilgisi === ekip);
    acc[ekip] = sortPersonnel(teamMembers);
    return acc;
  }, {});

  // Anadolu personellerini sırala
  const sortedAnadoluPersonnel = anadoluPersonnel.sort((a, b) => {
    // Önce pozisyona göre sırala
    const positionPriority = {
      'SEVKİYAT ELEMANI': 1,
      'ŞOFÖR': 2
    };
    
    const priorityA = positionPriority[a.position] || 999;
    const priorityB = positionPriority[b.position] || 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Aynı pozisyonda ise sicil numarasına göre sırala
    const sicilComparison = parseInt(a.employee_code) - parseInt(b.employee_code);
    return sicilComparison;
  });

  // Anadolu personelleri istatistikleri
  const anadoluStats = {
    total: sortedAnadoluPersonnel.length,
    sevkiyatElemani: sortedAnadoluPersonnel.filter(p => p.position === 'SEVKİYAT ELEMANI').length,
    sofor: sortedAnadoluPersonnel.filter(p => p.position === 'ŞOFÖR').length
  };

  const getTeamColor = (team) => {
    switch (team) {
      case '1.Ekip': return 'green';
      case '2.Ekip': return 'blue';
      case '3.Ekip': return 'default';
      case '4.Ekip': return 'orange';
      default: return 'default';
    }
  };

  // Pozisyon simgeleri
  const getPositionIcon = (position) => {
    switch (position) {
      case 'Vardiya Amiri': return <CrownOutlined style={{ fontSize: '10px', color: '#fa8c16' }} />;
      case 'Ekip Lideri': return <UserSwitchOutlined style={{ fontSize: '10px', color: '#52c41a' }} />;
      case 'Sistem Operatörü': return <SettingOutlined style={{ fontSize: '10px', color: '#1890ff' }} />;
      case 'Sistem Operatör Yrd.': return <SettingOutlined style={{ fontSize: '10px', color: '#722ed1' }} />;
      case 'Sevkiyat Sorumlusu': return <SafetyOutlined style={{ fontSize: '10px', color: '#eb2f96' }} />;
      case 'Sevkiyat Veri Giriş Elemanı': return <BuildOutlined style={{ fontSize: '10px', color: '#13c2c2' }} />;
      case 'Makine Operatörü': return <ToolOutlined style={{ fontSize: '10px', color: '#fa541c' }} />;
      case 'Sevkiyat Elemanı': return <CarOutlined style={{ fontSize: '10px', color: '#2f54eb' }} />;
      case 'Sevkiyat Elemanı ( Load Audit)': return <AuditOutlined style={{ fontSize: '10px', color: '#a0d911' }} />;
      default: return <UserOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />;
    }
  };

  const handleAddPersonnel = async (values) => {
    setLoading(true);
    try {
      const result = await addTeamPersonnel(values);
      if (result.success) {
        message.success('Personel başarıyla eklendi');
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        if (result.error && result.error.includes('duplicate key')) {
          message.error('Bu sicil numarası veya isim zaten mevcut! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else if (result.error && result.error.includes('unique constraint')) {
          message.error('Bu personel zaten sistemde kayıtlı! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else if (result.error && result.error.includes('violates')) {
          message.error('Bu personel zaten mevcut! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else {
          message.error('Personel eklenirken hata oluştu: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error adding personnel:', error);
      if (error.message && error.message.includes('duplicate')) {
        message.error('Bu personel zaten sistemde kayıtlı! Lütfen farklı bir sicil numarası veya isim kullanın.');
      } else {
        message.error('Personel eklenirken hata oluştu');
      }
    }
    setLoading(false);
  };

  const handleUpdatePersonnel = async (values) => {
    if (!editingPersonnel) return;

    setLoading(true);
    try {
      const result = await updateTeamPersonnel(editingPersonnel.id, values);
      if (result.success) {
        message.success('Personel başarıyla güncellendi');
        setEditingPersonnel(null);
        setShowModal(false);
        form.resetFields();
        loadData();
      } else {
        if (result.error && result.error.includes('duplicate key')) {
          message.error('Bu sicil numarası veya isim zaten mevcut! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else if (result.error && result.error.includes('unique constraint')) {
          message.error('Bu personel zaten sistemde kayıtlı! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else if (result.error && result.error.includes('violates')) {
          message.error('Bu personel zaten mevcut! Lütfen farklı bir sicil numarası veya isim kullanın.');
        } else {
          message.error('Personel güncellenirken hata oluştu: ' + result.error);
        }
      }
    } catch (error) {
      console.error('Error updating personnel:', error);
      if (error.message && error.message.includes('duplicate')) {
        message.error('Bu personel zaten sistemde kayıtlı! Lütfen farklı bir sicil numarası veya isim kullanın.');
      } else {
        message.error('Personel güncellenirken hata oluştu');
      }
    }
    setLoading(false);
  };

  const handleDeletePersonnel = async (id) => {
    try {
      const result = await deleteTeamPersonnel(id);
      if (result.success) {
        message.success('Personel başarıyla silindi');
        loadData();
      } else {
        message.error('Personel silinirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting personnel:', error);
      message.error('Personel silinirken hata oluştu');
    }
  };

  const startEdit = (person) => {
    setEditingPersonnel(person);
    form.setFieldsValue({
      sicil_no: person.sicil_no,
      adi_soyadi: person.adi_soyadi,
      konum: person.konum,
      ekip_bilgisi: person.ekip_bilgisi
    });
    setShowModal(true);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setEditingPersonnel(null);
    form.resetFields();
  };

  const handleTeamExpand = (team) => {
    setExpandedTeam(expandedTeam === team ? null : team);
  };

  const handleModalOk = () => {
    form.validateFields()
      .then(values => {
        if (!values.sicil_no || values.sicil_no.length !== 6 || !/^\d{6}$/.test(values.sicil_no)) {
          message.error('Sicil no 6 haneli sayı olmalıdır!');
          return;
        }
        
        if (!values.adi_soyadi || !/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(values.adi_soyadi)) {
          message.error('Adı soyadı sadece harf içerebilir!');
          return;
        }
        
        if (!values.konum) {
          message.error('Konum seçin!');
          return;
        }
        
        if (!values.ekip_bilgisi) {
          message.error('Ekip seçin!');
          return;
        }
        
        if (editingPersonnel) {
          handleUpdatePersonnel(values);
        } else {
          handleAddPersonnel(values);
        }
      })
      .catch(errorInfo => {
        console.log('Validation failed:', errorInfo);
        message.error('Lütfen tüm alanları doğru şekilde doldurun!');
      });
  };

     // Ekip tablosu için sütunlar
   const teamColumns = [
     {
       title: 'Sicil No',
       dataIndex: 'sicil_no',
       key: 'sicil_no',
       width: 65,
       render: (text) => <Text style={{ fontSize: '10px' }} strong>{text}</Text>
     },
     {
       title: 'Adı Soyadı',
       dataIndex: 'adi_soyadi',
       key: 'adi_soyadi',
       width: 110,
       render: (text) => <Text style={{ fontSize: '10px' }}>{text}</Text>
     },
           {
        title: 'Pozisyon',
        dataIndex: 'konum',
        key: 'konum',
        width: 130,
        render: (text) => <Text style={{ fontSize: '10px' }}>{text}</Text>
      },
     {
       title: 'İşlemler',
       key: 'actions',
       width: 50,
       render: (_, record) => (
         <Space size="small">
           <Button 
             type="text" 
             icon={<EditOutlined />} 
             onClick={() => startEdit(record)}
             size="small"
             style={{ fontSize: '9px' }}
           />
           <Button 
             type="text" 
             danger 
             icon={<DeleteOutlined />} 
             onClick={() => handleDeletePersonnel(record.id)}
             size="small"
             style={{ fontSize: '9px' }}
           />
         </Space>
       )
     }
   ];

     // Anadolu personel tablosu için sütunlar
   const anadoluColumns = [
     {
       title: 'Sicil No',
       dataIndex: 'employee_code',
       key: 'employee_code',
       width: 65,
       render: (text) => <Text style={{ fontSize: '10px' }} strong>{text}</Text>
     },
     {
       title: 'Adı Soyadı',
       dataIndex: 'full_name',
       key: 'full_name',
       width: 140,
       render: (text) => <Text style={{ fontSize: '10px' }}>{text}</Text>
     },
           {
        title: 'Pozisyon',
        dataIndex: 'position',
        key: 'position',
        width: 110,
        render: (text) => (
          <Tag 
            color={text === 'SEVKİYAT ELEMANI' ? 'blue' : 'green'} 
            style={{ fontSize: '9px' }}
          >
            {text}
          </Tag>
        )
      }
   ];

  return (
    <div style={{ 
      padding: '8px', 
      minHeight: '100vh',
      backgroundColor: 'white',
      position: 'relative',
      margin: 0,
      background: 'white',
      height: '100vh',
      overflow: 'auto'
    }}>
      {/* Header */}
      <Card 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          marginBottom: '8px'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ color: 'white', margin: 0, fontSize: '16px' }}>
              Ekip Personel Bilgileri
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
              Ekip Personel Yönetimi ve Takibi
            </Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowModal(true)}
              style={{ 
                background: 'rgba(255,255,255,0.25)', 
                border: '1px solid rgba(255,255,255,0.4)', 
                fontSize: '13px',
                fontWeight: '500',
                padding: '8px 16px',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              size="middle"
            >
              Personel Ekle
            </Button>
          </Col>
        </Row>
      </Card>

             {/* İstatistikler */}
       <Row gutter={8} style={{ marginBottom: '8px' }}>
         <Col span={4}>
           <Card size="small" style={{ 
             boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
             background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)',
             border: '1px solid #91d5ff'
           }}>
             <Statistic
               title={<span style={{ fontSize: '11px', fontWeight: '600', color: '#1890ff' }}>Toplam Ekip Personeli</span>}
               value={teamPersonnel.length}
               prefix={<UserOutlined style={{ fontSize: '14px', color: '#1890ff' }} />}
               valueStyle={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}
             />
           </Card>
         </Col>
         {ekipOptions.map(ekip => (
           <Col span={5} key={ekip}>
             <Card size="small" style={{ 
               boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
               background: getTeamColor(ekip) === 'green' ? 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' :
                          getTeamColor(ekip) === 'blue' ? 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' :
                          getTeamColor(ekip) === 'orange' ? 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' :
                          'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
               border: getTeamColor(ekip) === 'green' ? '1px solid #b7eb8f' :
                       getTeamColor(ekip) === 'blue' ? '1px solid #91d5ff' :
                       getTeamColor(ekip) === 'orange' ? '1px solid #ffd591' : '1px solid #d9d9d9'
             }}>
               <Statistic
                 title={<span style={{ fontSize: '11px', fontWeight: '600' }}>{ekip}</span>}
                 value={teamPersonnel.filter(p => p.ekip_bilgisi === ekip).length}
                 prefix={<TeamOutlined style={{ fontSize: '14px' }} />}
                 valueStyle={{ 
                   fontSize: '18px',
                   fontWeight: 'bold',
                   color: getTeamColor(ekip) === 'green' ? '#52c41a' : 
                          getTeamColor(ekip) === 'blue' ? '#1890ff' : 
                          getTeamColor(ekip) === 'orange' ? '#fa8c16' : '#8c8c8c' 
                 }}
               />
             </Card>
           </Col>
         ))}
       </Row>

      {/* Ana İçerik - Sol: Ekipler, Sağ: Anadolu */}
      <Row gutter={8}>
        {/* Sol taraf - Ekipler */}
        <Col span={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ekipOptions.map(ekip => (
              <Card 
                key={ekip}
                                 title={
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                     <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                       {ekip} ({groupedPersonnel[ekip]?.length || 0} kişi)
                     </span>
                     <Button
                       type="text"
                       icon={<FullscreenOutlined />}
                       onClick={() => handleTeamExpand(ekip)}
                       size="small"
                       style={{ 
                         fontSize: '9px',
                         color: getTeamColor(ekip) === 'green' ? '#52c41a' : 
                                getTeamColor(ekip) === 'blue' ? '#1890ff' : 
                                getTeamColor(ekip) === 'orange' ? '#fa8c16' : '#8c8c8c'
                       }}
                     />
                   </div>
                 }
                size="small"
                headStyle={{
                  backgroundColor: getTeamColor(ekip) === 'green' ? '#f6ffed' : 
                               getTeamColor(ekip) === 'blue' ? '#e6f7ff' : 
                               getTeamColor(ekip) === 'orange' ? '#fff7e6' : '#fafafa',
                  borderColor: getTeamColor(ekip) === 'green' ? '#b7eb8f' : 
                              getTeamColor(ekip) === 'blue' ? '#91d5ff' : 
                              getTeamColor(ekip) === 'orange' ? '#ffd591' : '#d9d9d9',
                  padding: '8px 12px'
                }}
                bodyStyle={{ padding: '8px' }}
              >
                                 <Table
                   columns={teamColumns}
                   dataSource={groupedPersonnel[ekip] || []}
                   rowKey="id"
                   pagination={false}
                   size="small"
                   style={{ fontSize: '10px' }}
                 />
              </Card>
            ))}
          </div>
        </Col>

        {/* Sağ taraf - Anadolu Personelleri */}
        <Col span={12}>
          <Card 
                         title={
               <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                 Anadolu Personelleri ({anadoluStats.total} kişi - Sevkiyat Elemanı: {anadoluStats.sevkiyatElemani}, Şoför: {anadoluStats.sofor})
               </span>
             }
            size="small"
            headStyle={{
              backgroundColor: '#f9f0ff',
              borderColor: '#d3adf7',
              padding: '8px 12px'
            }}
            bodyStyle={{ padding: '8px' }}
          >
                         <Table
               columns={anadoluColumns}
               dataSource={sortedAnadoluPersonnel}
               rowKey="id"
               pagination={false}
               size="small"
               style={{ fontSize: '10px' }}
             />
          </Card>
        </Col>
      </Row>

      {/* Modal */}
      <Modal
        title={
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1f2937',
            textAlign: 'center',
            padding: '8px 0'
          }}>
            {editingPersonnel ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
          </div>
        }
        open={showModal}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={450}
        style={{ top: 50 }}
        bodyStyle={{ padding: '24px' }}
        okText="Kaydet"
        cancelText="İptal"
        okButtonProps={{
          style: {
            background: '#1890ff',
            borderColor: '#1890ff',
            fontSize: '14px',
            fontWeight: '500',
            padding: '8px 20px',
            height: 'auto'
          }
        }}
        cancelButtonProps={{
          style: {
            fontSize: '14px',
            fontWeight: '500',
            padding: '8px 20px',
            height: 'auto'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          size="middle"
          style={{ marginTop: '8px' }}
        >
          <Form.Item
            name="sicil_no"
            label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Sicil No</span>}
            rules={[
              { required: true, message: 'Sicil no gerekli!' },
              { 
                pattern: /^\d{6}$/, 
                message: 'Sicil no 6 haneli sayı olmalıdır!' 
              }
            ]}
          >
            <Input 
              placeholder="6 haneli sicil numarası" 
              style={{ fontSize: '14px', padding: '8px 12px' }}
              size="middle"
              maxLength={6}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length > 6) {
                  value = value.slice(0, 6);
                }
                form.setFieldsValue({ sicil_no: value });
              }}
            />
          </Form.Item>

          <Form.Item
            name="adi_soyadi"
            label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Adı Soyadı</span>}
            rules={[
              { required: true, message: 'Adı soyadı gerekli!' },
              { 
                pattern: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 
                message: 'Adı soyadı sadece harf içerebilir!' 
              }
            ]}
          >
            <Input 
              placeholder="Adı soyadı" 
              style={{ fontSize: '14px', padding: '8px 12px' }}
              size="middle"
              onKeyPress={(e) => {
                if (!/[a-zA-ZğüşıöçĞÜŞİÖÇ\s]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '');
                form.setFieldsValue({ adi_soyadi: value });
              }}
            />
          </Form.Item>

          <Form.Item
            name="konum"
            label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Konum</span>}
            rules={[{ required: true, message: 'Konum seçin!' }]}
          >
            <Select 
              placeholder="Konum seçin" 
              style={{ fontSize: '14px' }}
              size="middle"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {konumOptions.map(konum => (
                <Option key={konum} value={konum}>{konum}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ekip_bilgisi"
            label={<span style={{ fontSize: '14px', fontWeight: '500' }}>Ekip</span>}
            rules={[{ required: true, message: 'Ekip seçin!' }]}
          >
            <Select 
              placeholder="Ekip seçin" 
              style={{ fontSize: '14px' }}
              size="middle"
            >
              {ekipOptions.map(ekip => (
                <Option key={ekip} value={ekip}>{ekip}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

             {/* Genişletilmiş Ekip Modal */}
       <Modal
         title={
           <div style={{ 
             fontSize: '16px', 
             fontWeight: '600', 
             color: getTeamColor(expandedTeam) === 'green' ? '#52c41a' : 
                    getTeamColor(expandedTeam) === 'blue' ? '#1890ff' : 
                    getTeamColor(expandedTeam) === 'orange' ? '#fa8c16' : '#1f2937',
             textAlign: 'center',
             padding: '6px 0'
           }}>
             {expandedTeam} - Detaylı Personel Listesi
           </div>
         }
                   open={!!expandedTeam}
          onCancel={() => setExpandedTeam(null)}
          footer={null}
          width={800}
          style={{ top: 20 }}
          bodyStyle={{ padding: '16px', height: '85vh' }}
       >
         {expandedTeam && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
               <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                 <Text style={{ fontSize: '14px', color: '#666' }}>
                   {expandedTeam} - Toplam {groupedPersonnel[expandedTeam]?.length || 0} Personel
                 </Text>
               </div>
               
               {/* Pozisyon Özet Tablosu */}
               <Card 
                 size="small" 
                 style={{ 
                   marginBottom: '8px',
                   background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                   border: '1px solid #dee2e6'
                 }}
                 bodyStyle={{ padding: '8px' }}
               >
                                 <div style={{ 
                   display: 'grid', 
                   gridTemplateColumns: 'repeat(4, 1fr)',
                   gap: '6px'
                 }}>
                  {konumOptions.map(konum => {
                    const count = groupedPersonnel[expandedTeam]?.filter(p => p.konum === konum).length || 0;
                    if (count === 0) return null;
                    
                    return (
                      <div key={konum} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 6px',
                        background: 'white',
                        borderRadius: '4px',
                        border: '1px solid #e9ecef',
                        fontSize: '9px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {getPositionIcon(konum)}
                          <span style={{ 
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            {konum}
                          </span>
                        </div>
                        <span style={{ 
                          fontWeight: 'bold',
                          color: getTeamColor(expandedTeam) === 'green' ? '#52c41a' : 
                                 getTeamColor(expandedTeam) === 'blue' ? '#1890ff' : 
                                 getTeamColor(expandedTeam) === 'orange' ? '#fa8c16' : '#8c8c8c',
                          fontSize: '10px'
                        }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
             
                            <div style={{ flex: 1, overflow: 'auto' }}>
                 <Table
                   columns={teamColumns}
                   dataSource={groupedPersonnel[expandedTeam] || []}
                   rowKey="id"
                   pagination={false}
                   size="small"
                   style={{ fontSize: '10px' }}
                 />
               </div>
           </div>
         )}
       </Modal>
    </div>
  );
};

export default TeamPersonnel; 