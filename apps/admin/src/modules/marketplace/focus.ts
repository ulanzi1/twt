// Focus moves for results that arrive LATE — Story 12.2 code review (patch-diff PT2).
//
// A page may move focus when its own action finishes (the pressed control unmounted or was disabled under focus), but ⛔ when
// the admin has moved on in the meantime: a late "Load more", registration or page load must not pull focus back from wherever
// they went. Focus is "unclaimed" when nothing holds it (`<body>` / null) or it is still on the control that started the action.

/** True when nothing holds focus, or it is on (or inside) one of `owners`. */
export function focusIsUnclaimed(...owners: (Element | null | undefined)[]): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  return owners.some((o) => o !== null && o !== undefined && (o === active || o.contains(active)));
}

/** Focus `target` unless the admin has moved focus elsewhere since the action started. */
export function focusIfUnclaimed(target: HTMLElement | null | undefined, ...owners: (Element | null | undefined)[]): void {
  if (target !== null && target !== undefined && focusIsUnclaimed(...owners)) target.focus();
}
