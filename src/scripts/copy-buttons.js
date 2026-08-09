/* Binds every button carrying `data-copy`: writes the text to the clipboard
 * and briefly flips the button's `.copy-label` to confirm. */

for (const button of document.querySelectorAll("button[data-copy]")) {
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
    const label = button.querySelector(".copy-label");
    if (!label || button.classList.contains("copied")) return;
    const original = label.textContent;
    button.classList.add("copied");
    label.textContent = "Copied";
    setTimeout(() => {
      button.classList.remove("copied");
      label.textContent = original;
    }, 1400);
  });
}
