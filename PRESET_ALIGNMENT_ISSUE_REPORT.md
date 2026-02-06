# Preset Alignment Issue Report
**Date:** 2025-12-05  
**Status:** Preset cards not top-aligned in horizontal mode  
**Critical:** Group section IS correctly top-aligned - only presets affected

---

## Problem Statement

**Symptom:**
- Group section (`.section-group`) is correctly positioned at top (上詰め) ✅
- Preset section (`.section-1`) is NOT top-aligned ❌
- Presets appear to be positioned "below the graph" vertically

**User Observation:**
> "グループ選択の位置は正しいのだ。なぜプリセットグラフだけ違うのか"

This indicates a **specific issue with `.section-1`** rather than a general grid layout problem.

---

## Current Grid Structure

```
Grid Layout: 3 columns × 2 rows
grid-template-columns: auto 4px 1fr;
grid-template-rows: auto 1fr;

+------------------+----+--------------------+
| Column 1 (auto)  | 4px| Column 3 (1fr)     |
+------------------+----+--------------------+
| Row 1 (auto):    |    | Row 1 (auto):      |
| .section-graph   | R  | .section-group ✅  |
| (300×300px)      | E  | (correctly aligned)|
|                  | S  |                    |
+------------------+ I  +--------------------+
| Row 2 (auto):    | Z  | Row 2 (1fr):       |
| .section-button  | E  | .section-1 ❌      |
| (top-aligned ✅) |    | (NOT aligned)      |
+------------------+----+--------------------+
```

---

## CSS Configuration

### Group Section (Working ✅)
```css
.screen[data-layout="horizontal"] .section-group {
  border: 0px none;
  display: flex;
  flex-direction: column;
  gap: 0px;
  justify-content: flex-start;
  width: 100%;
  grid-column: 3;
  grid-row: 1;
  align-self: start;  /* ← Top-aligned */
}
```

### Preset Section (Not Working ❌)
```css
.screen[data-layout="horizontal"] .section-1 {
  display: flex;
  flex-direction: column;
  gap: 0px;
  grid-column: 3;
  grid-row: 2;
  overflow: hidden;
  flex: 1;
  align-self: start !important;
  align-items: start !important;
  justify-content: flex-start !important;
}
```

### Generic Section Rule (Potential Conflict)
```css
.screen[data-layout="horizontal"] .section {
  flex-direction: column;
  gap: 8px;
  display: flex;
  align-items: center;  /* ← May override .section-1 */
  position: relative;
}
```

**HTML Structure:**
```html
<section class="section-1 section">
  <!-- Both classes applied! -->
</section>
```

---

## Attempted Solutions (All Failed)

### Attempt 1: align-self: start
```css
.section-1 { align-self: start; }
```
**Result:** ❌ No change

### Attempt 2: align-items: start
```css
.section-1 { align-items: start; }
```
**Result:** ❌ No change

### Attempt 3: justify-content: flex-start
```css
.section-1 { justify-content: flex-start; }
```
**Result:** ❌ No change

### Attempt 4: Grid Row Change
```css
grid-template-rows: auto auto → auto 1fr;
```
**Result:** ❌ No change

### Attempt 5: !important Force
```css
.section-1 {
  align-self: start !important;
  align-items: start !important;
  justify-content: flex-start !important;
}
```
**Result:** ❌ No change

### Attempt 6: align-content on .div-preset
```css
.div-preset { align-content: flex-start; }
```
**Result:** ❌ No change

---

## Critical Analysis

### What We Know Works
✅ Group section top-alignment (same grid column, row 1)  
✅ Button section top-alignment (column 1, row 2)  
✅ Grid structure is active (left/right separation)  
✅ CSS is being loaded (other changes take effect)

### What Doesn't Work
❌ Preset section top-alignment (column 3, row 2)  
❌ All CSS alignment properties on `.section-1`  
❌ `!important` overrides  
❌ Grid row configuration changes

### Key Observation
**Group and Presets are in the SAME column (3) but DIFFERENT rows:**
- Group (row 1): Works ✅
- Presets (row 2): Doesn't work ❌

This suggests the problem is **row-specific**, not column-specific.

---

## Hypotheses

### Hypothesis 1: Grid Row 2 with `1fr` Causing Vertical Centering
**Theory:**  
`grid-template-rows: auto 1fr` makes row 2 fill remaining space. Grid items in `1fr` rows may default to vertical center.

**Evidence:**
- Row 1 (auto): Items align correctly
- Row 2 (1fr): Items don't align

**Test:**
```css
grid-template-rows: auto auto; /* Both auto */
```
Already tried - didn't work.

**Alternative Test:**
```css
.section-1 { height: 100%; } /* Force full height */
```

### Hypothesis 2: Flex Container Height Distribution
**Theory:**  
`.section-1` has `flex: 1` which makes it grow, but content inside may be centered.

**Evidence:**
```css
.section-1 {
  flex: 1;           /* Grows to fill space */
  flex-direction: column;
  justify-content: flex-start; /* Should align top */
}
```

**Possible Issue:**  
The `flex: 1` might be interacting with grid `1fr` in unexpected ways.

**Test:**
```css
.section-1 { flex: 0 0 auto; } /* Remove flex grow */
```

### Hypothesis 3: Child Element (.div-preset) Positioning
**Theory:**  
The problem is not `.section-1` itself, but `.div-preset` inside it.

**Evidence:**
```css
.div-preset {
  flex: 1;
  flex-grow: 1;  /* Grows to fill parent */
}
```

If `.div-preset` has `flex: 1` and the parent (`.section-1`) is tall, the content might be distributed vertically.

**Test:**
Check if `.div-preset` itself needs alignment, not `.section-1`:
```css
.div-preset {
  align-self: flex-start;
  flex: 0 0 auto; /* Don't grow */
}
```

### Hypothesis 4: CSS Cascade/Specificity Issue Despite !important
**Theory:**  
Even with `!important`, another rule is overriding.

**Evidence:**
- `!important` should be absolute
- But multiple files or inline styles could override

**Test:**
Inspect actual computed styles in dev tools (not available)

**Alternative:**
Add a test color to verify CSS is loading:
```css
.section-1 {
  background: red !important; /* Visual test */
}
```

### Hypothesis 5: Grid Cell Alignment vs Content Alignment Confusion
**Theory:**  
We're confusing **grid cell alignment** with **content inside cell alignment**.

**Grid Cell Alignment** (how cell sits in grid):
- `align-self: start` ← Controls cell position in grid area
- `justify-self: start`

**Content Alignment** (how content sits in cell):
- `align-items: start` ← Controls child positioning
- `justify-content: start`

**Current Setup:**
```css
.section-1 {
  align-self: start;      /* Cell in grid */
  align-items: start;     /* Content in cell */
  justify-content: start; /* Content in cell */
}
```

**Possible Issue:**  
Grid row 2 is `1fr`, so the grid cell itself might be stretching, even if content is top-aligned within the cell.

**Test:**
```css
.section-1 {
  align-self: start;  /* Keep cell at top */
  height: auto;       /* Don't stretch */
}
```

### Hypothesis 6: Browser/CEP Rendering Bug
**Theory:**  
CEP's Chromium may have a bug with `grid-template-rows: 1fr` and `align-self`.

**Evidence:**
- All logical CSS attempts fail
- No change despite `!important`

**Test:**
Use absolute positioning as workaround:
```css
.section-1 {
  position: absolute;
  top: [group-height];
  left: 0;
}
```
(Not practical, but would prove the theory)

---

## Recommended Next Steps

### Priority 1: Test .div-preset Flex Properties
`.div-preset` has `flex: 1` which may be causing vertical distribution:

```css
.screen[data-layout="horizontal"] .div-preset {
  flex: 0 0 auto;  /* Remove flex grow */
  flex-grow: 0;
  align-self: flex-start;
}
```

### Priority 2: Test .section-1 Flex Properties
`.section-1` also has `flex: 1`:

```css
.screen[data-layout="horizontal"] .section-1 {
  flex: 0 0 auto;  /* Remove flex grow */
  height: auto;    /* Let content determine height */
}
```

### Priority 3: Visual Debug Test
Add visible markers to confirm CSS is loading:

```css
.screen[data-layout="horizontal"] .section-1 {
  outline: 3px solid red !important;
  background: yellow !important;
}

.screen[data-layout="horizontal"] .div-preset {
  outline: 3px solid blue !important;
  background: green !important;
}
```

If colors don't appear → CSS not loading  
If colors appear but position wrong → Layout issue confirmed

### Priority 4: Simplification Test
Remove ALL flex properties from `.section-1`:

```css
.screen[data-layout="horizontal"] .section-1 {
  display: block;  /* Remove flex entirely */
  grid-column: 3;
  grid-row: 2;
}
```

### Priority 5: Inspect Vertical Mode CSS
Compare with working vertical mode:

```css
.screen[data-layout="vertical"] .section-1 {
  /* Check what properties are used */
}
```

If vertical mode doesn't have `flex: 1`, that's the culprit.

---

## Technical Context

### Files
- `ext/styles.css` line 847-857: `.section-1` definition
- `ext/styles.css` line 820-824: `.div-preset` definition
- `ext/styles.css` line 859-864: Generic `.section` rule
- `ext/index.html` line 117: HTML structure

### Grid Cell Details
- **Column 3:** `1fr` (flexible width)
- **Row 2:** `1fr` (flexible height) ← Suspicious
- **Cell:** Should be top-aligned via `align-self: start`

### User Observation Pattern
- "変わってない" repeated many times
- Indicates CSS changes not taking effect OR wrong property being changed
- Group section works, so grid IS functional
- Problem is isolated to `.section-1` specifically

---

## Conclusion

The issue is **NOT**:
- Grid structure (works for group/buttons)
- CSS loading (other changes work)
- Specificity (tried `!important`)

The issue **LIKELY IS**:
1. **`.section-1 { flex: 1 }`** combined with **`grid-row: 2 (1fr)`** causing double-flex distribution
2. **`.div-preset { flex: 1 }`** distributing content vertically within the cell
3. Confusion between grid cell alignment and flexbox content alignment

**Most Promising Solution:**
Remove `flex: 1` from both `.section-1` and `.div-preset` to prevent vertical distribution.

**Next Action:**
Test flex removal on `.div-preset` first (least invasive change).
