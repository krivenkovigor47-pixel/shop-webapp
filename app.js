const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentCat = 'all';

document.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderProducts();
    setupEvents();
    updateCartBtn();
});

function renderCategories() {
    const container = document.getElementById('categories');
    container.innerHTML = CATEGORIES.map(c => 
        `<button class="cat-btn ${c.id === currentCat ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>`
    ).join('');
}

function renderProducts(search = '') {
    const container = document.getElementById('products');
    let items = PRODUCTS_DATA;
    
    // Фильтр по категории
    if (currentCat !== 'all') {
        items = items.filter(p => p.category === currentCat);
    }
    
    // Поиск
    if (search) {
        items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    // Если товаров нет
    if (!items.length) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📭</div>
                <div class="empty-text">Товаров пока нет</div>
                <div class="empty-hint">Скоро добавим новые товары!</div>
            </div>
        `;
        return;
    }
    
    // Отображение товаров
    container.innerHTML = items.map(p => {
        const final = Math.round(p.price * (1 - p.discount / 100));
        return `
            <div class="product" onclick="openProduct(${p.id})">
                <div class="product-badge">-${p.discount}%</div>
                <img class="product-img" src="${p.image}" alt="${p.name}" 
                     onerror="this.src='https://via.placeholder.com/200?text=Фото'">
                <div class="product-name">${p.name}</div>
                <div class="product-prices">
                    <span class="old-price">${p.price}₽</span>
                    <span class="new-price">${final}₽</span>
                </div>
                <div class="product-info">
                    <span>⭐ ${p.rating}</span>
                    <span>📦 ${p.sold} продано</span>
                </div>
            </div>
        `;
    }).join('');
}

function openProduct(id) {
    const p = PRODUCTS_DATA.find(x => x.id === id);
    if (!p) return;
    
    const final = Math.round(p.price * (1 - p.discount / 100));
    const modal = document.getElementById('modal');
    const box = document.getElementById('modal-box');
    
    box.innerHTML = `
        <button class="modal-close" onclick="closeModal()">×</button>
        <img class="modal-img" src="${p.image}" 
             onerror="this.src='https://via.placeholder.com/400?text=Фото'">
        <div class="modal-name">${p.name}</div>
        <div class="modal-desc">${p.description}</div>
        <div class="modal-price-box">
            <div class="modal-old">${p.price}₽</div>
            <div class="modal-new">${final}₽</div>
        </div>
        <div class="modal-btns">
            <button class="btn btn-cart" onclick="addToCart(${p.id}); closeModal();">
                🛒 В корзину
            </button>
            <button class="btn btn-buy" onclick="buyNow(${p.id})">
                ⚡ Купить
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function addToCart(id) {
    const existing = cart.find(x => x.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id, qty: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBtn();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function removeFromCart(id) {
    cart = cart.filter(x => x.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBtn();
    openCart();
}

function updateCartBtn() {
    const btn = document.getElementById('cart-btn');
    const count = document.getElementById('cart-count');
    const sum = document.getElementById('cart-sum');
    
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    const totalSum = cart.reduce((s, i) => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        if (!p) return s;
        return s + Math.round(p.price * (1 - p.discount / 100)) * i.qty;
    }, 0);
    
    if (totalQty > 0) {
        btn.style.display = 'flex';
        count.textContent = totalQty;
        sum.textContent = totalSum + '₽';
    } else {
        btn.style.display = 'none';
    }
}

function openCart() {
    const modal = document.getElementById('modal');
    const box = document.getElementById('modal-box');
    
    if (!cart.length) {
        box.innerHTML = `
            <button class="modal-close" onclick="closeModal()">×</button>
            <div class="empty">
                <div class="empty-icon">🛒</div>
                <div class="empty-text">Корзина пуста</div>
                <div class="empty-hint">Добавьте товары из каталога</div>
            </div>
        `;
        modal.classList.add('active');
        return;
    }
    
    let itemsHtml = cart.map(i => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        if (!p) return '';
        const price = Math.round(p.price * (1 - p.discount / 100));
        return `
            <div class="cart-item">
                <img src="${p.image}" onerror="this.src='https://via.placeholder.com/60?text=?'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${p.name}</div>
                    <div class="cart-item-price">${price}₽ × ${i.qty} = ${price * i.qty}₽</div>
                </div>
                <button class="cart-item-del" onclick="removeFromCart(${i.id})">×</button>
            </div>
        `;
    }).join('');
    
    const subtotal = cart.reduce((s, i) => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return s + (p ? p.price * i.qty : 0);
    }, 0);
    
    const total = cart.reduce((s, i) => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return s + (p ? Math.round(p.price * (1 - p.discount / 100)) * i.qty : 0);
    }, 0);
    
    const discount = subtotal - total;
    
    box.innerHTML = `
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2 style="margin-bottom:20px;">🛒 Корзина</h2>
        ${itemsHtml}
        <div class="cart-total">
            <div class="cart-row">
                <span>Сумма</span>
                <span>${subtotal}₽</span>
            </div>
            <div class="cart-row">
                <span>Скидка</span>
                <span style="color:#4ade80;">-${discount}₽</span>
            </div>
            <div class="cart-row final">
                <span>Итого</span>
                <span>${total}₽</span>
            </div>
        </div>
        <button class="cart-checkout" onclick="checkout()">
            💬 Оформить заказ — ${total}₽
        </button>
    `;
    
    modal.classList.add('active');
}

function buyNow(id) {
    cart = [{ id, qty: 1 }];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBtn();
    checkout();
}

function checkout() {
    const items = cart.map(i => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return { 
            name: p.name, 
            price: Math.round(p.price * (1 - p.discount / 100)), 
            qty: i.qty 
        };
    });
    
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    
    // Отправка данных в бота
    tg.sendData(JSON.stringify({ action: 'order', items, total }));
    
    // Очистка корзины
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBtn();
    
    tg.close();
}

function setupEvents() {
    // Переключение категорий
    document.getElementById('categories').addEventListener('click', e => {
        if (e.target.classList.contains('cat-btn')) {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCat = e.target.dataset.cat;
            renderProducts(document.getElementById('search').value);
            if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        }
    });
    
    // Поиск
    document.getElementById('search').addEventListener('input', e => {
        renderProducts(e.target.value);
    });
}
