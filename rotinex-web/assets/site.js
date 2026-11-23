document.querySelectorAll(".area-choice").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".area-choice").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#area-title").textContent = button.textContent;
    document.querySelector("#area-description").textContent = button.dataset.description;
    const image = document.querySelector("#area-image");
    image.src = button.dataset.image;
    image.alt = button.textContent;
  });
});
