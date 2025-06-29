// api/properties.js
// Vercel API route - much simpler than Netlify Functions!

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🔄 Vercel API called - fetching property data...');
    
    // Get environment variables
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    
    if (!API_KEY || !SPREADSHEET_ID) {
      throw new Error('Missing environment variables: GOOGLE_SHEETS_API_KEY or SPREADSHEET_ID');
    }
    
    // Fetch from Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:L?key=${API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.values || data.values.length === 0) {
      throw new Error('No data found in Google Sheets');
    }
    
    // Process the data
    const [headers, ...rows] = data.values;
    const properties = rows.map((row) => {
      const property = {};
      headers.forEach((header, index) => {
        property[header] = row[index] || '';
      });
      
      // Clean and format the data
      const priceText = property['售價2'] || '';
      property.priceNum = parseFloat(priceText.replace(/[^0-9]/g, '') || 0);
      property.areaNum = parseFloat(property['實用面積\n呎 (約)'] || 0);
      property.displayPrice = priceText.replace('$ ', '') || '';
      property.displayArea = property['實用面積\n呎 (約)'] || '';
      
      return property;
    }).filter(property => property['物業地址 (Full address)']);
    
    console.log('🎉 Successfully processed', properties.length, 'properties');
    
    // Return success response
    res.status(200).json({
      success: true,
      properties: properties,
      count: properties.length,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API error:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}