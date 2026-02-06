# Horizontal Layout Debug Report
**Date:** 2025-12-05  
**Status:** Layout not responding to changes  
**Target:** Implement horizontal layout mode with proper element positioning

---

## Problem Summary

Horizontal mode layout is not displaying correctly despite multiple CSS modifications:
- Elements are not top-aligned (上詰め)
- Buttons are not directly below graph (グラフのすぐ下)
- Presets are not directly below group section (グループ選択のすぐ下)
- User repeatedly reports "変わってない" (no change visible)

---

## Implementation Approach

### Target Layout Structure (Grid-based)
```
+-----------------+---+--------------------+
| Graph           | | | Group Section      |
|                 | R |                    |
|                 | E |--------------------|
+-----------------+ S | Preset Section     |
| Buttons         | I |                    |
|                 | Z |                    |
|                 | E |                    |
+-----------------+---+--------------------+
```

### CSS Grid Configuration
```css
.screen[data-layout="horizontal"] .mian-div {
  display: grid;
  grid-template-columns: auto 4px 1fr;
  grid-template-rows: auto auto;
}
```

### Grid Cell Assignments
| Element | Column | Row | Expected Position |
|---------|--------|-----|------------------|
| Graph Section | 1 | 1 | Top-left |
| Button Section | 1 | 2 | Below graph |
| Resize Bar | 2 | 1-2 | Vertical span |
| Group Section | 3 | 1 | Top-right |
| Preset Section | 3 | 2 | Below group |

---

## Modification History

### Attempt 1: Flexbox with Order Properties
**Goal:** Rearrange elements using `flex-wrap` and `order`

**Changes Made:**
```css
.screen[data-layout="horizontal"] .mian-div {
  flex-wrap: wrap;
}
.section-graph { order: 1; }
.section-button { order: 2; }
```

**Result:** ❌ Buttons went to wrong position  
**Analysis:** Flex order cannot create 2x2 grid structure

---

### Attempt 2: CSS Grid Implementation
**Goal:** Use grid layout for precise positioning

**Changes Made:**
```css
.screen[data-layout="horizontal"] .mian-div {
  display: grid;
  grid-template-columns: 400px 4px 1fr;
  grid-template-rows: 1fr auto;
}
```

**Result:** ✅ Left/right separation working  
**Issue:** Vertical alignment wrong, spacing incorrect

---

### Attempt 3: Grid Sizing Adjustments
**Goal:** Make graph square, auto-size rows

**Changes Made:**
```css
grid-template-columns: auto 4px 1fr;
grid-template-rows: auto auto;
.div-graph {
  aspect-ratio: 1;
  height: 100%;
}
```

**Result:** ✅ Graph became square  
**Issue:** Still not top-aligned

---

### Attempt 4: Gap Elimination
**Goal:** Remove spacing between graph and buttons

**Changes Made:**
```css
.section-graph { gap: 0px; }
.section-group { gap: 0px; }
.section-1 { gap: 0px; }
```

**Result:** ❌ "変わってない" - No visible change  
**Analysis:** Problem is not gap size, but alignment

---

### Attempt 5: Alignment Fix
**Goal:** Top-align grid items

**Changes Made:**
```css
.screen[data-layout="horizontal"] .mian-div {
  align-items: start;
}
```

**Result:** ❌ "変わってない" - No visible change  
**Analysis:** Grid items still not aligning properly

---

### Attempt 6: Explicit Class Assignment
**Goal:** Ensure button section has proper grid assignment

**Changes Made:**
- HTML: Added `class="section-button"` to button section
- CSS: Explicit grid placement for `.section-button`

```css
.screen[data-layout="horizontal"] .section-button {
  grid-column: 1;
  grid-row: 2;
}
```

**Result:** ❌ "変わってない" - No visible change  
**Status:** Current state

---

## Critical Analysis

### What We Know Works
✅ Grid structure is active (left/right separation functional)  
✅ Graph aspect-ratio working (square shape achieved)  
✅ Icon toggle working correctly  
✅ Layout attribute switching (`data-layout="horizontal"`)  
✅ File persistence (layoutMode.txt saving/loading)

### What Doesn't Work
❌ Vertical alignment (top-alignment)  
❌ "すぐ下" (immediately below) positioning  
❌ CSS changes not affecting visual layout  
❌ Gap/spacing adjustments having no effect

### Hypotheses

#### Hypothesis 1: CSS Specificity Conflict
**Theory:** More specific vertical mode CSS may be overriding horizontal mode  
**Evidence:**
- Multiple identical `.section` rules in CSS
- Last rule at line 868-871 may override grid placements
- Vertical mode uses `flex: 0 0 400px` (strong specificity)

**Test:** Check CSS cascade order and specificity

#### Hypothesis 2: Grid Container Height Issue
**Theory:** Grid container not expanding to contain items properly  
**Evidence:**
- `grid-template-rows: auto auto` depends on content
- Items may be sized but container collapsed
- No explicit height on `.mian-div`

**Test:** Add `min-height` or explicit height to grid container

#### Hypothesis 3: Section Display Properties Conflict
**Theory:** Individual section flex properties override grid placement  
**Evidence:**
```css
.section-graph {
  display: flex;
  flex-direction: column;
  grid-column: 1; grid-row: 1;  // Grid placement
}
```
- Sections using `display: flex` internally
- May conflict with grid parent expectations

**Test:** Remove flex from sections, use grid-only layout

#### Hypothesis 4: Multiple .section Rules Conflict
**Theory:** Generic `.section` rules override specific placements  
**Evidence:**
```css
.screen[data-layout="horizontal"] .section {
  flex-direction: column;
  gap: 8px;
  display: flex;
  width: 100%;
}

.screen[data-layout="horizontal"] .section {
  align-items: center;
  align-self: stretch;
  position: relative;
  display: flex;
}
```
- Two identical selectors (lines 858, 866)
- Second rule may override grid placements
- `align-self: stretch` conflicts with `align-items: start`

**Test:** Consolidate `.section` rules, remove duplicates

#### Hypothesis 5: Browser Cache Issue
**Theory:** After Effects' Chromium not reloading CSS  
**Evidence:**
- User consistently reports "変わってない"
- rsync confirms file transfer successful
- Changes should be visible but aren't

**Test:** Force cache clear, restart extension

---

## Recommended Next Steps

### Priority 1: CSS Cascade Debugging
1. **Check for duplicate selectors**
   - Lines 858-871: Two `.section` rules
   - May be overriding grid placements
   
2. **Consolidate conflicting rules**
   ```css
   .screen[data-layout="horizontal"] .section {
     // Single unified rule
   }
   ```

### Priority 2: Grid Container Validation
1. **Add explicit sizing**
   ```css
   .screen[data-layout="horizontal"] .mian-div {
     min-height: 600px; // Ensure container expands
   }
   ```

2. **Test grid debugging**
   ```css
   .screen[data-layout="horizontal"] .mian-div {
     outline: 2px solid red; // Visual debug
   }
   ```

### Priority 3: Cache Invalidation
1. **Force extension reload**
   - Close panel completely
   - Reopen After Effects
   - Verify rsync timestamp matches

2. **Add cache-busting**
   ```html
   <link rel="stylesheet" href="styles.css?v=2">
   ```

### Priority 4: Simplification Test
1. **Minimal grid test**
   - Remove ALL flex properties from sections
   - Use only grid placement
   - Test if grid responds at all

---

## Technical Context

### File Paths
- **Source:** `/Users/shintarodanno/Library/CloudStorage/Dropbox/grapedesign/mogrt/Script/AccelCurve/AccelCurve/ext/`
- **Install:** `/Users/shintarodanno/Library/Application Support/Adobe/CEP/extensions/AccelCurve/ext/`
- **Data:** `~/Library/Application Support/AccelCurve/layoutMode.txt`

### Key Files
- `ext/index.html` - Structure
- `ext/styles.css` - Layout CSS (935 lines)
- `ext/main.js` - Toggle logic

### CSS Line References
- Line 685-696: `.mian-div` grid container
- Line 709-717: `.section-graph` placement
- Line 735-743: `.section-button` placement
- Line 793-804: `.section-group` placement
- Line 847-856: `.section-1` (presets) placement
- Line 858-871: **Duplicate `.section` rules** ⚠️

---

## User Feedback Pattern

User consistently provides clear requirements:
- "グラフのすぐ下" → Buttons directly below graph
- "グループ選択のすぐ下" → Presets directly below group
- "上詰めにできていない" → Not top-aligned
- "変わってない" → Changes not visible

**Interpretation:** Layout structure is wrong at a fundamental level, not just spacing/gaps.

---

## Conclusion

The grid structure is implemented correctly in theory, but visual changes are not taking effect. Most likely causes:

1. **CSS Specificity Conflict:** Duplicate `.section` rules overriding grid placements
2. **Flex/Grid Mixing:** Sections using flex display conflicting with grid parent
3. **Cache Issue:** Changes not loading in After Effects

**Immediate Action Required:**
- Investigate duplicate CSS rules (lines 858-871)
- Remove flex properties that conflict with grid
- Verify CSS is actually loading in extension
