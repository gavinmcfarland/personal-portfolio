---
title: A type scale with seven steps
date: 2026-06-28
summary: Eleven sizes were in play inside a four-pixel band. None of them were decisions.
tags: [type, css]
draft: true
---

This site's stylesheet once had eleven different type sizes living between 10 and
14 pixels. Not eleven roles — eleven *sizes*: `0.8rem`, `0.8125rem`, `0.84rem`,
`0.85rem` and `0.86rem` were all in the sheet at the same time, doing the same
job in different files.

Differences of half a pixel do not read as a register. They read as noise, and
they are noise, because nobody chose them: each one was picked at a call site by
someone matching what was next to it and being half a pixel out.

## The fix is a ceiling, not a ratio

```css title="src/app.css"
--text-1: 0.6875rem; /* 11px — chips, release tags, lettermark */
--text-2: 0.75rem;   /* 12px — footnotes, meta, captions, table heads */
--text-3: 0.8125rem; /* 13px — section labels, sub-labels, index entries */
--text-4: 0.875rem;  /* 14px — body: running text, panels, transcripts */
--text-5: 0.9375rem; /* 15px — the one emphatic step */
```

Registering them in `@theme` rather than `:root` is what makes it stick:
`text-3` becomes a real utility, so the scale is enforced by the stylesheet
instead of being a convention a specimen page merely records. A literal size at
a call site now looks like what it is.

They are numbered as steps rather than named for roles because a size usually
serves more than one role — 13px is both the section label and an index entry —
and a role-named token invites a near-duplicate the moment it doesn't quite fit.

## Flat type, and one exception

The doctrine underneath is that headings are not bigger. A section head is body
size given weight, tracking and uppercase; rank is carried by register and by
the space around it. Only the page title breaks the ceiling.

That single exception needs three cuts, and it is worth stating why rather than
discovering it:

1. A document page gets the full column and takes 28px, stepping to 36px at
   `sm`.
2. A project page's sidebar is about 256 pixels of content, and a 36px mono
   title wraps after nine characters.
3. So the sidebar takes 22px and stays there.

Two column widths, two cuts, stated. Before that, four different display pairs
were in the sheet for one role — 2/2.5rem on one page, 1.75/2rem on another —
which is the same failure as the eleven small sizes, one register up.

## The trap in a `ch` token

The indent stop is three characters wide, and for a while it was wrong
everywhere. `ch` is font-size-relative, and a custom property substitutes its
value as raw tokens — so `3ch` resolved against whichever element consumed it. A
body paragraph got three 14px characters, a sub-label three 13px ones, a caption
three 12px ones. Three different stops on one page.

```css title="src/app.css"
@property --stop {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}
```

Registering it as a `<length>` makes the browser compute the value where it is
*declared* rather than where it is used, and inherit the result as an absolute
length. Declared on `body`, so it computes to three characters of body text —
which is what "three monospace characters" was always meant to mean.

---

None of this is about the sizes being right. It is about there being seven of
them, and about the eighth one being hard to add by accident.
