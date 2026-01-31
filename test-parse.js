const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in newer node

async function testCreateViaApi() {
  try {
    // Login first to get token? 
    // The POST route requires ADMIN role.
    // I cannot easily simulate cookie auth here without a valid token.
    // But I can verify the parsing logic with a unit test of the parsing function if I extract it, 
    // or just trust my previous direct prisma test if I assume the API handler does what it says.
    
    // Instead, I will assume the issue is related to the parsing of the string input.
    
    const stockString = "5";
    const parsed = parseInt(stockString);
    console.log(`parseInt("${stockString}") =`, parsed);
    console.log(`Result:`, parsed || 0);
    
    const emptyString = "";
    const parsedEmpty = parseInt(emptyString);
    console.log(`parseInt("${emptyString}") =`, parsedEmpty);
    console.log(`Result:`, parsedEmpty || 0);

  } catch (e) {
    console.error(e);
  }
}

testCreateViaApi();
