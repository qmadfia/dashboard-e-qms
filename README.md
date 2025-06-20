# e-QMS Dashboard

Modern and responsive e-QMS (Quality Management System) dashboard inspired by TailAdmin design. This dashboard displays quality inspection data from multiple Google Sheets with interactive filtering and comprehensive QMS visualizations.

## 🆕 Multiple Sheets Support

This dashboard now supports **multiple Google Sheets** for comprehensive quality management:
- **Database_Inspection** - Main inspection data with quality metrics
- **Database_Defect** - Detailed defect tracking and analysis

## ✨ Features

- 📊 **Modern QMS Dashboard** - Clean and professional design inspired by TailAdmin
- 📱 **Responsive Design** - Perfect display on desktop, tablet, and mobile
- 🔗 **Multiple Sheets Integration** - Load and merge data from multiple Google Sheets simultaneously
- 📋 **Comprehensive Data Merging** - Automatic correlation between inspection and defect data
- 🔍 **Interactive QMS Filters** - Filter by date, model, auditor, NCVS station, and style number
- 📈 **QMS-Specific Visualizations** - 4 specialized charts:
  - Line Chart: FTT (First Time Through) Rate Trend
  - Bar Chart: Top Defect Types Analysis (from merged defect data)
  - Doughnut Chart: Grade Distribution (A/B/C/D/NG)
  - Horizontal Bar Chart: NCVS Station Performance
- 📊 **Enhanced QMS Statistics** - 4 key performance indicators with animations:
  - FTT Rate (First Time Through) from inspection data
  - Rework Rate from inspection data
  - A-Grade Rate from inspection data
  - Average Defects per Piece from merged defect data
- ⚡ **Parallel Data Loading** - Simultaneous loading from multiple sheets for better performance
- 🔄 **Auto Sheet Verification** - Automatic verification of sheet names and structure
- 📋 **Enriched Data Table** - QMS data with defect correlation and grade badges
- 🎯 **Real-time Analytics** - Comprehensive analytics from merged inspection and defect data
- ⏱️ **Chart Time Range Selector** - Filter charts by time range (7 days, 30 days, 90 days)
- 🎨 **Gradient Sidebar** - Navigation sidebar with attractive gradient effect

## 🚀 Usage Guide

### 1. Setup Google Sheets API

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google Sheets API
4. Create API Key:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy the generated API Key

### 2. Setup Google Spreadsheet with Multiple Sheets

Create a Google Spreadsheet with **two specific sheets**:

#### Sheet 1: Database_Inspection (Range A:P)
Main inspection data with quality metrics:
```
A: Timestamp | B: Auditor | C: NCVS Station | D: Model | E: Style Number | F: Qty Inspect | 
G: Qty Sample Set | H: FTT Rate | I: Rework Rate | J: A Grade | K: R Grade | L: B Grade | 
M: C Grade | N: Rework Left | O: Rework Right | P: Rework Pairs
```

Sample data:
```
2024-01-15 08:30 | John Smith | NCVS-01 | Model A | ST-001 | 50 | 10 | 0.925 | 0.052 | 8 | 1 | 1 | 0 | 2 | 1 | 3
2024-01-16 09:15 | Sarah Johnson | NCVS-02 | Model B | ST-002 | 45 | 10 | 0.883 | 0.071 | 7 | 2 | 1 | 0 | 3 | 2 | 5
```

#### Sheet 2: Database_Defect (Range A:H)
Detailed defect tracking information:
```
A: Timestamp | B: Defect Type | C: Position | D: Severity | E: Count | F: Description | G: Inspector | H: Correction Action
```

Sample data:
```
2024-01-15 08:30 | Stitch | Left | Major | 1 | Uneven stitching | John Smith | Re-stitch
2024-01-15 08:30 | Color | Both | Minor | 2 | Slight color variation | John Smith | Accept with note
2024-01-16 09:15 | Thread | Right | Critical | 1 | Thread break | Sarah Johnson | Replace thread
```

**Important Notes:**
- Sheet names must be exactly: `Database_Inspection` and `Database_Defect`
- Timestamps in both sheets must match exactly for proper data correlation
- FTT Rate and Rework Rate should be in decimal format (0.925 = 92.5%)
- Grade counts (A, R, B, C) should be integers
- Defect severity levels: Critical, Major, Minor
- Position options: Left, Right, Both

### 3. Configure Dashboard

1. Open file `script.js`
2. Update configuration at the top:
   ```javascript
   const CONFIG = {
       API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',
       SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
       SHEETS: {
           INSPECTION: {
               name: 'Database_Inspection',
               range: 'A:P'
           },
           DEFECTS: {
               name: 'Database_Defect',
               range: 'A:H'
           }
       }
   };
   ```

### 4. Deploy ke Vercel

1. Upload semua file ke repository GitHub
2. Connect repository ke Vercel
3. Deploy otomatis akan berjalan

### 5. Local Development

```bash
# Menggunakan Live Server (VS Code Extension)
# Atau menggunakan Python
python -m http.server 8000

# Atau menggunakan Node.js
npx http-server
```

## 📊 QMS Data Format

Ensure your Google Sheets follows this QMS format:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Date | Date | Inspection date | 2024-01-15 |
| Auditor | Text | Quality auditor name | John Smith |
| NCVS Station | Text | NCVS station identifier | NCVS-01 |
| Model | Text | Product model | Model A |
| Style Number | Text | Style identifier | ST-001 |
| Qty Inspect | Number | Quantity inspected | 50 |
| FTT Rate | Number | First Time Through rate (%) | 92.5 |
| Rework Rate | Number | Rework rate (%) | 5.2 |
| Grade | Text | Quality grade | A/B/C/D/NG |
| Defects | Text | Defect details | Stitch(1),Color(2) |

## 🔧 QMS Dashboard Features

### **Statistics Cards**
- **FTT Rate**: Average First Time Through rate across all inspections
- **Rework Rate**: Average rework percentage
- **A-Grade Rate**: Percentage of inspections receiving A-grade
- **Average Defects per Piece**: Average number of defects per inspected piece

### **QMS Charts**
1. **FTT Trend Chart**: Line chart showing FTT rate trends over time
2. **Top Defects Chart**: Bar chart displaying most common defect types
3. **Grade Distribution Chart**: Doughnut chart showing grade distribution
4. **NCVS Performance Chart**: Horizontal bar chart showing station performance

### **QMS Filters**
- Date range selection
- Model filtering
- Auditor filtering
- NCVS Station filtering
- Style Number filtering

## 🎨 QMS Color Coding

- **A Grade**: Green badge
- **B Grade**: Blue badge  
- **C Grade**: Yellow badge
- **D Grade**: Red badge
- **NG Grade**: Gray badge

**FTT Rate Performance**:
- Excellent (95%+): Dark green
- Good (85-94%): Green
- Warning (70-84%): Orange
- Poor (<70%): Red

## 🛠️ Dependencies

- **Chart.js** - Untuk visualisasi chart
- **Font Awesome** - Untuk icons
- **Google Sheets API v4** - Untuk mengambil data

## 📝 Catatan Penting

1. **API Key Security**: Jangan commit API Key ke repository public. Gunakan environment variables untuk production.

2. **CORS Issues**: Jika mengalami CORS error, pastikan domain sudah dikonfigurasi di Google Cloud Console.

3. **Rate Limiting**: Google Sheets API memiliki quota limit. Monitor penggunaan API di Google Cloud Console.

4. **Data Sample**: Dashboard sudah dilengkapi dengan sample data untuk testing tanpa perlu setup Google Sheets terlebih dahulu.

## 🚀 Performance Tips

1. **Caching**: Implement caching untuk mengurangi API calls
2. **Pagination**: Untuk data besar, implement pagination
3. **Lazy Loading**: Load chart hanya saat diperlukan
4. **Minimize API Calls**: Update data secara periodic, tidak setiap user action

## 📧 Support

Jika mengalami masalah, periksa:
1. Browser console untuk error messages
2. Network tab untuk failed API requests
3. Google Cloud Console untuk API usage dan errors

---

**Dibuat dengan ❤️ untuk Quality Management System**
