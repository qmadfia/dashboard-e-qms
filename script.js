// Google Sheets API Configuration - Multiple Sheets Support
const CONFIG = {
    // Replace with your actual Google Sheets API Key (should start with 'AIzaSy')
    API_KEY: 'AIzaSyDcEPxonfnZvY2QtsH_4-V4lIjuvmJfdHI',
    // Update dengan Spreadsheet ID yang Anda berikan
    SPREADSHEET_ID: '1BE8jzLCugRITVHA5d2AKsyflbZaGEvowv49fKsEv5kE',
    // Multiple sheets configuration
    SHEETS: {
        // Sheet untuk data inspection utama
        INSPECTION: {
            name: 'Database_Inspection',
            range: 'A:P' // Adjust sesuai jumlah kolom di sheet inspection
        },        // Sheet untuk data defects detail
        DEFECTS: {
            name: 'Database_Defect',
            range: 'A:I' // Updated untuk mengakomodasi kolom tambahan (styleNumber)
        }
    }
};

// ====================================
// VARIABEL GLOBAL
// ====================================

// Data arrays - Array untuk menyimpan data dari Google Sheets
let allData = [];        // Semua data mentah dari Google Sheets (master data)
let filteredData = [];   // Data yang sudah difilter berdasarkan kriteria user

// Chart instances - Instance Chart.js untuk visualisasi data
let fttTrendChart = null;           // Chart trend FTT Rate (line chart)
let topDefectsChart = null;         // Chart top defects (bar chart)
let gradeDistributionChart = null;  // Chart distribusi grade (doughnut chart)
let ncvsPerformanceChart = null;    // Chart performa NCVS station (bar chart)

// ====================================
// DOM ELEMENTS - Referensi ke elemen HTML
// ====================================

// Objek berisi cached references ke semua elemen HTML yang diperlukan
// Menggunakan cached references untuk meningkatkan performance
const elements = {
    // Sidebar dan navigasi
    sidebar: document.getElementById('sidebar'),                    // Panel sidebar kiri
    sidebarToggle: document.getElementById('sidebarToggle'),        // Tombol toggle sidebar
    mainContent: document.querySelector('.main-content'),          // Area konten utama
    
    // Loading dan status indicators
    loadingIndicator: document.getElementById('loadingIndicator'), // Indikator loading
    tableContainer: document.getElementById('tableContainer'),     // Container tabel
    noDataMessage: document.getElementById('noDataMessage'),       // Pesan jika tidak ada data
    
    // Tabel data
    tableBody: document.getElementById('tableBody'),               // Body tabel untuk menampilkan data
    tableInfo: document.getElementById('tableInfo'),               // Info jumlah data yang ditampilkan
    
    // Filter controls - Kontrol untuk memfilter data
    startDate: document.getElementById('startDate'),               // Input tanggal mulai
    endDate: document.getElementById('endDate'),                   // Input tanggal akhir
    modelFilter: document.getElementById('modelFilter'),           // Filter berdasarkan model
    auditorFilter: document.getElementById('auditorFilter'),       // Filter berdasarkan auditor
    ncvsFilter: document.getElementById('ncvsFilter'),             // Filter berdasarkan NCVS station
    styleFilter: document.getElementById('styleFilter'),           // Filter berdasarkan style
    applyFilter: document.getElementById('applyFilter'),           // Tombol apply filter
    resetFilter: document.getElementById('resetFilter'),           // Tombol reset filter
    
    // Statistics cards - Kartu statistik di dashboard
    fttRate: document.getElementById('fttRate'),                   // Display FTT Rate percentage
    reworkRate: document.getElementById('reworkRate'),             // Display Rework Rate percentage
    aGradeRate: document.getElementById('aGradeRate'),             // Display A-Grade Rate percentage
    avgDefects: document.getElementById('avgDefects'),             // Display rata-rata defects per piece
        // Trend indicators - Indikator trend (naik/turun) untuk statistik
    fttTrend: document.getElementById('fttTrend'),                 // Icon trend untuk FTT Rate
    reworkTrend: document.getElementById('reworkTrend'),           // Icon trend untuk Rework Rate
    aGradeTrend: document.getElementById('aGradeTrend'),           // Icon trend untuk A-Grade Rate
    defectTrend: document.getElementById('defectTrend'),           // Icon trend untuk Defect Rate
    
    // Chart controls
    chartTimeRange: document.getElementById('chartTimeRange')     // Selector untuk time range charts
};

// ====================================
// INISIALISASI DASHBOARD
// ====================================

/**
 * Event listener utama yang dijalankan setelah DOM selesai dimuat
 * 
 * Flow eksekusi:
 * 1. Inisialisasi pengaturan dasar dashboard
 * 2. Setup semua event listeners
 * 3. Inisialisasi charts (Chart.js)
 * 4. Validasi API key dan load data
 */
document.addEventListener('DOMContentLoaded', async function() {
    initializeDashboard();
    setupEventListeners();
    initializeCharts();
    
    // Check if we have a valid API key
    if (CONFIG.API_KEY && CONFIG.API_KEY !== 'YOUR_GOOGLE_SHEETS_API_KEY' && CONFIG.API_KEY.startsWith('AIzaSy')) {
        // Auto-verify sheet names first
        await verifySheetConfiguration();
        
        // Then load data
        loadDataFromGoogleSheets();
    } else {
        console.warn('Invalid or missing Google Sheets API key. Loading sample data instead.');
        loadSampleData();
    }
});

/**
 * Inisialisasi pengaturan dasar dashboard
 * 
 * Tugas:
 * - Set default date range (30 hari terakhir)
 * - Konfigurasi pengaturan awal lainnya
 */
function initializeDashboard() {
    // Set default date range (last 30 days) - Atur rentang tanggal default
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Format tanggal untuk input HTML date (YYYY-MM-DD)
    elements.endDate.value = today.toISOString().split('T')[0];
    elements.startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
}

/**
 * Setup semua event listeners untuk interaksi user
 * 
 * Event listeners yang didaftarkan:
 * - Sidebar toggle untuk responsive design
 * - Filter events untuk apply dan reset filter
 * - Chart time range selector untuk mengubah rentang waktu
 * - Mobile responsive handlers
 */
function setupEventListeners() {
    // Sidebar toggle - Event untuk membuka/menutup sidebar
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Filter events - Event untuk tombol filter
    elements.applyFilter.addEventListener('click', applyFilters);
    elements.resetFilter.addEventListener('click', resetFilters);
    
    // Chart time range selector - Event untuk mengubah rentang waktu chart
    if (elements.chartTimeRange) {
        elements.chartTimeRange.addEventListener('change', function() {
            filterDataByTimeRange(this.value);
        });
    }
    
    // Mobile responsive - Handler untuk responsive design
    handleResponsive();
    window.addEventListener('resize', handleResponsive);
}

/**
 * Toggle sidebar untuk mobile dan desktop
 * 
 * Behavior:
 * - Mobile (≤1024px): Show/hide sidebar dengan overlay
 * - Desktop (>1024px): Collapse/expand sidebar
 */
function toggleSidebar() {
    const isMobile = window.innerWidth <= 1024;
    
    if (isMobile) {
        // Mobile: Toggle open class dan tampilkan overlay
        elements.sidebar.classList.toggle('open');
        toggleOverlay();
    } else {
        // Desktop: Toggle collapsed class
        elements.sidebar.classList.toggle('collapsed');
        elements.mainContent.classList.toggle('expanded');
    }
}

/**
 * Toggle overlay untuk mobile navigation
 * 
 * Membuat overlay semi-transparan ketika sidebar terbuka di mobile
 * Overlay dapat diklik untuk menutup sidebar
 */
function toggleOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        // Buat overlay jika belum ada
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            // Klik overlay untuk tutup sidebar
            elements.sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
    overlay.classList.toggle('active');
}

/**
 * Handle responsive behavior berdasarkan ukuran layar
 * 
 * Auto-adjust layout:
 * - Mobile (≤1024px): Sidebar collapsed, main content expanded
 * - Desktop (>1024px): Reset ke layout normal, hapus overlay
 */
function handleResponsive() {
    const isMobile = window.innerWidth <= 1024;
    
    if (isMobile) {
        // Mobile: Paksa sidebar collapsed dan main content expanded
        elements.sidebar.classList.add('collapsed');
        elements.sidebar.classList.remove('open');
        elements.mainContent.classList.add('expanded');
    } else {
        // Desktop: Reset layout ke normal
        elements.sidebar.classList.remove('collapsed', 'open');
        elements.mainContent.classList.remove('expanded');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    }
}

// ====================================
// FUNGSI LOADING DATA
// ====================================

/**
 * Load data dari Google Sheets API dengan multi-sheet support
 * 
 * Flow eksekusi:
 * 1. Validasi format API key
 * 2. Load data dari multiple sheets secara parallel
 * 3. Process inspection data (sheet utama)
 * 4. Process defects data dan merge dengan inspection
 * 5. Call processData() untuk update UI
 * 
 * Error handling:
 * - Invalid API key → fallback ke sample data
 * - Sheet not found → log warning dan lanjut
 * - Network error → fallback ke sample data
 */
async function loadDataFromGoogleSheets() {
    try {
        showLoading(true);
        
        // Validasi format API key (harus dimulai dengan 'AIzaSy')
        if (!CONFIG.API_KEY || !CONFIG.API_KEY.startsWith('AIzaSy')) {
            throw new Error('Invalid API key format. Google Sheets API keys should start with "AIzaSy"');
        }
          console.log('Loading data from multiple sheets...');
        
        // Load data dari kedua sheets secara bersamaan dengan Promise.all untuk efficiency
        const [inspectionDataResponse, defectsDataResponse] = await Promise.all([
            loadSheetData(CONFIG.SHEETS.INSPECTION.name, CONFIG.SHEETS.INSPECTION.range),
            loadSheetData(CONFIG.SHEETS.DEFECTS.name, CONFIG.SHEETS.DEFECTS.range)
        ]);
        
        // Process data inspection utama (Database_Inspection sheet)
        if (inspectionDataResponse.values && inspectionDataResponse.values.length > 1) {
            allData = processInspectionSheetData(inspectionDataResponse.values);
            console.log('Inspection sheet data processed:', allData.length, 'records');
        } else {
            console.warn('No data found in Database_Inspection sheet');
            allData = [];
        }
        
        // Process data defects dan merge dengan data inspection
        if (defectsDataResponse.values && defectsDataResponse.values.length > 1) {
            const defectsData = processDefectsSheetData(defectsDataResponse.values);
            mergeDefectsWithInspectionData(defectsData);
            console.log('Defects data processed and merged');
        } else {
            console.warn('No data found in Database_Defect sheet');
        }
        
        // Jika berhasil load data, process dan update UI
        if (allData.length > 0) {
            processData();
            showSuccessMessage(`Successfully loaded ${allData.length} records from ${Object.keys(CONFIG.SHEETS).length} sheets`);
        } else {
            throw new Error('No data found in any sheet');
        }
          } catch (error) {
        // Error handling: Log error dan fallback ke sample data
        console.error('Error loading data from Google Sheets:', error);
        showErrorMessage(`Failed to load data: ${error.message}. Loading sample data instead.`);
        loadSampleData();
    }
}

/**
 * Helper function untuk load data dari sheet spesifik
 * 
 * Parameters:
 * - sheetName: Nama sheet (contoh: 'Database_Inspection')
 * - range: Range kolom (contoh: 'A:P')
 * 
 * Returns: Response object dari Google Sheets API
 * 
 * Error handling:
 * - 403: API key invalid atau akses ditolak
 * - 404: Sheet tidak ditemukan
 * - Other: HTTP error lainnya
 */
async function loadSheetData(sheetName, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}!${range}?key=${CONFIG.API_KEY}`;
    console.log(`Fetching data from sheet: ${sheetName}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error loading sheet ${sheetName}:`, response.status, errorText);
        
        if (response.status === 403) {
            throw new Error(`API key is invalid or access denied for sheet: ${sheetName}`);
        } else if (response.status === 404) {
            throw new Error(`Sheet "${sheetName}" not found or not accessible`);
        } else {
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }    }
    
    const data = await response.json();
    console.log(`Raw data from ${sheetName}:`, data);
    return data;
}

// ====================================
// FUNGSI PROCESSING DATA
// ====================================

/**
 * Process data dari Database_Inspection sheet
 * 
 * Fungsi ini mengubah data mentah dari Google Sheets menjadi format
 * yang dapat digunakan oleh dashboard.
 * 
 * Mapping kolom (sesuaikan dengan struktur sheet Anda):
 * - Column 0: Timestamp
 * - Column 1: Auditor
 * - Column 2: NCVS Station
 * - Column 3: Model
 * - Column 4: Style Number
 * - Column 5: Qty Inspect
 * - Column 6: Qty Sample Set * - Column 7: FTT Rate (already as percentage)
 * - Column 8: Rework Rate (already as percentage)
 * - Column 9-12: A, R, B, C Grade counts
 * - Column 13-15: Rework Left, Right, Pairs
 */
function processInspectionSheetData(rows) {
    console.log('🔧 Processing inspection data with smart format detection...');
    
    // Skip header row dan process data
    const dataRows = rows.slice(1);
    
    return dataRows.map((row, index) => {
        // Map kolom berdasarkan struktur Database_Inspection sheet
        const timestamp = row[0] || '';
        const date = extractDateFromTimestamp(timestamp);
        
        // 🎯 SMART FORMAT DETECTION for FTT and Rework rates
        // This prevents the 3769.6% extreme value issue
        let fttRateValue = parseFloat(row[7]) || 0;
        let reworkRateValue = parseFloat(row[8]) || 0;
        
        let processedFttRate, processedReworkRate;
        
        // Smart format detection logic
        if (fttRateValue < 1 && fttRateValue > 0) {
            // Decimal format (0.37696) - convert to percentage
            processedFttRate = fttRateValue * 100;
            console.log(`FTT: Decimal detected ${fttRateValue} -> ${processedFttRate.toFixed(1)}%`);
        } else if (fttRateValue >= 1 && fttRateValue <= 100) {
            // Already percentage format (37.696) - keep as is
            processedFttRate = fttRateValue;
            console.log(`FTT: Percentage detected ${fttRateValue}%`);
        } else if (fttRateValue > 100) {
            // Extreme value - likely double conversion, correct it
            processedFttRate = fttRateValue / 100;
            console.warn(`FTT: Extreme value detected ${fttRateValue} -> corrected to ${processedFttRate.toFixed(1)}%`);
        } else {
            // Zero or invalid value
            processedFttRate = 0;
        }
        
        // Same logic for rework rate
        if (reworkRateValue < 1 && reworkRateValue > 0) {
            processedReworkRate = reworkRateValue * 100;
            console.log(`Rework: Decimal detected ${reworkRateValue} -> ${processedReworkRate.toFixed(1)}%`);
        } else if (reworkRateValue >= 1 && reworkRateValue <= 100) {
            processedReworkRate = reworkRateValue;
            console.log(`Rework: Percentage detected ${reworkRateValue}%`);
        } else if (reworkRateValue > 100) {
            processedReworkRate = reworkRateValue / 100;
            console.warn(`Rework: Extreme value detected ${reworkRateValue} -> corrected to ${processedReworkRate.toFixed(1)}%`);
        } else {
            processedReworkRate = 0;
        }
        
        return {
            id: index + 1,
            timestamp: timestamp,
            date: date,
            auditor: row[1] || '',
            ncvsStation: row[2] || '',
            model: row[3] || '',
            styleNumber: row[4] || '',
            qtyInspect: parseInt(row[5]) || 0,
            qtySampleSet: parseInt(row[6]) || 0,
            fttRate: Math.max(0, Math.min(100, processedFttRate)), // Clamp to 0-100%
            reworkRate: Math.max(0, Math.min(100, processedReworkRate)), // Clamp to 0-100%
            aGrade: parseInt(row[9]) || 0,
            rGrade: parseInt(row[10]) || 0,
            bGrade: parseInt(row[11]) || 0,
            cGrade: parseInt(row[12]) || 0,
            reworkLeft: parseInt(row[13]) || 0,
            reworkRight: parseInt(row[14]) || 0,
            reworkPairs: parseInt(row[15]) || 0,
            
            // Derived fields
            grade: determineOverallGrade(row[9], row[10], row[11], row[12]),
            defects: [], // Will be populated from defects sheet
            totalDefects: 0, // Will be calculated after merging defects
            
            // Legacy fields untuk kompatibilitas dengan existing code
            station: row[2] || '',
            style: row[4] || '',
            inspector: row[1] || '',
            shift: 'Day', // Default value, adjust jika ada kolom shift
            notes: '' // Default value, adjust jika ada kolom notes
        };
    });
}

/**
 * Process data dari Database_Defect sheet dengan mapping kolom yang sesuai
 * 
 * Struktur kolom Database_Defect sheet (A-I):
 * - Column 0 (A): Timestamp - waktu pencatatan defect
 * - Column 1 (B): Defect Type - jenis defect (Stitch, Color, etc.)
 * - Column 2 (C): Position - posisi defect (Left/Right/Both) 
 * - Column 3 (D): Severity - tingkat severity (Critical/Major/Minor)
 * - Column 4 (E): Count - jumlah defect yang ditemukan
 * - Column 5 (F): Description - deskripsi detail defect
 * - Column 6 (G): Auditor - nama auditor yang mencatat defect
 * - Column 7 (H): Style Number - nomor style untuk composite key matching
 * - Column 8 (I): Correction Action - tindakan koreksi yang dilakukan
 * 
 * @param {Array} rows - Raw data rows dari Google Sheets
 * @returns {Array} - Array defects data yang sudah diproses
 */
function processDefectsSheetData(rows) {
    // Skip header row and process defects data
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => ({
        timestamp: row[0] || '',
        defectType: row[1] || '',
        position: row[2] || '', // Left/Right/Both
        severity: row[3] || '', // Critical/Major/Minor
        count: parseInt(row[4]) || 1,
        description: row[5] || '',
        auditor: row[6] || '',  // Untuk composite key matching
        styleNumber: row[7] || '',  // Untuk composite key matching
        correctionAction: row[8] || ''  // Tindakan koreksi
    }));
}

// ========================================================================
// FUNGSI PENGGABUNGAN DATA DEFECT DENGAN DATA INSPEKSI - COMPOSITE KEY
// ========================================================================

/**
 * Menggabungkan data defect dengan data inspeksi berdasarkan composite key
 * 
 * IMPROVEMENT: Menggunakan composite key (timestamp + styleNumber + auditor)
 * untuk pencocokan yang lebih akurat dibandingkan timestamp-only matching.
 * 
 * Keuntungan composite key:
 * - Menghindari false positive matching pada data dengan timestamp sama
 * - Memastikan defect terhubung dengan inspeksi yang tepat
 * - Mendukung multiple auditor dan style pada waktu yang sama
 * - Meningkatkan akurasi data untuk analisis quality
 * 
 * Proses:
 * 1. Mengelompokkan defect berdasarkan composite key untuk pencocokan yang akurat
 * 2. Menggabungkan defect ke dalam data inspeksi yang relevan
 * 3. Menghitung total defect per item inspeksi
 * 4. Inisialisasi defects kosong untuk item tanpa defect
 * 
 * @param {Array} defectsData - Array data defect dari Google Sheets
 * @returns {void} - Memodifikasi allData secara langsung
 *//**
 * Menggabungkan data defect dengan data inspeksi berdasarkan composite key
 * 
 * IMPROVEMENT: Menggunakan composite key (timestamp + styleNumber + auditor)
 * untuk pencocokan yang lebih akurat dibandingkan timestamp-only matching.
 * 
 * Keuntungan composite key:
 * - Menghindari false positive matching pada data dengan timestamp sama
 * - Memastikan defect terhubung dengan inspeksi yang tepat
 * - Mendukung multiple auditor dan style pada waktu yang sama
 * - Meningkatkan akurasi data untuk analisis quality
 * 
 * Proses:
 * 1. Mengelompokkan defect berdasarkan composite key untuk pencocokan yang akurat
 * 2. Menggabungkan defect ke dalam data inspeksi yang relevan
 * 3. Menghitung total defect per item inspeksi
 * 4. Inisialisasi defects kosong untuk item tanpa defect
 * 
 * @param {Array} defectsData - Array data defect dari Google Sheets
 * @returns {void} - Memodifikasi allData secara langsung
 */
function mergeDefectsWithInspectionData(defectsData) {
    // Mengelompokkan defect berdasarkan composite key untuk pencocokan yang akurat
    const defectsByCompositeKey = {};
    
    defectsData.forEach(defect => {
        // Membuat composite key dari timestamp + styleNumber + auditor
        const compositeKey = `${defect.timestamp}_${defect.styleNumber}_${defect.auditor}`;
        
        if (!defectsByCompositeKey[compositeKey]) {
            defectsByCompositeKey[compositeKey] = [];
        }
        
        // Menyimpan detail defect dalam format yang sesuai untuk dashboard
        defectsByCompositeKey[compositeKey].push({
            type: defect.defectType,
            position: defect.position,
            severity: defect.severity,
            count: defect.count,
            description: defect.description
        });
    });
    
    // Menggabungkan data defect ke dalam data inspeksi utama
    allData.forEach(item => {
        // Membuat composite key yang sama untuk item inspeksi
        const compositeKey = `${item.timestamp}_${item.styleNumber}_${item.auditor}`;
        
        if (defectsByCompositeKey[compositeKey]) {
            // Menambahkan detail defect ke item inspeksi
            item.defects = defectsByCompositeKey[compositeKey];
            // Menghitung total jumlah defect untuk item ini
            item.totalDefects = defectsByCompositeKey[compositeKey].reduce((sum, defect) => sum + defect.count, 0);
        } else {
            // Jika tidak ada defect untuk item ini, inisialisasi array kosong
            item.defects = [];
            item.totalDefects = 0;
        }
    });
    
    console.log('Defects merged using composite key. Total merged records:', 
        allData.filter(item => item.defects && item.defects.length > 0).length
    );
    console.log('Sample data with defects:', 
        allData.filter(item => item.defects && item.defects.length > 0).slice(0, 3)
    );
}

// ========================================================================
// FUNGSI HELPER UNTUK EKSTRAKSI DAN KONVERSI DATA
// ========================================================================

/**
 * Mengekstrak tanggal dari timestamp dengan penanganan error
 * 
 * Fungsi ini memproses berbagai format timestamp dan mengonversinya
 * menjadi format tanggal standar (YYYY-MM-DD) untuk konsistensi data
 * 
 * @param {string} timestamp - Timestamp dalam berbagai format
 * @returns {string} - Tanggal dalam format YYYY-MM-DD
 */
function extractDateFromTimestamp(timestamp) {
    // Jika timestamp kosong, gunakan tanggal hari ini
    if (!timestamp) return new Date().toISOString().split('T')[0];
    
    try {
        // Mencoba mengonversi timestamp ke objek Date
        const date = new Date(timestamp);
        // Mengembalikan tanggal dalam format ISO (YYYY-MM-DD)
        return date.toISOString().split('T')[0];
    } catch (error) {
        // Jika format timestamp tidak valid, catat peringatan dan gunakan tanggal hari ini
        console.warn('Invalid timestamp format:', timestamp);
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Menentukan grade keseluruhan berdasarkan grade individual per kategori
 * 
 * Logika prioritas grade:
 * - C (Critical): Jika ada grade C, overall menjadi C
 * - B (Below): Jika ada grade B (tanpa C), overall menjadi B  
 * - R (Reject): Jika ada grade R (tanpa B/C), overall menjadi R
 * - A (Accept): Jika ada grade A (tanpa B/C/R), overall menjadi A
 * - NG (No Good): Default jika tidak ada grade yang valid
 * 
 * @param {string|number} aGrade - Grade untuk kategori A
 * @param {string|number} rGrade - Grade untuk kategori R
 * @param {string|number} bGrade - Grade untuk kategori B
 * @param {string|number} cGrade - Grade untuk kategori C
 * @returns {string} - Grade keseluruhan ('A', 'B', 'C', 'R', atau 'NG')
 */
function determineOverallGrade(aGrade, rGrade, bGrade, cGrade) {
    // Konversi input ke integer, default 0 jika tidak valid
    const a = parseInt(aGrade) || 0;
    const r = parseInt(rGrade) || 0;
    const b = parseInt(bGrade) || 0;
    const c = parseInt(cGrade) || 0;
    
    // Menentukan grade berdasarkan prioritas (C > B > R > A)
    if (c > 0) return 'C';  // Critical - prioritas tertinggi
    if (b > 0) return 'B';  // Below standard
    if (r > 0) return 'R';  // Reject
    if (a > 0) return 'A';  // Accept - grade terbaik
    return 'NG';            // No Good - default jika tidak ada grade valid
}

// Function to verify sheet configuration
async function verifySheetConfiguration() {
    try {
        console.log('Verifying sheet configuration...');
        const availableSheets = await getAvailableSheets();
        
        if (availableSheets.length === 0) {
            console.warn('No sheets found in spreadsheet');
            return false;
        }
        
        // Check if configured sheets exist
        const inspectionExists = availableSheets.some(sheet => sheet.title === CONFIG.SHEETS.INSPECTION.name);
        const defectsExists = availableSheets.some(sheet => sheet.title === CONFIG.SHEETS.DEFECTS.name);
        
        console.log('Sheet verification:', {
            'Database_Inspection': inspectionExists,
            'Database_Defect': defectsExists,
            'Available sheets': availableSheets.map(s => s.title)
        });
        
        if (!inspectionExists) {
            console.warn(`Sheet "${CONFIG.SHEETS.INSPECTION.name}" not found. Available sheets:`, 
                availableSheets.map(s => s.title));
        }
        
        if (!defectsExists) {
            console.warn(`Sheet "${CONFIG.SHEETS.DEFECTS.name}" not found. Available sheets:`, 
                availableSheets.map(s => s.title));
        }
        
        return inspectionExists && defectsExists;
    } catch (error) {
        console.error('Error verifying sheet configuration:', error);
        return false;
    }
}

// Utility function to get available sheets from spreadsheet
async function getAvailableSheets() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to get spreadsheet info: ${response.status}`);
        }
        
        const data = await response.json();
        const sheets = data.sheets.map(sheet => ({
            id: sheet.properties.sheetId,
            title: sheet.properties.title,
            index: sheet.properties.index
        }));
        
        console.log('Available sheets:', sheets);
        return sheets;
    } catch (error) {
        console.error('Error getting available sheets:', error);
        return [];
    }
}

// ========================================================================
// FUNGSI SAMPLE DATA UNTUK DEMO DAN TESTING
// ========================================================================

/**
 * Load sample data untuk keperluan demo dan testing
 * 
 * Fungsi ini digunakan ketika:
 * - API key Google Sheets tidak valid atau tidak tersedia
 * - Koneksi ke Google Sheets gagal
 * - Mode demo/testing untuk development
 * 
 * Menyediakan delay simulasi untuk meniru loading dari API
 */
function loadSampleData() {
    showLoading(true);
    
    // Simulasi delay API untuk UX yang realistis (1.5 detik)
    setTimeout(() => {
        allData = generateQMSSampleData();
        processData();
    }, 1500);
}

/**
 * Generate sample data QMS untuk demo dashboard
 * 
 * Membuat 100 record sample dengan data yang realistis mencakup:
 * - Berbagai model dan style produk
 * - Multiple auditor dan NCVS station
 * - Distribusi grade yang realistis
 * - Random defects dengan berbagai jenis dan severity
 * - FTT dan rework rate yang bervariasi
 * - Data tersebar dalam 90 hari terakhir
 * 
 * @returns {Array} - Array sample data dengan struktur lengkap QMS
 */
function generateQMSSampleData() {
    // Master data untuk random generation
    const models = ['Model A', 'Model B', 'Model C', 'Model D', 'Model E'];
    const auditors = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Lisa Wong', 'David Brown'];
    const ncvsStations = ['NCVS-01', 'NCVS-02', 'NCVS-03', 'NCVS-04', 'NCVS-05'];
    const styleNumbers = ['ST-001', 'ST-002', 'ST-003', 'ST-004', 'ST-005'];
    const defectTypes = ['Stitch', 'Measurement', 'Color', 'Thread', 'Pattern', 'Fabric', 'Button', 'Zipper'];
    const grades = ['A', 'B', 'C', 'D', 'NG'];
    const sampleData = [];
      // Generate 100 sample records dengan data realistis
    for (let i = 0; i < 100; i++) {
        // Random date dalam 90 hari terakhir
        const randomDate = new Date();
        randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 90));
        
        // Generate timestamp untuk composite key (format ISO string)
        const timestamp = randomDate.toISOString();
        
        // Generate metrics yang realistis
        const qtyInspect = Math.floor(Math.random() * 50) + 10;  // 10-60 pieces
        const defectCount = Math.floor(Math.random() * 5);       // 0-4 defects
        const fttRate = Math.random() * 100;                     // 0-100%
        const reworkRate = Math.random() * 15;                   // 0-15%
        const grade = grades[Math.floor(Math.random() * grades.length)];
        
        // Select consistent values untuk composite key
        const selectedAuditor = auditors[Math.floor(Math.random() * auditors.length)];
        const selectedStyle = styleNumbers[Math.floor(Math.random() * styleNumbers.length)];
        
        // Generate array defects dengan detail
        const defects = [];
        for (let j = 0; j < defectCount; j++) {
            defects.push({
                type: defectTypes[Math.floor(Math.random() * defectTypes.length)],
                severity: ['Critical', 'Major', 'Minor'][Math.floor(Math.random() * 3)],
                count: Math.floor(Math.random() * 3) + 1  // 1-3 count per defect
            });
        }
        
        // Struktur data lengkap sesuai dengan format dashboard
        sampleData.push({
            id: i + 1,
            timestamp: timestamp,  // Added untuk composite key
            date: randomDate.toISOString().split('T')[0],
            auditor: selectedAuditor,  // Consistent dengan composite key
            ncvsStation: ncvsStations[Math.floor(Math.random() * ncvsStations.length)],            model: models[Math.floor(Math.random() * models.length)],
            styleNumber: selectedStyle,  // Consistent dengan composite key
            qtyInspect: qtyInspect,
            fttRate: parseFloat(fttRate.toFixed(1)),
            reworkRate: parseFloat(reworkRate.toFixed(1)),
            grade: grade,
            defects: defects,
            totalDefects: defects.reduce((sum, defect) => sum + defect.count, 0)
        });
    }
    
    // Sort berdasarkan tanggal terbaru untuk display yang lebih baik
    return sampleData.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Memproses data setelah loading selesai
 * 
 * Flow processing:
 * 1. Copy allData ke filteredData untuk state awal
 * 2. Populate filter options berdasarkan data yang tersedia
 * 3. Update statistik dashboard
 * 4. Update tabel data
 * 5. Update semua charts
 * 6. Hide loading indicator
 */
function processData() {
    filteredData = [...allData];  // Initialize filtered data dengan semua data
    populateFilterOptions();      // Isi dropdown filter
    updateStats();               // Update kartu statistik
    updateTable();              // Update tabel data
    updateAllCharts();          // Update semua chart
    showLoading(false);         // Sembunyikan loading indicator
}

// ========================================================================
// FUNGSI FILTER DAN DROPDOWN POPULATION
// ========================================================================

/**
 * Mengisi opsi dropdown filter berdasarkan data yang tersedia
 * 
 * Fungsi ini mengekstrak nilai unik dari allData untuk setiap kategori
 * dan mengisi dropdown filter dengan opsi yang tersedia:
 * - Model filter: Semua model produk yang ada
 * - Auditor filter: Semua auditor yang ada
 * - NCVS filter: Semua NCVS station yang ada
 * - Style filter: Semua style number yang ada
 * 
 * Setiap dropdown dimulai dengan opsi "All" untuk menampilkan semua data
 */
function populateFilterOptions() {
    // Populate model filter - Isi dropdown filter model
    const models = [...new Set(allData.map(item => item.model))].sort();
    elements.modelFilter.innerHTML = '<option value="">All Models</option>';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        elements.modelFilter.appendChild(option);
    });
    
    // Populate auditor filter - Isi dropdown filter auditor
    const auditors = [...new Set(allData.map(item => item.auditor))].sort();
    elements.auditorFilter.innerHTML = '<option value="">All Auditors</option>';
    auditors.forEach(auditor => {
        const option = document.createElement('option');
        option.value = auditor;
        option.textContent = auditor;
        elements.auditorFilter.appendChild(option);
    });
    
    // Populate NCVS filter - Isi dropdown filter NCVS station
    const ncvsStations = [...new Set(allData.map(item => item.ncvsStation))].sort();
    elements.ncvsFilter.innerHTML = '<option value="">All NCVS</option>';
    ncvsStations.forEach(ncvs => {
        const option = document.createElement('option');
        option.value = ncvs;
        option.textContent = ncvs;
        elements.ncvsFilter.appendChild(option);
    });
    
    // Populate style filter - Isi dropdown filter style number
    const styles = [...new Set(allData.map(item => item.styleNumber))].sort();
    elements.styleFilter.innerHTML = '<option value="">All Styles</option>';
    styles.forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style;
        elements.styleFilter.appendChild(option);
    });
}

/**
 * Menerapkan filter berdasarkan kriteria yang dipilih user
 * 
 * Proses filtering:
 * 1. Ambil nilai dari semua filter control
 * 2. Filter allData berdasarkan kriteria yang dipilih
 * 3. Update filteredData dengan hasil filter
 * 4. Refresh semua komponen UI (stats, table, charts)
 * 5. Tambahkan animasi fade-in untuk feedback visual
 * 
 * Filter yang didukung:
 * - Date range: Filter berdasarkan rentang tanggal
 * - Model: Filter berdasarkan model produk
 * - Auditor: Filter berdasarkan auditor
 * - NCVS Station: Filter berdasarkan NCVS station
 * - Style: Filter berdasarkan style number
 */
function applyFilters() {
    // Ambil nilai dari semua filter control
    const startDate = elements.startDate.value;
    const endDate = elements.endDate.value;
    const selectedModel = elements.modelFilter.value;
    const selectedAuditor = elements.auditorFilter.value;
    const selectedNcvs = elements.ncvsFilter.value;
    const selectedStyle = elements.styleFilter.value;
    
    // Filter allData berdasarkan kriteria yang dipilih
    filteredData = allData.filter(item => {
        const itemDate = new Date(item.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        // Date filter - Filter berdasarkan rentang tanggal
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        
        // Model filter - Filter berdasarkan model produk
        if (selectedModel && item.model !== selectedModel) return false;
        
        // Auditor filter - Filter berdasarkan auditor
        if (selectedAuditor && item.auditor !== selectedAuditor) return false;
        
        // NCVS filter - Filter berdasarkan NCVS station
        if (selectedNcvs && item.ncvsStation !== selectedNcvs) return false;
        
        // Style filter - Filter berdasarkan style number
        if (selectedStyle && item.styleNumber !== selectedStyle) return false;
        
        return true;  // Item lolos semua filter
    });
    
    // Update semua komponen UI dengan data yang sudah difilter
    updateStats();      // Update statistik
    updateTable();      // Update tabel
    updateAllCharts();  // Update charts
    
    // Tambahkan animasi fade-in untuk feedback visual
    elements.tableContainer.classList.add('fade-in');
    setTimeout(() => elements.tableContainer.classList.remove('fade-in'), 500);
}

/**
 * Reset semua filter ke kondisi awal (default)
 * 
 * Proses reset:
 * 1. Clear semua input filter
 * 2. Reset filteredData ke allData (tampilkan semua data)
 * 3. Update semua komponen UI
 * 
 * Berguna untuk:
 * - Kembali ke view semua data
 * - Clear filter yang kompleks dengan satu klik
 * - Reset state filter untuk analisis ulang
 */
function resetFilters() {
    // Clear semua filter input
    elements.startDate.value = '';
    elements.endDate.value = '';
    elements.modelFilter.value = '';
    elements.auditorFilter.value = '';
    elements.ncvsFilter.value = '';
    elements.styleFilter.value = '';
    
    // Reset filteredData ke semua data
    filteredData = [...allData];
    
    // Update semua komponen UI
    updateStats();      // Update statistik
    updateTable();      // Update tabel
    updateAllCharts();  // Update charts
}

// ========================================
// 📊 COMPREHENSIVE DASHBOARD CALCULATION SYSTEM
// ========================================
// Based on script_referenceAI.js - Correct calculation patterns
// Separated calculation functions for different dashboard components

/**
 * Calculate statistics for the main dashboard cards
 * Based on reference: Direct calculation from raw data
 * @param {Array} rawInspectionData - Raw inspection records from internal calculation
 * @returns {Object} Statistics for cards display
 */
function calculateStatsForCards(rawInspectionData) {
    if (!rawInspectionData || rawInspectionData.length === 0) {
        return {
            fttRate: 0,
            reworkRate: 0,
            aGradeRate: 0,
            avgDefects: 0
        };
    }

    // FTT Rate Calculation (Reference pattern)
    let totalInspected = 0;
    let totalRGrade = 0, totalBGrade = 0, totalCGrade = 0, totalAGrade = 0;
    let totalDefects = 0;
    let totalReworkLeft = 0, totalReworkRight = 0, totalReworkPairs = 0;

    rawInspectionData.forEach(record => {
        totalInspected += record.qtyInspect || 0;
        totalAGrade += record.aGrade || 0;
        totalRGrade += record.rGrade || 0;
        totalBGrade += record.bGrade || 0;
        totalCGrade += record.cGrade || 0;
        totalDefects += record.totalDefects || 0;
        totalReworkLeft += record.reworkLeft || 0;
        totalReworkRight += record.reworkRight || 0;
        totalReworkPairs += record.reworkPairs || 0;
    });

    // FTT Rate = (Total Inspect - Total R/B/C) / Total Inspect * 100
    const fttRate = totalInspected > 0 ? 
        ((totalInspected - (totalRGrade + totalBGrade + totalCGrade)) / totalInspected) * 100 : 0;

    // Rework Rate = ((Rework Kiri + Rework Kanan)/2 + Rework Pairs) / Total Inspect * 100
    const calculatedTotalRework = ((totalReworkLeft + totalReworkRight) / 2) + totalReworkPairs;
    const reworkRate = totalInspected > 0 ? (calculatedTotalRework / totalInspected) * 100 : 0;

    // A-Grade Rate = Total A Grade / Total Inspect * 100
    const aGradeRate = totalInspected > 0 ? (totalAGrade / totalInspected) * 100 : 0;

    // Average Defects per Piece = Total Defects / Total Inspect
    const avgDefects = totalInspected > 0 ? totalDefects / totalInspected : 0;

    console.log('📊 Stats Cards Calculation:', {
        totalInspected,
        fttRate: fttRate.toFixed(1),
        reworkRate: reworkRate.toFixed(1),
        aGradeRate: aGradeRate.toFixed(1),
        avgDefects: avgDefects.toFixed(1)
    });

    return {
        fttRate: Math.max(0, fttRate),
        reworkRate: Math.max(0, reworkRate),
        aGradeRate: Math.max(0, aGradeRate),
        avgDefects: Math.max(0, avgDefects)
    };
}

/**
 * Convert filteredData to raw inspection format for calculation
 * @param {Array} filteredData - Current filtered data
 * @returns {Array} Raw inspection format
 */
function convertFilteredDataToRawFormat(filteredData) {
    if (!filteredData || filteredData.length === 0) {
        return [];
    }

    return filteredData.map(item => ({
        qtyInspect: item.qtyInspect || 0,
        aGrade: item.aGrade || 0,
        rGrade: item.rGrade || 0,
        bGrade: item.bGrade || 0,
        cGrade: item.cGrade || 0,
        totalDefects: item.totalDefects || 0,
        reworkLeft: item.reworkLeft || 0,
        reworkRight: item.reworkRight || 0,
        reworkPairs: item.reworkPairs || 0
    }));
}

/**
 * Smart data format detection and correction for individual records
 * @param {Array} googleSheetsData - Data from Google Sheets
 * @returns {Array} Corrected data for display
 */
function correctDataForTable(googleSheetsData) {
    if (!googleSheetsData || googleSheetsData.length === 0) {
        return [];
    }

    return googleSheetsData.map(record => {
        // Smart format detection for FTT and Rework rates
        let correctedFttRate = record.fttRate || 0;
        let correctedReworkRate = record.reworkRate || 0;

        // Auto-detect and correct format based on value range
        if (typeof correctedFttRate === 'number') {
            if (correctedFttRate < 1 && correctedFttRate > 0) {
                // Decimal format (0.37696) - convert to percentage
                correctedFttRate = correctedFttRate * 100;
            } else if (correctedFttRate >= 1 && correctedFttRate <= 100) {
                // Already percentage format - keep as is
                correctedFttRate = correctedFttRate;
            } else if (correctedFttRate > 100) {
                // Extreme value - likely double conversion, correct it
                correctedFttRate = correctedFttRate > 500 ? correctedFttRate / 100 : correctedFttRate;
            }
        }

        if (typeof correctedReworkRate === 'number') {
            if (correctedReworkRate < 1 && correctedReworkRate > 0) {
                correctedReworkRate = correctedReworkRate * 100;
            } else if (correctedReworkRate >= 1 && correctedReworkRate <= 100) {
                correctedReworkRate = correctedReworkRate;
            } else if (correctedReworkRate > 100) {
                correctedReworkRate = correctedReworkRate > 500 ? correctedReworkRate / 100 : correctedReworkRate;
            }
        }

        return {
            ...record,
            fttRate: Math.max(0, Math.min(100, correctedFttRate)),
            reworkRate: Math.max(0, Math.min(100, correctedReworkRate))
        };
    });
}

/**
 * Update Statistics Cards with comprehensive calculation fix
 * Replaces the current updateStats() function with reference-based calculation
 */
function updateStats() {
    console.log('🔄 Updating Statistics Cards with comprehensive fix...');
    
    // Guard clause: return early jika tidak ada data atau element tidak ada
    if (!filteredData || filteredData.length === 0 || !elements.fttRate) {
        if (elements.fttRate) elements.fttRate.textContent = '0%';
        if (elements.reworkRate) elements.reworkRate.textContent = '0%';
        if (elements.aGradeRate) elements.aGradeRate.textContent = '0%';
        if (elements.avgDefects) elements.avgDefects.textContent = '0';
        return;
    }
    
    // Convert filteredData to rawInspectionData format for calculation
    const rawInspectionData = convertFilteredDataToRawFormat(filteredData);
    
    // Calculate stats using reference pattern
    const stats = calculateStatsForCards(rawInspectionData);
    
    // Validation: Check for extreme values
    if (stats.fttRate > 500 || stats.reworkRate > 500 || stats.aGradeRate > 500) {
        console.error('❌ EXTREME VALUES DETECTED IN updateStats():');
        console.error(`  FTT: ${stats.fttRate}, Rework: ${stats.reworkRate}, A-Grade: ${stats.aGradeRate}`);
        
        // Reset to safe values
        elements.fttRate.textContent = '0%';
        elements.reworkRate.textContent = '0%';
        elements.aGradeRate.textContent = '0%';
        elements.avgDefects.textContent = '0';
        return;
    }
    
    // Update cards with correct values
    animateNumber(elements.fttRate, stats.fttRate, 1, '%');
    animateNumber(elements.reworkRate, stats.reworkRate, 1, '%');
    animateNumber(elements.aGradeRate, stats.aGradeRate, 1, '%');
    animateNumber(elements.avgDefects, stats.avgDefects, 1);
    
    console.log('✅ Statistics Cards Updated Successfully');
}

/**
 * Animasi angka dari nilai lama ke nilai baru dengan transisi smooth
 * 
 * Memberikan feedback visual yang menarik ketika statistik berubah
 * setelah filter diterapkan atau data di-update
 * 
 * @param {HTMLElement} element - Element HTML yang akan diupdate
 * @param {number} targetValue - Nilai target yang ingin dicapai
 * @param {number} decimals - Jumlah decimal places (default: 0)
 * @param {string} suffix - Suffix yang ditambahkan (contoh: '%', default: '')
 */
function animateNumber(element, targetValue, decimals = 0, suffix = '') {
    // Guard clause: return early jika element tidak ada
    if (!element) return;
    
    // Parse nilai awal dari text content (default 0 jika tidak valid)
    let startValue = parseFloat(element.textContent) || 0;
    
    // FIX: Detect and reset extreme values that indicate calculation errors
    // If start value is unrealistic (>500% for percentages), reset to 0
    if (suffix === '%' && Math.abs(startValue) > 500) {
        console.warn(`Detected extreme start value ${startValue}% in animateNumber, resetting to 0`);
        startValue = 0;
    }
    
    const duration = 1000;  // Durasi animasi 1 detik
    const startTime = performance.now();
    
    /**
     * Fungsi rekursif untuk update angka secara bertahap
     * Menggunakan requestAnimationFrame untuk smooth animation
     */
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);  // Progress 0-1
        
        // Hitung nilai saat ini berdasarkan progress (linear interpolation)
        const currentValue = startValue + (targetValue - startValue) * progress;
        
        // Format angka sesuai dengan decimal places dan suffix
        if (decimals > 0) {
            element.textContent = currentValue.toFixed(decimals) + suffix;
        } else {
            element.textContent = Math.floor(currentValue) + suffix;
        }
        
        // Lanjutkan animasi jika belum selesai
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    // Mulai animasi
    requestAnimationFrame(updateNumber);
}

// ========================================================================
// FUNGSI UPDATE TABEL DATA
// ========================================================================

/**
 * Update tabel data berdasarkan filtered data
 * 
 * Proses update tabel:
 * 1. Cek apakah ada data yang difilter
 * 2. Jika tidak ada data: tampilkan pesan "no data" dan sembunyikan tabel
 * 3. Jika ada data: tampilkan tabel dan generate rows untuk setiap item
 * 4. Format setiap kolom dengan styling dan badge yang sesuai
 * 5. Update info jumlah record yang ditampilkan
 * 
 * Features tabel:
 * - Color coding untuk FTT rate (poor/warning/good/excellent)
 * - Badge styling untuk grade dan NCVS station
 * - Tooltip untuk defects detail
 * - Responsive design untuk mobile dan desktop
 */
function updateTable() {
    // Jika tidak ada data yang difilter, tampilkan pesan "no data"
    if (filteredData.length === 0) {
        elements.tableContainer.style.display = 'none';        // Sembunyikan tabel
        elements.noDataMessage.style.display = 'block';        // Tampilkan pesan no data
        elements.tableInfo.textContent = 'Showing 0 of 0 records';  // Update info record
        return;
    }
    
    // 🎯 Apply smart data correction for table display
    const correctedTableData = correctDataForTable(filteredData);
    
    // Jika ada data, tampilkan tabel dan sembunyikan pesan no data
    elements.tableContainer.style.display = 'block';
    elements.noDataMessage.style.display = 'none';
    
    // Update informasi jumlah record yang ditampilkan vs total
    elements.tableInfo.textContent = `Showing ${correctedTableData.length} of ${allData.length} records`;
    
    // Clear existing rows untuk prepare fresh data
    elements.tableBody.innerHTML = '';
    
    // Generate row untuk setiap item dalam corrected data
    correctedTableData.forEach(item => {
        const row = document.createElement('tr');
        
        // Format defects display dengan detail type dan count
        // Contoh: "Stitch(2), Color(1)" atau "None" jika tidak ada defect
        const defectsDisplay = item.defects.length > 0 
            ? item.defects.map(d => `${d.type}(${d.count})`).join(', ')
            : 'None';
        
        // Tentukan CSS class untuk FTT rate berdasarkan performance level
        let fttClass = 'ftt-excellent';  // Default: excellent (95%+)
        if (item.fttRate < 70) fttClass = 'ftt-poor';        // Poor: <70%
        else if (item.fttRate < 85) fttClass = 'ftt-warning'; // Warning: 70-84%
        else if (item.fttRate < 95) fttClass = 'ftt-good';    // Good: 85-94%
        // Excellent: 95%+ (default)
        
        // Additional validation: Catch any remaining extreme values
        let displayFttRate = item.fttRate;
        let displayReworkRate = item.reworkRate;
        
        if (displayFttRate > 500) {
            console.warn(`Table: Extreme FTT value detected ${displayFttRate}% - correcting to safe value`);
            displayFttRate = Math.min(100, displayFttRate / 100);
        }
        if (displayReworkRate > 500) {
            console.warn(`Table: Extreme Rework value detected ${displayReworkRate}% - correcting to safe value`);
            displayReworkRate = Math.min(100, displayReworkRate / 100);
        }
        
        // Generate HTML untuk row dengan semua kolom dan styling
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.auditor}</td>
            <td><span class="ncvs-badge">${item.ncvsStation}</span></td>
            <td>${item.model}</td>
            <td>${item.styleNumber}</td>
            <td>${item.qtyInspect}</td>
            <td><span class="${fttClass}">${displayFttRate.toFixed(1)}%</span></td>
            <td>${displayReworkRate.toFixed(1)}%</td>
            <td><span class="grade-badge grade-${item.grade.toLowerCase()}">${item.grade}</span></td>
            <td class="defects-cell" title="${defectsDisplay}">${item.totalDefects > 0 ? item.totalDefects : 'None'}</td>
        `;
        
        // Tambahkan row ke table body
        elements.tableBody.appendChild(row);
    });
}

// ========================================================================
// FUNGSI INISIALISASI DAN MANAJEMEN CHARTS
// ========================================================================

/**
 * Inisialisasi semua charts yang digunakan dalam dashboard
 * 
 * Charts yang diinisialisasi:
 * 1. FTT Trend Chart - Line chart untuk trend FTT rate over time
 * 2. Top Defects Chart - Bar chart untuk top 5 defects terbanyak
 * 3. Grade Distribution Chart - Doughnut chart untuk distribusi grade
 * 4. NCVS Performance Chart - Horizontal bar chart untuk performa NCVS station
 * 
 * Dipanggil sekali saat dashboard load untuk setup awal charts
 */
function initializeCharts() {
    initializeFTTTrendChart();        // Setup FTT trend line chart
    initializeTopDefectsChart();      // Setup top defects bar chart  
    initializeGradeDistributionChart(); // Setup grade distribution doughnut chart
    initializeNCVSPerformanceChart(); // Setup NCVS performance horizontal bar chart
}

/**
 * Inisialisasi FTT Trend Chart (Line Chart)
 * 
 * Chart ini menampilkan trend FTT Rate over time untuk monitoring
 * performa quality secara temporal. Menggunakan line chart dengan:
 * - Area fill untuk visual yang lebih menarik
 * - Smooth curves (tension)
 * - Color coding green untuk FTT (good performance indicator)
 * - Responsive design untuk berbagai ukuran layar
 * - Custom tooltips dengan styling yang konsisten
 */
function initializeFTTTrendChart() {
    const ctx = document.getElementById('fttTrendChart');
    if (!ctx) return;  // Guard clause jika element tidak ditemukan
    
    // Destroy existing chart jika ada untuk prevent memory leaks
    if (fttTrendChart) {
        fttTrendChart.destroy();
    }
    
    // Konfigurasi Chart.js untuk FTT Trend Line Chart
    fttTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],  // Will be populated dynamically dengan tanggal
            datasets: [{
                label: 'FTT Rate (%)',
                data: [],  // Will be populated dynamically dengan FTT values
                borderColor: 'rgba(16, 185, 129, 1)',      // Green border (primary color)
                backgroundColor: 'rgba(16, 185, 129, 0.1)', // Light green fill
                borderWidth: 3,        // Thick line untuk visibility
                fill: true,           // Enable area fill
                tension: 0.4,         // Smooth curves
                pointBackgroundColor: 'rgba(16, 185, 129, 1)', // Green data points
                pointBorderColor: '#fff',    // White border untuk contrast
                pointBorderWidth: 2,         // Border thickness
                pointRadius: 5              // Point size
            }]
        },
        options: {
            responsive: true,                // Auto-resize berdasarkan container
            maintainAspectRatio: false,     // Allow flexible aspect ratio
            plugins: {
                legend: {
                    display: false  // Hide legend untuk clean look
                },
                tooltip: {
                    // Custom tooltip styling untuk consistency
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,  // Start dari 0
                    max: 100,          // Max 100% untuk FTT rate
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',  // Subtle grid lines
                        drawBorder: false               // No axis border
                    },
                    ticks: {
                        color: '#64748b',  // Gray text color
                        callback: function(value) {
                            return value + '%';  // Add % suffix to Y-axis labels
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,     // No vertical grid lines
                        drawBorder: false   // No axis border
                    },
                    ticks: {
                        color: '#64748b'   // Gray text color
                    }
                }
            },
            animation: {
                duration: 1000,        // 1 second animation
                easing: 'easeOutQuart' // Smooth easing
            }
        }
    });
}

/**
 * Inisialisasi Top Defects Chart (Vertical Bar Chart)
 * 
 * Chart ini menampilkan top 5 jenis defect terbanyak untuk membantu
 * identifikasi area improvement yang prioritas. Features:
 * - Vertical bar chart dengan color coding berbeda per bar
 * - Sorted berdasarkan jumlah defect (tertinggi ke terendah)
 * - Rounded corners untuk visual yang modern
 * - Custom tooltip dengan informasi detail count
 * - Responsive design untuk berbagai screen size
 */
function initializeTopDefectsChart() {
    const ctx = document.getElementById('topDefectsChart');
    if (!ctx) return;  // Guard clause jika element tidak ditemukan
    
    // Destroy existing chart jika ada untuk prevent memory leaks
    if (topDefectsChart) {
        topDefectsChart.destroy();
    }
    
    // Konfigurasi Chart.js untuk Top Defects Bar Chart
    topDefectsChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],  // Will be populated dengan defect types (top 5)
            datasets: [{
                label: 'Defect Count',
                data: [],  // Will be populated dengan defect counts
                // Array warna berbeda untuk setiap bar (max 5 bars)
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Red - highest defect
                    'rgba(245, 158, 11, 0.8)',  // Orange - second highest
                    'rgba(59, 130, 246, 0.8)',  // Blue - third highest
                    'rgba(139, 92, 246, 0.8)',  // Purple - fourth highest
                    'rgba(16, 185, 129, 0.8)'   // Green - fifth highest
                ],
                // Border colors yang matching dengan background
                borderColor: [
                    'rgba(239, 68, 68, 1)',     // Solid red border
                    'rgba(245, 158, 11, 1)',    // Solid orange border
                    'rgba(59, 130, 246, 1)',    // Solid blue border
                    'rgba(139, 92, 246, 1)',    // Solid purple border
                    'rgba(16, 185, 129, 1)'     // Solid green border
                ],
                borderWidth: 2,      // Border thickness
                borderRadius: 8      // Rounded corners untuk modern look
            }]
        },
        options: {
            responsive: true,                // Auto-resize berdasarkan container
            maintainAspectRatio: false,     // Allow flexible aspect ratio
            plugins: {
                legend: {
                    display: false  // Hide legend untuk clean look
                },
                tooltip: {
                    // Custom tooltip styling untuk consistency
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,  // Start dari 0 untuk accurate comparison
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',  // Subtle grid lines
                        drawBorder: false               // No axis border
                    },
                    ticks: {
                        color: '#64748b'  // Gray text color
                    }
                },
                x: {
                    grid: {
                        display: false,     // No vertical grid lines
                        drawBorder: false   // No axis border
                    },
                    ticks: {
                        color: '#64748b'   // Gray text color
                    }
                }
            },
            animation: {
                duration: 1000,        // 1 second animation
                easing: 'easeOutQuart' // Smooth easing
            }
        }
    });
}

// Initialize Grade Distribution Chart
function initializeGradeDistributionChart() {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;
    
    if (gradeDistributionChart) {
        gradeDistributionChart.destroy();
    }
    
    gradeDistributionChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['A Grade', 'B Grade', 'C Grade', 'D Grade', 'NG'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(107, 114, 128, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(107, 114, 128, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        color: '#64748b',
                        font: {
                            family: 'Segoe UI',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : 0;
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Initialize NCVS Performance Chart
function initializeNCVSPerformanceChart() {
    const ctx = document.getElementById('ncvsPerformanceChart');
    if (!ctx) return;
    
    if (ncvsPerformanceChart) {
        ncvsPerformanceChart.destroy();
    }
    
    ncvsPerformanceChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Average FTT Rate (%)',
                data: [],
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `FTT Rate: ${context.parsed.x.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                y: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Update all charts with filtered data
function updateAllCharts() {
    updateFTTTrendChart();
    updateTopDefectsChart();
    updateGradeDistributionChart();
    updateNCVSPerformanceChart();
}

// Update FTT Trend Chart
function updateFTTTrendChart() {
    if (!fttTrendChart) return;
    
    // Group data by date and calculate average FTT
    const dateGroups = {};
    filteredData.forEach(item => {
        if (!dateGroups[item.date]) {
            dateGroups[item.date] = [];
        }
        dateGroups[item.date].push(item.fttRate);
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    const labels = sortedDates.map(date => formatDate(date));
    const data = sortedDates.map(date => {
        const rates = dateGroups[date];
        return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    });
    
    fttTrendChart.data.labels = labels;
    fttTrendChart.data.datasets[0].data = data;
    fttTrendChart.update();
}

// Update Top Defects Chart
function updateTopDefectsChart() {
    if (!topDefectsChart) return;
    
    const defectCounts = {};
    filteredData.forEach(item => {
        item.defects.forEach(defect => {
            defectCounts[defect.type] = (defectCounts[defect.type] || 0) + defect.count;
        });
    });
    
    // Sort by count and take top 5
    const sortedDefects = Object.entries(defectCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const labels = sortedDefects.map(([type]) => type);
    const data = sortedDefects.map(([, count]) => count);
    
    topDefectsChart.data.labels = labels;
    topDefectsChart.data.datasets[0].data = data;
    topDefectsChart.update();
}

// Update Grade Distribution Chart
function updateGradeDistributionChart() {
    if (!gradeDistributionChart) return;
    
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, NG: 0 };
    filteredData.forEach(item => {
        if (gradeCounts.hasOwnProperty(item.grade)) {
            gradeCounts[item.grade]++;
        }
    });
    
    gradeDistributionChart.data.datasets[0].data = [
        gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.NG
    ];
    gradeDistributionChart.update();
}

// Update NCVS Performance Chart
function updateNCVSPerformanceChart() {
    if (!ncvsPerformanceChart) return;
    
    const ncvsData = {};
    filteredData.forEach(item => {
        if (!ncvsData[item.ncvsStation]) {
            ncvsData[item.ncvsStation] = [];
        }
        ncvsData[item.ncvsStation].push(item.fttRate);
    });
    
    const labels = Object.keys(ncvsData);
    const data = labels.map(station => {
        const rates = ncvsData[station];
        return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    });
    
    ncvsPerformanceChart.data.labels = labels;
    ncvsPerformanceChart.data.datasets[0].data = data;
    ncvsPerformanceChart.update();
}

// Filter data by time range for charts
function filterDataByTimeRange(timeRange) {
    const now = new Date();
    let startDate;
    
    switch(timeRange) {
        case '7':
            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            break;
        case '30':
            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            break;
        case '90':
            startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
            break;
        default:
            startDate = null;
    }
    
    if (startDate) {
        filteredData = allData.filter(item => new Date(item.date) >= startDate);
    } else {
        filteredData = [...allData];
    }
    
    updateStats();
    updateTable();
    updateAllCharts();
}

function showLoading(show) {
    if (show) {
        elements.loadingIndicator.style.display = 'flex';
        elements.tableContainer.style.display = 'none';
        elements.noDataMessage.style.display = 'none';
    } else {
        elements.loadingIndicator.style.display = 'none';
    }
}

function showErrorMessage(message) {
    console.error(message);
    // You can implement a toast notification here
    alert(message);
}

function showSuccessMessage(message) {
    console.log(message);
    // You can implement a toast notification here
    // For now, just log to console to avoid alert spam
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
}

// Utility function to change API configuration - Updated for multi-sheet support
function updateAPIConfig(apiKey, spreadsheetId, options = {}) {
    CONFIG.API_KEY = apiKey;
    CONFIG.SPREADSHEET_ID = spreadsheetId;
    
    // Support both old single-sheet format and new multi-sheet format
    if (options.range && typeof options.range === 'string') {
        // Legacy support: if single range provided, update inspection sheet
        CONFIG.SHEETS.INSPECTION.range = options.range;
        console.warn('Legacy range format used. Consider using multi-sheet configuration.');
    }
    
    // Update specific sheets if provided
    if (options.inspectionSheet) {
        CONFIG.SHEETS.INSPECTION = { ...CONFIG.SHEETS.INSPECTION, ...options.inspectionSheet };
    }
    
    if (options.defectsSheet) {
        CONFIG.SHEETS.DEFECTS = { ...CONFIG.SHEETS.DEFECTS, ...options.defectsSheet };
    }
    
    // If sheets configuration is provided directly
    if (options.sheets) {
        CONFIG.SHEETS = { ...CONFIG.SHEETS, ...options.sheets };
    }
    
    console.log('API Configuration updated:', {
        hasApiKey: !!CONFIG.API_KEY,
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        sheets: CONFIG.SHEETS
    });
}

// Export functions for external use
window.dashboardAPI = {
    updateAPIConfig,
    loadDataFromGoogleSheets,
    loadSampleData
};

// Auto-refresh data every 5 minutes (uncomment if needed)
// setInterval(() => {
//     if (CONFIG.API_KEY !== 'YOUR_GOOGLE_SHEETS_API_KEY') {
//         loadDataFromGoogleSheets();
//     }
// }, 5 * 60 * 1000);
