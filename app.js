const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let cart = [];
let currentCat = 'all';

document.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderProducts();
    setupEvents();
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
    
    if (currentCat !== 'all') {
        items = items.filter(p => p.category === currentCat);
    }
    
    if (search) {
        items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (!items.length) {
        container.innerHTML = '<div class="empty">Товаров нет</div>';
        return;
    }
    
    container.innerHTML = items.map(p => {
        const final = Math.round(p.price * (1 - p.discount / 100));
        return `
            <div class="product" onclick="openProduct(${p.id})">
                <div class="product-badge">-${p.discount}%</div>
                <img class="product-img" src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200'">
                <div class="product-name">${p.name}</div>
                <div class="product-prices">
                    <span class="old-price">${p.price}₽</span>
                    <span class="new-price">${final}₽</span>
                </div>
                <div class="product-info">⭐${p.rating} · 📦${p.sold}</div>
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
        <img class="modal-img" src="${p.image}" onerror="this.src='https://via.placeholder.com/400'">
        <div class="modal-name">${p.name}</div>
        <div class="modal-desc">${p.description}</div>
        <div class="modal-price-box">
            <div class="modal-old">${p.price}₽</div>
            <div class="modal-new">${final}₽</div>
        </div>
        <div class="modal-btns">
            <button class="btn btn-cart" onclick="addToCart(${p.id}); closeModal();">🛒 В корзину</button>
            <button class="btn btn-buy" onclick="buyNow(${p.id})">⚡ Купить</button>
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
    if (existing) existing.qty++;
    else cart.push({ id, qty: 1 });
    updateCartBtn();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function removeFromCart(id) {
    cart = cart.filter(x => x.id !== id);
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
            <div class="empty">🛒 Корзина пуста</div>
        `;
        modal.classList.add('active');
        return;
    }
    
    let itemsHtml = cart.map(i => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        const price = Math.round(p.price * (1 - p.discount / 100));
        return `
            <div class="cart-item">
                <img src="${p.image}" onerror="this.src='https://via.placeholder.com/50'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${p.name}</div>
                    <div class="cart-item-price">${price}₽ × ${i.qty}</div>
                </div>
                <button class="cart-item-del" onclick="removeFromCart(${i.id})">×</button>
            </div>
        `;
    }).join('');
    
    const subtotal = cart.reduce((s, i) => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return s + p.price * i.qty;
    }, 0);
    
    const total = cart.reduce((s, i) => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return s + Math.round(p.price * (1 - p.discount / 100)) * i.qty;
    }, 0);
    
    box.innerHTML = `
        <button class="modal-close" onclick="closeModal()">×</button>
        <h2 style="margin-bottom:16px;">🛒 Корзина</h2>
        ${itemsHtml}
        <div class="cart-total">
            <div class="cart-row"><span>Сумма</span><span>${subtotal}₽</span></div>
            <div class="cart-row"><span>Скидка</span><span style="color:#4ade80;">-${subtotal - total}₽</span></div>
            <div class="cart-row final"><span>Итого</span><span>${total}₽</span></div>
        </div>
        <button class="btn btn-buy" style="width:100%;" onclick="checkout()">💬 Оформить — ${total}₽</button>
    `;
    
    modal.classList.add('active');
}

function buyNow(id) {
    cart = [{ id, qty: 1 }];
    updateCartBtn();
    checkout();
}

function checkout() {
    const items = cart.map(i => {
        const p = PRODUCTS_DATA.find(x => x.id === i.id);
        return { name: p.name, price: Math.round(p.price * (1 - p.discount / 100)), qty: i.qty };
    });
    
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    
    tg.sendData(JSON.stringify({ action: 'order', items, total }));
    tg.close();
}

function setupEvents() {
    document.getElementById('categories').addEventListener('click', e => {
        if (e.target.classList.contains('cat-btn')) {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCat = e.target.dataset.cat;
            renderProducts(document.getElementById('search').value);
            if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        }
    });
    
    document.getElementById('search').addEventListener('input', e => {
        renderProducts(e.target.value);
    });
}