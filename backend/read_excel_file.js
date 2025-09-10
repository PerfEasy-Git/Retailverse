const XLSX = require('xlsx');
const path = require('path');

// Path to the Excel file
const excelFilePath = path.join(__dirname, '..', 'Docs', 'New', 'FinalData-Format-RETAILER INFO.xlsx');

try {
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    console.log('📊 EXCEL FILE ANALYSIS SUMMARY');
    console.log('================================');
    console.log(`File: ${path.basename(excelFilePath)}`);
    console.log(`Total Sheets: ${workbook.SheetNames.length}`);
    console.log('');
    
    // Analyze each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
        console.log(`📋 SHEET ${index + 1}: "${sheetName}"`);
        console.log('─'.repeat(50));
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            console.log('❌ Empty sheet');
            console.log('');
            return;
        }
        
        // Get headers (first row)
        const headers = jsonData[0] || [];
        console.log(`📝 Headers (${headers.length} columns):`);
        headers.forEach((header, i) => {
            if (header) {
                console.log(`   ${i + 1}. ${header}`);
            }
        });
        
        // Get data rows (excluding header)
        const dataRows = jsonData.slice(1);
        console.log(`📊 Data Rows: ${dataRows.length}`);
        
        // Show first few data rows as sample
        if (dataRows.length > 0) {
            console.log('📋 Sample Data (first 3 rows):');
            dataRows.slice(0, 3).forEach((row, rowIndex) => {
                console.log(`   Row ${rowIndex + 1}: [${row.map(cell => cell || '').join(', ')}]`);
            });
        }
        
        // Analyze data types and unique values for key columns
        if (dataRows.length > 0 && headers.length > 0) {
            console.log('🔍 Data Analysis:');
            
            // Check for unique values in first few columns
            headers.slice(0, 5).forEach((header, colIndex) => {
                if (header) {
                    const values = dataRows
                        .map(row => row[colIndex])
                        .filter(val => val !== undefined && val !== null && val !== '');
                    
                    if (values.length > 0) {
                        const uniqueValues = [...new Set(values)];
                        console.log(`   ${header}: ${uniqueValues.length} unique values`);
                        if (uniqueValues.length <= 10) {
                            console.log(`     Values: ${uniqueValues.join(', ')}`);
                        } else {
                            console.log(`     Sample: ${uniqueValues.slice(0, 5).join(', ')}...`);
                        }
                    }
                }
            });
        }
        
        console.log('');
    });
    
    console.log('✅ Analysis Complete!');
    
} catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    console.error('Full error:', error);
}
