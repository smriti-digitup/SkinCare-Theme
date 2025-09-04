document.addEventListener("DOMContentLoaded", function () {
  const galleryContainer = document.querySelector(".gallery-container");
  const galleryItems = document.querySelectorAll(".gallery-item");
  const galleryContents = document.querySelectorAll(".gallery-content");
  const prevButton = document.querySelector(".gallery-controls-previous");
  const nextButton = document.querySelector(".gallery-controls-next");

  // Assign 1-based data-index for content matching
  galleryItems.forEach((item, index) => {
    item.setAttribute("data-index", index + 1);
  });

  class Carousel {
    constructor(container, items, contents) {
      this.carouselContainer = container;
      this.carouselItems = [...items];
      this.contentItems = [...contents];
      this.positionClasses = [
        "gallery-item-1",
        "gallery-item-2",
        "gallery-item-3",
        "gallery-item-4",
        "gallery-item-5",
        "gallery-item-6",
        "gallery-item-7",
      ];
      this.updateGallery();
    }

    updateGallery() {
      // Remove previous classes and opacity
      this.carouselItems.forEach((el) => {
        el.classList.remove(...this.positionClasses);
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      });

      // Apply position classes and show only first 7 items
      this.carouselItems.slice(0, 7).forEach((el, i) => {
        el.classList.add(this.positionClasses[i]);
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
      });

      this.updateContent();
    }

    updateContent() {
      const centerImage = document.querySelector(".gallery-item-4");
      if (!centerImage) return;
      const centerIndex = centerImage.dataset.index;

      this.contentItems.forEach((content) => {
        content.style.display = "none";
      });

      const activeContent = document.querySelector(
        `.gallery-content-${centerIndex}`
      );
      if (activeContent) {
        activeContent.style.display = "block";
      }
    }

    setCurrentState(direction) {
      if (direction === "previous") {
        const last = this.carouselItems.pop();
        this.carouselItems.unshift(last);
      } else {
        const first = this.carouselItems.shift();
        this.carouselItems.push(first);
      }
      this.updateGallery();
    }
  }

  const carousel = new Carousel(galleryContainer, galleryItems, galleryContents);

  prevButton.addEventListener("click", () => carousel.setCurrentState("previous"));
  nextButton.addEventListener("click", () => carousel.setCurrentState("next"));
});
