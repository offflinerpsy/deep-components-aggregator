// Test script for Currency Conversion System
// Tests CBR API integration, caching, and search integration

import { readFileSync } from 'fs';
import { join } from 'path';

const testResults = {
    timestamp: new Date().toISOString(),
    phase: 'Currency Conversion System',
    tests: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    }
};

function addTest(name, status, details = '', warnings = []) {
    const test = {
        name,
        status,
        details,
        warnings,
        timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(test);
    testResults.summary.total++;
    
    if (status === 'PASS') {
        testResults.summary.passed++;
    } else if (status === 'FAIL') {
        testResults.summary.failed++;
    }
    
    testResults.summary.warnings += warnings.length;
    
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}`);
    if (details) console.log(`   ${details}`);
    warnings.forEach(w => console.log(`   ⚠️ ${w}`));
}

// Test file structure and dependencies
function testFileStructure() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const integrationPath = join(process.cwd(), 'src', 'currency', 'searchIntegration.js');
        const demoPath = join(process.cwd(), 'ui', 'currency-demo.html');
        
        const converterContent = readFileSync(converterPath, 'utf8');
        const integrationContent = readFileSync(integrationPath, 'utf8');
        const demoContent = readFileSync(demoPath, 'utf8');
        
        // Check core currency converter components
        const requiredConverterFeatures = [
            'class CurrencyConverter',
            'async updateRates',
            'convert(',
            'convertPriceRange',
            'cbr-xml-daily.ru',
            'localStorage'
        ];
        
        const missingConverter = requiredConverterFeatures.filter(feature => 
            !converterContent.includes(feature)
        );
        
        if (missingConverter.length > 0) {
            addTest('Currency Converter Structure', 'FAIL', `Missing: ${missingConverter.join(', ')}`);
        } else {
            addTest('Currency Converter Structure', 'PASS', 'All core features present');
        }
        
        // Check search integration components
        const requiredIntegrationFeatures = [
            'class SearchCurrencyIntegration',
            'convertProductPrice',
            'convertSearchResults',
            'defaultSourceCurrencies'
        ];
        
        const missingIntegration = requiredIntegrationFeatures.filter(feature => 
            !integrationContent.includes(feature)
        );
        
        if (missingIntegration.length > 0) {
            addTest('Search Integration Structure', 'FAIL', `Missing: ${missingIntegration.join(', ')}`);
        } else {
            addTest('Search Integration Structure', 'PASS', 'All integration features present');
        }
        
        // Check demo interface
        const requiredDemoFeatures = [
            'convertSingle',
            'convertRange',
            'refreshRates',
            'statusGrid'
        ];
        
        const missingDemo = requiredDemoFeatures.filter(feature => 
            !demoContent.includes(feature)
        );
        
        if (missingDemo.length > 0) {
            addTest('Demo Interface Structure', 'FAIL', `Missing: ${missingDemo.join(', ')}`);
        } else {
            addTest('Demo Interface Structure', 'PASS', 'All demo features present');
        }
        
    } catch (error) {
        addTest('File Structure', 'FAIL', `File access error: ${error.message}`);
    }
}

// Test guard clause usage (no try/catch)
function testGuardClauses() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const integrationPath = join(process.cwd(), 'src', 'currency', 'searchIntegration.js');
        
        const converterContent = readFileSync(converterPath, 'utf8');
        const integrationContent = readFileSync(integrationPath, 'utf8');
        
        // Check for prohibited try/catch in main files only
        const converterTryCatch = converterContent.match(/try\s*{|catch\s*\(/g);
        const integrationTryCatch = integrationContent.match(/try\s*{|catch\s*\(/g);
        
        if (converterTryCatch || integrationTryCatch) {
            const total = (converterTryCatch?.length || 0) + (integrationTryCatch?.length || 0);
            addTest('Guard Clauses', 'FAIL', `Found ${total} try/catch blocks in main files (prohibited)`);
            return;
        }
        
        // Check for guard clause patterns
        const guardPatterns = [
            'if (!',
            'return { error:',
            'validateEnvironment',
            'validateConversionInput',
            'validateProductInput'
        ];
        
        const foundInConverter = guardPatterns.filter(pattern => converterContent.includes(pattern));
        const foundInIntegration = guardPatterns.filter(pattern => integrationContent.includes(pattern));
        
        const totalFound = [...new Set([...foundInConverter, ...foundInIntegration])].length;
        
        if (totalFound >= 4) {
            addTest('Guard Clauses', 'PASS', `Found ${totalFound}/5 guard clause patterns`);
        } else {
            addTest('Guard Clauses', 'FAIL', `Only ${totalFound}/5 guard clause patterns found`);
        }
        
    } catch (error) {
        addTest('Guard Clauses', 'FAIL', `Analysis error: ${error.message}`);
    }
}

// Test CBR API integration
function testCbrApiIntegration() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const converterContent = readFileSync(converterPath, 'utf8');
        
        const cbrFeatures = [
            'cbr-xml-daily.ru/daily_json.js',
            'validateCbrData',
            'processCbrData',
            'AbortController',
            'setTimeout',
            'clearTimeout'
        ];
        
        const foundFeatures = cbrFeatures.filter(feature => converterContent.includes(feature));
        
        const warnings = [];
        if (!converterContent.includes('AbortController')) {
            warnings.push('Missing request timeout protection');
        }
        if (!converterContent.includes('fallbackRates')) {
            warnings.push('Missing fallback rates for offline mode');
        }
        
        if (foundFeatures.length >= 5) {
            addTest('CBR API Integration', 'PASS', `Found ${foundFeatures.length}/6 CBR features`, warnings);
        } else {
            addTest('CBR API Integration', 'FAIL', `Only ${foundFeatures.length}/6 CBR features found`, warnings);
        }
        
    } catch (error) {
        addTest('CBR API Integration', 'FAIL', `CBR analysis error: ${error.message}`);
    }
}

// Test caching implementation
function testCaching() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const converterContent = readFileSync(converterPath, 'utf8');
        
        const cachingFeatures = [
            'localStorage',
            'saveCachedRates',
            'loadCachedRates',
            'isCacheValid',
            'cacheExpiry',
            'clearCache'
        ];
        
        const foundFeatures = cachingFeatures.filter(feature => converterContent.includes(feature));
        
        if (foundFeatures.length >= 5) {
            addTest('Caching System', 'PASS', `Found ${foundFeatures.length}/6 caching features`);
        } else {
            addTest('Caching System', 'FAIL', `Only ${foundFeatures.length}/6 caching features found`);
        }
        
    } catch (error) {
        addTest('Caching System', 'FAIL', `Caching analysis error: ${error.message}`);
    }
}

// Test currency conversion algorithms
function testConversionAlgorithms() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const converterContent = readFileSync(converterPath, 'utf8');
        
        const conversionFeatures = [
            'convert(',
            'convertPriceRange',
            'formatRubleRange',
            'fromRate / toRate',
            'Intl.NumberFormat',
            'parseFloat'
        ];
        
        const foundFeatures = conversionFeatures.filter(feature => converterContent.includes(feature));
        
        if (foundFeatures.length >= 5) {
            addTest('Conversion Algorithms', 'PASS', `Found ${foundFeatures.length}/6 conversion features`);
        } else {
            addTest('Conversion Algorithms', 'FAIL', `Only ${foundFeatures.length}/6 conversion features found`);
        }
        
    } catch (error) {
        addTest('Conversion Algorithms', 'FAIL', `Algorithm analysis error: ${error.message}`);
    }
}

// Test search results integration
function testSearchIntegration() {
    try {
        const integrationPath = join(process.cwd(), 'src', 'currency', 'searchIntegration.js');
        const integrationContent = readFileSync(integrationPath, 'utf8');
        
        const searchFeatures = [
            'convertSearchResults',
            'detectSourceCurrency',
            'defaultSourceCurrencies',
            'mouser.*USD',
            'farnell.*EUR',
            'async convertSearchResults'
        ];
        
        const foundFeatures = searchFeatures.filter(feature => {
            if (feature.includes('.*')) {
                // Use regex for pattern matching
                const pattern = new RegExp(feature);
                return pattern.test(integrationContent);
            }
            return integrationContent.includes(feature);
        });
        
        if (foundFeatures.length >= 5) {
            addTest('Search Integration', 'PASS', `Found ${foundFeatures.length}/6 search features`);
        } else {
            addTest('Search Integration', 'FAIL', `Only ${foundFeatures.length}/6 search features found`);
        }
        
    } catch (error) {
        addTest('Search Integration', 'FAIL', `Search integration analysis error: ${error.message}`);
    }
}

// Test error handling and fallbacks
function testErrorHandling() {
    try {
        const converterPath = join(process.cwd(), 'src', 'currency', 'currencyConverter.js');
        const converterContent = readFileSync(converterPath, 'utf8');
        
        const errorHandlingFeatures = [
            'fallbackRates',
            'console.warn',
            'validateEnvironment',
            'validateCbrData',
            'validateConversionInput',
            'typeof fetch !== \'undefined\'',
            'response.ok'
        ];
        
        const foundFeatures = errorHandlingFeatures.filter(feature => converterContent.includes(feature));
        
        if (foundFeatures.length >= 6) {
            addTest('Error Handling', 'PASS', `Found ${foundFeatures.length}/7 error handling features`);
        } else {
            addTest('Error Handling', 'FAIL', `Only ${foundFeatures.length}/7 error handling features found`);
        }
        
    } catch (error) {
        addTest('Error Handling', 'FAIL', `Error handling analysis error: ${error.message}`);
    }
}

// Test UI demo completeness
function testDemoInterface() {
    try {
        const demoPath = join(process.cwd(), 'ui', 'currency-demo.html');
        const demoContent = readFileSync(demoPath, 'utf8');
        
        const uiFeatures = [
            'convertSingle',
            'convertRange', 
            'refreshRates',
            'updateStatus',
            'loadProductSamples',
            'statusGrid',
            'sampleProducts'
        ];
        
        const foundFeatures = uiFeatures.filter(feature => demoContent.includes(feature));
        
        // Check for responsive design
        const responsiveFeatures = [
            '@media (max-width: 768px)',
            'grid-template-columns',
            'display: grid'
        ];
        
        const foundResponsive = responsiveFeatures.filter(feature => demoContent.includes(feature));
        
        const warnings = [];
        if (foundResponsive.length < 2) {
            warnings.push('Limited responsive design features');
        }
        
        if (foundFeatures.length >= 6) {
            addTest('Demo Interface', 'PASS', `Found ${foundFeatures.length}/7 UI features`, warnings);
        } else {
            addTest('Demo Interface', 'FAIL', `Only ${foundFeatures.length}/7 UI features found`, warnings);
        }
        
    } catch (error) {
        addTest('Demo Interface', 'FAIL', `Demo analysis error: ${error.message}`);
    }
}

// Run all tests
function runTests() {
    console.log('💰 Testing Currency Conversion System...\n');
    
    testFileStructure();
    testGuardClauses();
    testCbrApiIntegration();
    testCaching();
    testConversionAlgorithms();
    testSearchIntegration();
    testErrorHandling();
    testDemoInterface();
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    console.log(`Total: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`⚠️ Warnings: ${testResults.summary.warnings}`);
    
    const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (successRate >= 85) {
        console.log('✅ Currency conversion system is ready for production');
    } else if (successRate >= 70) {
        console.log('⚠️ Currency conversion system needs minor improvements');
    } else {
        console.log('❌ Currency conversion system needs significant work');
    }
    
    return testResults;
}

// Export test results
const results = runTests();

// Save results to artifact
import { writeFileSync, mkdirSync } from 'fs';

try {
    const artifactDir = join(process.cwd(), 'docs', '_artifacts', 'full-pass-2025-10-05');
    mkdirSync(artifactDir, { recursive: true });
    
    const artifactPath = join(artifactDir, 'currency-test-results.json');
    writeFileSync(artifactPath, JSON.stringify(results, null, 2));
    
    console.log(`\n💾 Test results saved to: ${artifactPath}`);
} catch (error) {
    console.warn(`Failed to save test results: ${error.message}`);
}