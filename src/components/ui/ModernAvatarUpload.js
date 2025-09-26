import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon, Crop, RotateCw } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ModernAvatarUpload = ({ 
  currentAvatar, 
  onUpload, 
  onCancel, 
  uploading = false,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  autoOpen = false // Modal açılır açılmaz dosya seçiciyi aç
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  // Auto-open dosya seçici - KAPALI
  // useEffect(() => {
  //   if (autoOpen && fileInputRef.current) {
  //     fileInputRef.current.click();
  //   }
  // }, [autoOpen]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const newErrors = [];
    
    // Dosya tipi kontrolü
    if (!acceptedTypes.includes(file.type)) {
      newErrors.push(`Desteklenmeyen dosya formatı. Sadece: ${acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}`);
    }
    
    // Dosya boyutu kontrolü
    if (file.size > maxSize) {
      newErrors.push(`Dosya boyutu çok büyük. Maksimum: ${formatFileSize(maxSize)}`);
    }
    
    // Dosya adı kontrolü
    if (file.name.length > 100) {
      newErrors.push('Dosya adı çok uzun. Maksimum 100 karakter.');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (validateFile(file)) {
      setSelectedFile(file);
      
      // Preview ve kırpma için imageSrc oluştur
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setImageSrc(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (croppedImageBlob && onUpload) {
      onUpload(croppedImageBlob);
    } else if (selectedFile && onUpload) {
      // Eğer kırpma yapılmadıysa orijinal dosyayı yükle
      onUpload(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setImageSrc(null);
    setCrop({ unit: '%', width: 90, aspect: 1 });
    setCompletedCrop(null);
    setCroppedImageBlob(null);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // onCancel fonksiyonunu çağırma - modal kapanmasın
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    // Otomatik olarak kare bir crop alanı ayarla
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const minDimension = Math.min(naturalWidth, naturalHeight);
    const initialCropSize = Math.min(90, (minDimension / Math.max(naturalWidth, naturalHeight)) * 100);
    setCrop({
      unit: '%',
      width: initialCropSize,
      aspect: 1,
      x: (100 - initialCropSize) / 2,
      y: (100 - initialCropSize) / 2,
    });
  };

  const makeClientCrop = async (crop) => {
    if (imgRef.current && crop.width && crop.height) {
      createCropPreview(imgRef.current, crop, selectedFile.name);
    }
  };

  const createCropPreview = async (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          setErrors(['Resim kırpılırken hata oluştu.']);
          resolve();
          return;
        }
        blob.name = fileName;
        setCroppedImageBlob(blob);
        setPreview(URL.createObjectURL(blob));
        resolve();
      }, 'image/png', 1);
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    }
    return <Upload className="w-6 h-6 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Mevcut Avatar */}
      {currentAvatar && !selectedFile && (
        <div className="text-center">
          <div className="relative inline-block">
            <img 
              src={currentAvatar} 
              alt="Mevcut Avatar" 
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Mevcut Avatar</p>
        </div>
      )}

      {/* Dosya Seçici */}
      {!selectedFile && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                Avatar yüklemek için tıklayın veya sürükleyin
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PNG, JPG, WEBP, GIF formatları desteklenir
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Maksimum: {formatFileSize(maxSize)}</span>
              <span>•</span>
              <span>Önerilen: 400x400px</span>
            </div>
          </div>
        </div>
      )}

      {/* Seçilen Dosya Preview */}
      {selectedFile && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="relative inline-block">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"
              />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          
          {/* Dosya Bilgileri */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getFileIcon(selectedFile.type)}
                <span className="font-medium text-gray-900 truncate max-w-48">
                  {selectedFile.name}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Tip: {selectedFile.type.split('/')[1].toUpperCase()}</span>
              <span>Boyut: {formatFileSize(selectedFile.size)}</span>
            </div>
          </div>
          
          {/* Kırpma Arayüzü */}
          {imageSrc && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                <Crop className="w-4 h-4" /> Resmi Kırp
              </h4>
              <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1} // Kare kırpma
                  minWidth={50}
                  minHeight={50}
                >
                  <img 
                    ref={imgRef} 
                    alt="Crop source" 
                    src={imageSrc} 
                    onLoad={onImageLoad} 
                    className="max-w-full h-auto" 
                  />
                </ReactCrop>
              </div>
              <button
                onClick={() => makeClientCrop(completedCrop)}
                disabled={!completedCrop?.width || !completedCrop?.height || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Crop className="w-4 h-4" />
                Kırp ve Önizle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hata Mesajları */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Dosya Yükleme Hatası</h4>
              <ul className="mt-1 text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Aksiyon Butonları */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
        >
          <X className="w-4 h-4" />
          <span>İptal</span>
        </button>
        
        {selectedFile && !errors.length && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Avatar Yükle</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ModernAvatarUpload;
