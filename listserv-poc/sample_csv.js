// Quick CSV sampler to understand classification challenges
// Run with: node sample_csv.js

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../data/rtvf_data.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

// Simple CSV parser (handles quoted fields)
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

const lines = content.split('\n').filter(l => l.trim());
const header = parseCsvLine(lines[0]);
console.log('Header:', header);
console.log('Total rows:', lines.length - 1, '\n');

// Sample strategy: get diverse examples
const samples = {
    grants: [],
    crewCalls: [],
    resourceRequests: [],
    castingCalls: [],
    social: [],
    ambiguous: []
};

// Keywords to identify likely categories
const grantKeywords = ['grant', 'funding', 'application', 'apply', 'award', 'submissions'];
const crewKeywords = ['crew call', 'seeking crew', 'hiring', 'petitions', 'looking for'];
const castingKeywords = ['casting', 'audition', 'extras', 'casting call'];
const resourceKeywords = ['sourcing', 'props', 'costume', 'borrow', 'does anyone have', 'need a', 'location'];
const socialKeywords = ['game night', 'hangout', 'party', 'free food', 'karaoke'];

function categorizeSubject(subject) {
    const s = subject.toLowerCase();

    if (grantKeywords.some(k => s.includes(k))) return 'grants';
    if (castingKeywords.some(k => s.includes(k))) return 'castingCalls';
    if (crewKeywords.some(k => s.includes(k))) return 'crewCalls';
    if (resourceKeywords.some(k => s.includes(k))) return 'resourceRequests';
    if (socialKeywords.some(k => s.includes(k))) return 'social';
    return 'ambiguous';
}

// Sample up to 15 from each category
const maxPerCategory = 15;
for (let i = 1; i < lines.length && i < 1000; i++) {
    try {
        const row = parseCsvLine(lines[i]);
        const subject = row[0] || '';
        const body = row[4] || '';

        const category = categorizeSubject(subject);
        if (samples[category].length < maxPerCategory) {
            samples[category].push({
                subject,
                body: body.substring(0, 500), // First 500 chars
                lineNum: i + 1
            });
        }
    } catch (e) {
        // skip malformed rows
    }
}

console.log('=== SAMPLE DISTRIBUTION ===\n');
for (const [cat, items] of Object.entries(samples)) {
    console.log(`${cat}: ${items.length} samples`);
}

console.log('\n=== GRANT SAMPLES ===');
samples.grants.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});

console.log('\n\n=== CREW CALL SAMPLES ===');
samples.crewCalls.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});

console.log('\n\n=== CASTING CALL SAMPLES ===');
samples.castingCalls.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});

console.log('\n\n=== RESOURCE REQUEST SAMPLES ===');
samples.resourceRequests.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});

console.log('\n\n=== SOCIAL/DO_NOT_CARE SAMPLES ===');
samples.social.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});

console.log('\n\n=== AMBIGUOUS SAMPLES ===');
samples.ambiguous.slice(0, 10).forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.subject}`);
    console.log(`Body preview: ${s.body.substring(0, 200).replace(/<br>/g, ' ').replace(/\s+/g, ' ')}...`);
});
