/**
 * Translation App API Test Script - Native Node.js (No Dependencies)
 * 
 * This script uses only Node.js built-in modules
 * Run with: node test_script_native.js
 */

const https = require('https');
const { URL } = require('url');

const API_BASE_URL = 'https://translation-app-nine.vercel.app';

// Utility function to make HTTP requests using native Node.js
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const startTime = Date.now();
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Script'
      }
    };

    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          parsedData = responseData;
        }
        
        resolve({
          status: res.statusCode,
          data: parsedData,
          responseTime: responseTime,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        responseTime: 0
      });
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Basic English to Spanish Translation',
    endpoint: '/translate',
    method: 'POST',
    data: {
      text: 'Hello world! How are you today?',
      target_language: 'es'
    },
    expectedStatus: 200,
    description: 'Tests basic translation functionality'
  },
  {
    name: 'English to French Translation',
    endpoint: '/translate',
    method: 'POST',
    data: {
      text: 'Good morning! I hope you have a wonderful day.',
      target_language: 'fr'
    },
    expectedStatus: 200,
    description: 'Tests French translation'
  },
  {
    name: 'Long Text Translation to Chinese',
    endpoint: '/translate',
    method: 'POST',
    data: {
      text: 'This is a longer text example to test the translation capabilities of our API.',
      target_language: 'zh'
    },
    expectedStatus: 200,
    description: 'Tests translation of longer text content'
  }
];

// Function to test API information endpoint
async function testApiInfo() {
  console.log('\n🔍 Testing API Information Endpoint');
  console.log('=====================================');
  
  const result = await makeRequest(`${API_BASE_URL}/`);
  
  if (result.status === 200) {
    console.log('✅ API Info Test PASSED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    console.log(`   Message: ${result.data.message}`);
    if (result.data.data && result.data.data.total_languages) {
      console.log(`   Total Languages: ${result.data.data.total_languages}`);
    }
  } else {
    console.log('❌ API Info Test FAILED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.error || 'Unknown error'}`);
  }
}

// Function to test languages endpoint
async function testLanguagesEndpoint() {
  console.log('\n🌐 Testing Languages Endpoint');
  console.log('=============================');
  
  const result = await makeRequest(`${API_BASE_URL}/languages`);
  
  if (result.status === 200) {
    console.log('✅ Languages Test PASSED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    
    if (Array.isArray(result.data)) {
      console.log(`   Languages Count: ${result.data.length}`);
    } else if (result.data.data) {
      console.log(`   Response received with data object`);
    }
  } else {
    console.log('❌ Languages Test FAILED');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.error || 'Unknown error'}`);
  }
}

// Function to run translation tests
async function runTranslationTests() {
  console.log('\n🔄 Testing Translation Functionality');
  console.log('====================================');
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📝 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    const result = await makeRequest(
      `${API_BASE_URL}${scenario.endpoint}`,
      scenario.method,
      scenario.data
    );
    
    if (result.status === scenario.expectedStatus) {
      console.log('✅ PASSED');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      console.log(`   Original: "${scenario.data.text}"`);
      console.log(`   Target Language: ${scenario.data.target_language}`);
      
      // Try to extract translated text from various response formats
      if (result.data) {
        if (result.data.data && result.data.data.translated_text) {
          console.log(`   Translated: "${result.data.data.translated_text}"`);
        } else if (result.data.translated_text) {
          console.log(`   Translated: "${result.data.translated_text}"`);
        } else {
          console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}...`);
        }
      }
    } else {
      console.log('❌ FAILED');
      console.log(`   Expected Status: ${scenario.expectedStatus}`);
      console.log(`   Actual Status: ${result.status}`);
      console.log(`   Error: ${result.error || 'See response data'}`);
      if (result.data) {
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Error handling tests
async function runErrorTests() {
  console.log('\n⚠️  Testing Error Handling');
  console.log('==========================');
  
  const errorScenarios = [
    {
      name: 'Invalid Language Code Error',
      data: { text: 'This should fail', target_language: 'invalid_code' },
      description: 'Tests error handling for invalid language codes'
    },
    {
      name: 'Empty Text Error',
      data: { text: '', target_language: 'es' },
      description: 'Tests error handling for empty text'
    }
  ];
  
  for (const scenario of errorScenarios) {
    console.log(`\n🚫 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    const result = await makeRequest(
      `${API_BASE_URL}/translate`,
      'POST',
      scenario.data
    );
    
    if (result.status >= 400 && result.status < 500) {
      console.log('✅ PASSED - Error handled correctly');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
    } else {
      console.log('❌ UNEXPECTED - Should have returned 4xx error');
      console.log(`   Actual Status: ${result.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Performance tests
async function runPerformanceTests() {
  console.log('\n⚡ Performance Testing');
  console.log('=====================');
  
  const performanceTest = {
    text: 'Performance test message',
    target_language: 'es'
  };
  
  const times = [];
  const testCount = 3; // Reduced for faster testing
  
  console.log(`Running ${testCount} consecutive translation requests...`);
  
  for (let i = 0; i < testCount; i++) {
    const result = await makeRequest(
      `${API_BASE_URL}/translate`,
      'POST',
      performanceTest
    );
    
    if (result.status === 200) {
      times.push(result.responseTime);
      console.log(`   Test ${i + 1}: ${result.responseTime}ms ✅`);
    } else {
      console.log(`   Test ${i + 1}: FAILED (${result.status})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('\n📊 Performance Results:');
    console.log(`   Average Response Time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${minTime}ms`);
    console.log(`   Slowest Response: ${maxTime}ms`);
    console.log(`   Success Rate: ${times.length}/${testCount} (${(times.length/testCount*100).toFixed(1)}%)`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Translation App API Test Suite (Native Node.js)');
  console.log('==================================================');
  console.log(`Testing API at: ${API_BASE_URL}`);
  console.log(`Test started at: ${new Date().toISOString()}`);
  console.log(`Node.js version: ${process.version}`);
  
  try {
    await testApiInfo();
    await testLanguagesEndpoint();
    await runTranslationTests();
    await runErrorTests();
    await runPerformanceTests();
    
    console.log('\n🎉 Test Suite Completed!');
    console.log('========================');
    
  } catch (error) {
    console.log('\n❌ Test suite encountered an error:');
    console.log(error.message);
  }
  
  console.log(`\nTest completed at: ${new Date().toISOString()}`);
}

// Run tests
runAllTests();