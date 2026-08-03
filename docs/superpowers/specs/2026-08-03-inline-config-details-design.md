# Inline configuration details design

## Goal

Show the clicked configuration's rule details immediately below its row in the near-miss table, without moving the viewport. Remove the duplicate weaker-win-rate chart section.

## Interaction

- A configuration ID button toggles a single inline details row directly after its table row.
- Clicking the open configuration ID closes its details row.
- Clicking another configuration closes the previous details row and opens the new one.
- No selection click scrolls the document.
- The inline row presents the same eight actual optimization parameters in the active KR or EN language.

## Presentation

- Remove the top selected-configuration panel and the duplicate weaker-asset bar chart.
- Use a pale green inline details surface with a clear heading and compact four-column rule grid on desktop, one column on small screens.
- Improve table row hover and selected treatment, keep buttons accessible with visible keyboard focus, and preserve horizontal scrolling on narrow screens.

## Verification

- Static verification asserts the inline details marker and the absence of the removed chart heading.
- JavaScript syntax and static deployment verification must pass.
