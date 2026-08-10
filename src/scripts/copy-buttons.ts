/* Binds every button carrying `data-copy`: writes the text to the clipboard
 * and briefly flips the button's `.copy-label` to confirm.
 *
 * Both labels are stacked in a 1x1 inline grid, with the inactive one kept
 * invisible: the button is always as wide as its wider label, so confirming
 * cannot resize it or shift its neighbours. */

function stackLabels(label: Element): [HTMLSpanElement, HTMLSpanElement] {
  const idle = document.createElement("span");
  idle.textContent = label.textContent;
  const done = document.createElement("span");
  done.textContent = "Copied";
  done.style.visibility = "hidden";
  for (const span of [idle, done]) {
    span.style.gridArea = "1 / 1";
    span.style.justifySelf = "center";
  }
  label.replaceChildren(idle, done);
  (label as HTMLElement).style.display = "inline-grid";
  return [idle, done];
}

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "button[data-copy]",
)) {
  const label = button.querySelector(".copy-label");
  const spans = label ? stackLabels(label) : null;

  button.addEventListener("click", async () => {
    const text = button.dataset.copy ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be denied; fall back to a hidden textarea.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    if (!spans || button.classList.contains("copied")) return;
    const [idle, done] = spans;
    button.classList.add("copied");
    idle.style.visibility = "hidden";
    done.style.visibility = "visible";
    setTimeout(() => {
      button.classList.remove("copied");
      idle.style.visibility = "visible";
      done.style.visibility = "hidden";
    }, 1400);
  });
}
