// Test script for Product Cards Comparison Widget
// Tests all core functionality without external dependencies

import { readFileSync } from 'fs';
import { join } from 'path';

const testResults = {
    timestamp: new Date().toISOString(),
    phase: 'Sticky Product Cards',
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

// Test file existence and structure
function testFileStructure() {
    try {
        const htmlPath = join(process.cwd(), 'ui', 'product-cards.html');
        const jsPath = join(process.cwd(), 'ui', 'product-cards.js');
        
        const htmlContent = readFileSync(htmlPath, 'utf8');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        // Check HTML structure
        const requiredElements = [
            'comparisonWidget',  // id
            'comparisonCards',   // id
            'comparisonCount',   // id  
            'product-item',      // class
            'add-to-comparison'  // class
        ];
        
        const missingElements = requiredElements.filter(id => {
            if (id === 'comparisonWidget' || id === 'comparisonCards' || id === 'comparisonCount') {
                return !htmlContent.includes(`id="${id}"`);
            } else {
                return !htmlContent.includes(`class="${id}"`);
            }
        });
        
        if (missingElements.length > 0) {
            addTest('HTML Structure', 'FAIL', `Missing elements: ${missingElements.join(', ')}`);
        } else {
            addTest('HTML Structure', 'PASS', 'All required elements present');
        }
        
        // Check JavaScript structure
        const requiredFunctions = [
            'addToComparison',
            'clearAllComparisons', 
            'showComparisonModal',
            'ComparisonWidget'
        ];
        
        const missingFunctions = requiredFunctions.filter(fn => !jsContent.includes(fn));
        
        if (missingFunctions.length > 0) {
            addTest('JavaScript Structure', 'FAIL', `Missing functions: ${missingFunctions.join(', ')}`);
        } else {
            addTest('JavaScript Structure', 'PASS', 'All required functions present');
        }
        
    } catch (error) {
        addTest('File Structure', 'FAIL', `File access error: ${error.message}`);
    }
}

// Test guard clause patterns
function testGuardClauses() {
    try {
        const jsPath = join(process.cwd(), 'ui', 'product-cards.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        // Check for prohibited try/catch usage
        const tryCatchMatches = jsContent.match(/try\s*{|catch\s*\(/g);
        if (tryCatchMatches) {
            addTest('Guard Clauses', 'FAIL', `Found ${tryCatchMatches.length} try/catch blocks (prohibited)`);
            return;
        }
        
        // Check for guard clause patterns
        const guardPatterns = [
            'if (!',
            'if (typeof',
            'return false',
            'return null',
            'console.warn'
        ];
        
        const foundPatterns = guardPatterns.filter(pattern => jsContent.includes(pattern));
        
        if (foundPatterns.length >= 3) {
            addTest('Guard Clauses', 'PASS', `Found ${foundPatterns.length}/5 guard clause patterns`);
        } else {
            addTest('Guard Clauses', 'FAIL', `Only ${foundPatterns.length}/5 guard clause patterns found`);
        }
        
    } catch (error) {
        addTest('Guard Clauses', 'FAIL', `Analysis error: ${error.message}`);
    }
}

// Test CSS responsiveness
function testResponsiveDesign() {
    try {
        const htmlPath = join(process.cwd(), 'ui', 'product-cards.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        
        // Check for responsive CSS
        const responsiveFeatures = [
            '@media (max-width: 768px)',
            'flex',
            'grid',
            'overflow-x: auto',
            'transform'
        ];
        
        const foundFeatures = responsiveFeatures.filter(feature => htmlContent.includes(feature));
        
        if (foundFeatures.length >= 4) {
            addTest('Responsive Design', 'PASS', `Found ${foundFeatures.length}/5 responsive features`);
        } else {
            addTest('Responsive Design', 'FAIL', `Only ${foundFeatures.length}/5 responsive features found`);
        }
        
    } catch (error) {
        addTest('Responsive Design', 'FAIL', `CSS analysis error: ${error.message}`);
    }
}

// Test accessibility features
function testAccessibility() {
    try {
        const htmlPath = join(process.cwd(), 'ui', 'product-cards.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        
        const a11yFeatures = [
            'aria-label',
            'role=',
            'tabindex',
            'alt=',
            'keydown'
        ];
        
        const foundFeatures = a11yFeatures.filter(feature => htmlContent.includes(feature));
        
        const warnings = [];
        if (!htmlContent.includes('aria-label')) {
            warnings.push('Missing ARIA labels for better screen reader support');
        }
        if (!htmlContent.includes('role=')) {
            warnings.push('Missing ARIA roles for semantic structure');
        }
        
        if (foundFeatures.length >= 2) {
            addTest('Accessibility', 'PASS', `Found ${foundFeatures.length}/5 accessibility features`, warnings);
        } else {
            addTest('Accessibility', 'FAIL', `Only ${foundFeatures.length}/5 accessibility features found`, warnings);
        }
        
    } catch (error) {
        addTest('Accessibility', 'FAIL', `A11y analysis error: ${error.message}`);
    }
}

// Test drag and drop functionality
function testDragAndDrop() {
    try {
        const jsPath = join(process.cwd(), 'ui', 'product-cards.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        const dragDropFeatures = [
            'dragstart',
            'dragover', 
            'drop',
            'draggable="true"',
            'dataTransfer'
        ];
        
        const foundFeatures = dragDropFeatures.filter(feature => jsContent.includes(feature));
        
        if (foundFeatures.length >= 4) {
            addTest('Drag & Drop', 'PASS', `Found ${foundFeatures.length}/5 drag & drop features`);
        } else {
            addTest('Drag & Drop', 'FAIL', `Only ${foundFeatures.length}/5 drag & drop features found`);
        }
        
    } catch (error) {
        addTest('Drag & Drop', 'FAIL', `D&D analysis error: ${error.message}`);
    }
}

// Test data persistence
function testPersistence() {
    try {
        const jsPath = join(process.cwd(), 'ui', 'product-cards.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        const persistenceFeatures = [
            'localStorage',
            'saveProducts',
            'loadSavedProducts',
            'JSON.stringify',
            'JSON.parse'
        ];
        
        const foundFeatures = persistenceFeatures.filter(feature => jsContent.includes(feature));
        
        if (foundFeatures.length >= 4) {
            addTest('Data Persistence', 'PASS', `Found ${foundFeatures.length}/5 persistence features`);
        } else {
            addTest('Data Persistence', 'FAIL', `Only ${foundFeatures.length}/5 persistence features found`);
        }
        
    } catch (error) {
        addTest('Data Persistence', 'FAIL', `Persistence analysis error: ${error.message}`);
    }
}

// Test error handling patterns
function testErrorHandling() {
    try {
        const jsPath = join(process.cwd(), 'ui', 'product-cards.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        const errorHandlingPatterns = [
            'validateProductData',
            'validateDOM',
            'console.warn',
            'console.info',
            'typeof',
            '!data',
            'return false'
        ];
        
        const foundPatterns = errorHandlingPatterns.filter(pattern => jsContent.includes(pattern));
        
        if (foundPatterns.length >= 6) {
            addTest('Error Handling', 'PASS', `Found ${foundPatterns.length}/7 error handling patterns`);
        } else {
            addTest('Error Handling', 'FAIL', `Only ${foundPatterns.length}/7 error handling patterns found`);
        }
        
    } catch (error) {
        addTest('Error Handling', 'FAIL', `Error handling analysis error: ${error.message}`);
    }
}

// Run all tests
function runTests() {
    console.log('🧪 Testing Sticky Product Cards Implementation...\n');
    
    testFileStructure();
    testGuardClauses();
    testResponsiveDesign();
    testAccessibility();
    testDragAndDrop();
    testPersistence();
    testErrorHandling();
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    console.log(`Total: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`⚠️ Warnings: ${testResults.summary.warnings}`);
    
    const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (successRate >= 85) {
        console.log('✅ Product Cards implementation is ready for production');
    } else if (successRate >= 70) {
        console.log('⚠️ Product Cards implementation needs minor improvements');
    } else {
        console.log('❌ Product Cards implementation needs significant work');
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
    
    const artifactPath = join(artifactDir, 'product-cards-test-results.json');
    writeFileSync(artifactPath, JSON.stringify(results, null, 2));
    
    console.log(`\n💾 Test results saved to: ${artifactPath}`);
} catch (error) {
    console.warn(`Failed to save test results: ${error.message}`);
}