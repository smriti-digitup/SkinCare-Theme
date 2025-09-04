class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);

/* cart-drawer.js */
document.addEventListener('DOMContentLoaded', () => {
  
  const wrapper = document.querySelector('.cart-progress-wrapper');
  if (!wrapper) return console.warn("❌ wrapper not found");

  const fill = document.getElementById('progress-bar-fill');
  const message = document.getElementById('reward-message');

  const rewardAddedMap = {};
  let currentCart = null;

  async function fetchCart() {
    if (currentCart) return currentCart;
    const res = await fetch('/cart.js');
    if (!res.ok) throw new Error('Failed to fetch cart');
    currentCart = await res.json();
    return currentCart;
  }

  async function addRewardProductByHandle(handle) {
    if (!handle) return; // 🛑 Skip if no product (e.g., Free Shipping)
    if (rewardAddedMap[handle]) {
      console.log(`⚠️ Reward for ${handle} already added or being added`);
      return;
    }
    rewardAddedMap[handle] = true;

    try {
      const productRes = await fetch(`/products/${handle}.js`);
      if (!productRes.ok) throw new Error('Product handle not found');
      const product = await productRes.json();
      const variantId = product.variants[0].id;

      const cart = await fetchCart();
      const inCart = cart.items.some(item => item.variant_id === variantId);

      if (inCart) {
        console.log(`ℹ️ Reward product ${handle} already in cart`);
        return;
      }

      const addRes = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });

      if (!addRes.ok) throw new Error('Failed to add product to cart');

      const added = await addRes.json();
      console.log("✅ Reward product added:", added);

      currentCart = null;
      document.dispatchEvent(new CustomEvent("cart:updated"));
    } catch (err) {
      console.error(`❌ Failed to add reward product ${handle}:`, err);
    }
  }

  function updateProgressBar(cart) {
    const cartTotal = cart.total_price / 100;

    const rewards = [1, 2, 3, 4].map(i => {
      const amountRaw = wrapper.dataset[`reward${i}`];
      const amount = amountRaw !== undefined ? parseInt(amountRaw, 10) : null;
      return {
        amount: (amount !== null && !isNaN(amount) && amount >= 0) ? amount : null,
        reward: wrapper.dataset[`reward${i}Text`] || '',
        productHandle: wrapper.dataset[`reward${i}Product`] || '',
      };
    }).filter(r => r.amount !== null);

    if (rewards.length === 0) {
      fill.style.width = '0%';
      message.textContent = 'No rewards configured.';
      return;
    }

    const maxValue = rewards[rewards.length - 1].amount || 1;
    fill.style.width = Math.min((cartTotal / maxValue) * 100, 100) + '%';

    let unlocked = null;
    for (let i = rewards.length - 1; i >= 0; i--) {
      if (cartTotal >= rewards[i].amount) {
        unlocked = rewards[i];
        break;
      }
    }

    if (unlocked) {
      message.textContent = `🎉 You unlocked ${unlocked.reward}`;
      if (unlocked.productHandle) {
        console.log("➕ Attempting to add reward product:", unlocked.productHandle);
        addRewardProductByHandle(unlocked.productHandle);
      } else {
        console.log("🛍️ No product to add (e.g., Free Shipping):", unlocked.reward);
      }
    } else {
      const nextReward = rewards.find(r => cartTotal < r.amount);
      if (nextReward) {
        const remaining = nextReward.amount - cartTotal;
        message.textContent = `Add ₹${remaining.toFixed(0)} more to unlock ${nextReward.reward}`;
      }
    }
  }

  async function fetchCartAndUpdateProgress() {
    try {
      const cart = await fetchCart();
      updateProgressBar(cart);
    } catch (err) {
      console.error("❌ Failed to fetch cart:", err);
    }
  }

  fetchCartAndUpdateProgress();
  document.addEventListener('cart:updated', () => {
    currentCart = null;
    fetchCartAndUpdateProgress();
  });
});

