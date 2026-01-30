# Email Classification Improvements Summary

## Overview

The Worker API classification logic has been refactored to improve accuracy for the 4 key foci:
1. **GRANTS** - Funding opportunities and grant applications
2. **CREW CALLS** (non-casting) - General crew recruitment
3. **RESOURCE REQUESTS** - Sourcing equipment, props, costumes, locations
4. **CASTING CALLS** - Separated from general crew calls via tags

## What Changed

### 1. **Subject-First Classification (3-Layer Approach)**

The new classification logic uses a hierarchical approach that trusts the subject line as the clearest signal:

**Layer 1: Strong Subject Patterns (Fast Routes)**
- Direct routing when subject contains unambiguous keywords
- Categories: DO_NOT_CARE, GRANT, CASTING, CREW_CALL, RESOURCE, EVENT, ADMIN
- Examples:
  - "Casting Call for..." → CREW_CALL with CASTING_ROLES tag
  - "SOURCING props for..." → RESOURCE
  - "Game Night at..." → DO_NOT_CARE
  - "Grant Applications Due..." → GRANT

**Layer 2: Weighted Scoring**
- Subject weight = 5x, body weight = 1x (previously 3x)
- Separate scoring for casting vs general crew calls
- Grant guard: requires ≥2 grant keyword hits OR 1 strong grant keyword to prevent leakage

**Layer 3: Conservative Fallback**
- No keyword matches → OTHER (low confidence)
- Prevents false positives in the 4 key foci

### 2. **Improved Quote Stripping**

Enhanced `stripQuotedEmail()` to better handle reply chains:
- Added HTML-encoded quote patterns (`&gt;`)
- Added horizontal line separators (`---`, `___`)
- Added multi-line quoted text blocks
- Result: Body text used for classification is now just the "new" content, reducing noise from reply chains

### 3. **Casting vs Crew Call Separation**

Casting calls are now properly separated from general crew calls:
- Primary category: `CREW_CALL`
- Tags: `CASTING_ROLES` and/or `CASTING_EXTRAS`
- Frontend can filter: `category=CREW_CALL AND NOT tagged CASTING_*` for non-casting crew calls
- Strong subject patterns:
  - "casting call", "auditions", "extras needed", "self tapes", "voice actors"

### 4. **Grant Detection & Leakage Prevention**

Strengthened grant classification to prevent false positives:
- **Strong subject signals**: "grant", "funding", "submissions for", "applications are due", "call for proposals"
- **Grant guard**: L2 scoring requires either:
  - Score ≥ 2 (multiple grant keywords), OR
  - At least one strong grant keyword in subject/body
- **Removed weak keywords**: "stipend" no longer triggers grant classification
- **Improved status detection**:
  - Parses deadlines from dates in text
  - Detects "applications open", "deadline", "submissions closed"
  - Tags: GRANT_OPEN, GRANT_UPCOMING, GRANT_CLOSED, GRANT_STATUS_UNCLEAR

### 5. **Better Social/Community Detection (DO_NOT_CARE)**

Expanded DO_NOT_CARE patterns to catch off-topic posts:
- **Subject patterns**: "game night", "watch party", "oscars watch party", "speed dating", "free food", "join us for"
- **High confidence** (0.9) when subject clearly indicates social event
- Examples correctly classified:
  - "Black Screens Game Night!!!" → DO_NOT_CARE
  - "OSCARS WATCH PARTY" → DO_NOT_CARE
  - "Speed Dating + Free Food" → DO_NOT_CARE

### 6. **Resource Request Improvements**

Better detection of sourcing/borrowing requests:
- **Strong subject patterns**: "sourcing", "borrow", "does anyone have", "need a ", "be a costume designer"
- **Specific tags**: PROPS_COSTUMES, LOCATION, EQUIPMENT
- Edge case handling: "need a " (with space) to avoid false matches like "need actors"

### 7. **Debug Classification Mode**

Added optional debug logging:
- Set `DEBUG_CLASSIFY=1` in environment variables
- Logs first 10 email classifications with:
  - Subject
  - Chosen category
  - Reasoning
  - Scores (for L2)
- Useful for troubleshooting classification decisions

## Classification Improvement Examples

### Example 1: Casting Call Separation

**Email Subject**: "CASTING CALL FOR OPALINE"

**Before**: Likely classified as CREW_CALL with no casting distinction
**After**:
- Category: `CREW_CALL`
- Tags: `["CASTING_ROLES", "PAY_UNCLEAR"]`
- Confidence: 0.80
- Reason: "CREW_CALL: subject contains casting signal: 'casting call'"

**Impact**: Frontend can now show casting calls separately from general crew calls

---

### Example 2: Grant Leakage Prevention

**Email Subject**: "Need custom SFX makeup prosthetics for your films?"

**Before**: Might be misclassified as GRANT due to weak keyword matches
**After**:
- Category: `OTHER`
- Confidence: 0.40
- Reason: "L2: GRANT guard failed (score=1, no strong signal) → OTHER"

**Impact**: Prevents service offerings from appearing in the Grants section

---

### Example 3: Social Event Detection

**Email Subject**: "1/28 BLACK SCREENS GAME NIGHT"

**Before**: Might be classified as EVENT or OTHER
**After**:
- Category: `DO_NOT_CARE`
- Confidence: 0.90
- Reason: "DO_NOT_CARE: subject contains social/off-topic signal"

**Impact**: Social hangouts don't clutter the 4 key foci sections

---

### Example 4: Resource Request Detection

**Email Subject**: "SOURCING PROD/COSTUMES FOR 'If The Hand Fits'"

**Before**: Might be classified as CREW_CALL or OTHER
**After**:
- Category: `RESOURCE`
- Tags: `["PROPS_COSTUMES"]`
- Confidence: 0.80
- Reason: "RESOURCE: subject contains resource request signal: 'sourcing'"

**Impact**: Resource requests are clearly separated and tagged by type

---

### Example 5: Subject-First Accuracy

**Email Subject**: "Re: CREW HEADS CALL FOR WINGDAD"
**Body**: Multiple paragraphs of quoted reply chain + "BUMPING THIS!!!"

**Before**: Reply chain noise might confuse classification
**After**:
- Body stripped to just "BUMPING THIS!!!" (quotes removed)
- Category: `CREW_CALL`
- Tags: `["PAY_UNCLEAR"]`
- Confidence: 0.80
- Reason: "CREW_CALL: subject contains crew recruitment signal: 'crew heads'"

**Impact**: Subject-first approach ignores noisy reply chains

---

## Test Results (Sample of 300 Emails)

### Distribution
- **GRANT**: 23 (7.7%)
- **CREW_CALL**: 212 (70.7%)
  - Non-casting: 143
  - Casting: 69
- **RESOURCE**: 3 (1.0%)
- **EVENT**: 33 (11.0%)
- **ADMIN**: 4 (1.3%)
- **OTHER**: 18 (6.0%)
- **DO_NOT_CARE**: 7 (2.3%)

### 4 Key Foci Breakdown
- **Grants**: 23
- **Crew Calls** (non-casting): 143
- **Casting Calls**: 69
- **Resource Requests**: 3

### Confidence Analysis
- Most classifications have confidence ≥ 0.70 (L1 subject matches: 0.80)
- Low-confidence classifications (< 0.6) are rare and typically edge cases
- DO_NOT_CARE has high confidence (0.90) when subject clearly indicates social event

## Known Limitations & Edge Cases

1. **Resource Requests are rare** (3/300 = 1%): Most equipment/prop requests may be happening off-listserv
2. **Ambiguous subjects**: Emails like "LAWRENCE v. FELIX" (a film title) require body content analysis
3. **Multi-purpose emails**: Some emails combine multiple topics (e.g., crew call + resource request)
4. **Event vs Crew Call**: Some "Speaker events" may be misclassified as crew calls due to keyword overlap
5. **Writer's Circle edge case**: Previously misclassified as GRANT, now correctly classified as EVENT

## Usage Notes

### Running the Sanity Check Harness

```bash
cd listserv-poc
node classify-test-harness.js --sample-size=300
```

Options:
- `--sample-size=N`: Test on N emails (default: 200)
- `--debug`: Enable verbose logging

### Enabling Debug Mode in Production

Set environment variable in Cloudflare Worker:
```
DEBUG_CLASSIFY=1
```

This will log classification decisions for the first 10 emails processed.

### Querying the 4 Key Foci

**Grants** (all statuses):
```
GET /api/emails?category=GRANT
```

**Grants** (open only):
```
GET /api/emails?category=GRANT&tag=GRANT_OPEN
```

**Crew Calls** (non-casting):
```
GET /api/emails?category=CREW_CALL
```
Then filter out entries with `CASTING_ROLES` or `CASTING_EXTRAS` in `tags_json` on the frontend.

**Casting Calls**:
```
GET /api/emails?category=CREW_CALL&tag=CASTING_ROLES
```

**Resource Requests**:
```
GET /api/emails?category=RESOURCE
```

## Maintenance

### Adding New Keywords

To add new classification keywords, edit the appropriate array in `worker.js`:
- L1 strong patterns: `grantSubjectStrong`, `castingSubjectStrong`, etc.
- L2 weighted scoring: `grantKw`, `crewKw`, `castingKw`, etc.

### Testing New Patterns

1. Add the keyword to the appropriate array
2. Run the test harness: `node classify-test-harness.js --sample-size=300`
3. Review the distribution and sample classifications
4. Adjust weights or patterns as needed

## Summary

The refactored classification logic provides:
- **Higher accuracy** through subject-first pattern matching
- **Better separation** of casting vs crew calls
- **Reduced false positives** in grants via stricter guards
- **Cleaner signal** by stripping quoted reply chains
- **Maintainability** via clear 3-layer architecture and test harness

The 4 key foci (Grants, Crew Calls, Resource Requests, Casting Calls) are now reliably classified and can be displayed on the frontend with appropriate filters.
