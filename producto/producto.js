// Carrito + abre el carrito de Shopify con la cantidad seleccionada (NO checkout directo)

document.addEventListener('DOMContentLoaded', function () {
  // CONFIG
  const SHOP_DOMAIN = 'tiendaflowshop.store';
  const DEFAULT_VARIANT_ID = '49913153028391';

  // Estado global
  window.allProducts = window.allProducts || [];
  let total = 0;
  let countProducts = 0;

  // Selectores
  const inputCantidad = document.getElementById('cantidadProducto');
  const buyAnchors = Array.from(document.querySelectorAll('.btn-comprar'));
  const agregarBtns = Array.from(document.querySelectorAll('.agregar-carro'));
  const btnComprarCarrito = document.getElementById('btnComprar');
  const cartBtn = document.getElementById('cartBtn');
  const cartContainer = document.getElementById('cartContainer');
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const totalPagar = document.getElementById('total-pagar');
  const btnVaciarCarro = document.getElementById('btnVaciarCarro');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartCountBadge = document.getElementById('cart-count-badge');

  // Abrir/cerrar carrito
  function abrirCarrito(){ if(!cartContainer) return; cartContainer.classList.remove('hidden-cart','anim-out'); cartContainer.classList.add('anim-in'); if(cartOverlay) cartOverlay.classList.add('active'); }
  function cerrarCarrito(){ if(!cartContainer) return; cartContainer.classList.remove('anim-in'); cartContainer.classList.add('anim-out'); if(cartOverlay) cartOverlay.classList.remove('active'); setTimeout(()=>cartContainer.classList.add('hidden-cart'),450); }
  if(cartBtn) cartBtn.addEventListener('click', abrirCarrito);
  if(cartCloseBtn) cartCloseBtn.addEventListener('click', cerrarCarrito);
  if(cartOverlay) cartOverlay.addEventListener('click', cerrarCarrito);

  // Persistencia
  function saveCart(){ try{ localStorage.setItem('ecpCart', JSON.stringify(window.allProducts)); }catch(e){} }
  function loadCart(){ try{ const raw = localStorage.getItem('ecpCart'); if(!raw) return; const parsed = JSON.parse(raw); if(Array.isArray(parsed)) window.allProducts = parsed; }catch(e){ console.warn('No se pudo cargar carrito', e); } }
  loadCart();

  // UI carrito
  function updateCartUI(){
    if(!cartItems || !cartEmpty) return;
    cartItems.innerHTML = '';
    if(!window.allProducts.length){ if(cartEmpty) cartEmpty.style.display='block'; }
    else {
      if(cartEmpty) cartEmpty.style.display='none';
      window.allProducts.forEach(product=>{
        const item = document.createElement('div');
        item.className = 'cart-product';
        item.innerHTML = `
          <div class="cart-product-img">
            <span class="cantidad-producto-carrito">${product.quantity}</span>
            <img src="${product.img}" alt="${escapeHtml(product.nameProduct)}" />
          </div>
          <div class="info-cart-product">
            <p class="titulo-producto-carrito">${escapeHtml(product.nameProduct)}</p>
            <span class="precio-producto-carrito">$${Number(product.price).toLocaleString('es-CL')}</span>
          </div>
          <button class="eliminar-producto" data-id="${product.id}">Eliminar</button>
        `;
        cartItems.appendChild(item);
      });
      cartItems.querySelectorAll('.eliminar-producto').forEach(btn=>{
        btn.addEventListener('click', function(){ const id = parseInt(this.getAttribute('data-id'),10); onDeleteProduct(id); document.dispatchEvent(new Event('ecp:cart-updated')); });
      });
    }
    total = window.allProducts.reduce((acc,p)=> acc + (Number(p.price)||0)*(Number(p.quantity)||0), 0);
    countProducts = window.allProducts.reduce((acc,p)=> acc + (Number(p.quantity)||0), 0);
    if(totalPagar) totalPagar.textContent = `$${total.toLocaleString('es-CL')}`;
    if(cartCountBadge){ if(countProducts>0){ cartCountBadge.textContent = countProducts; cartCountBadge.style.display='inline-block'; } else cartCountBadge.style.display='none'; }
    saveCart();
    updateBuyLinks();
  }

  // gestión carrito
  function onAddProduct(product){ const found = window.allProducts.find(p=>p.id===product.id); if(found) found.quantity = Number(found.quantity||0) + Number(product.quantity||0); else window.allProducts.push({...product}); updateCartUI(); }
  function onDeleteProduct(id){ window.allProducts = window.allProducts.filter(p=>p.id!==id); updateCartUI(); }

  // agregar botones
  agregarBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cantidad = parseInt(inputCantidad ? inputCantidad.value : 1, 10) || 1;
      const product = { id:1, nameProduct:'Easy Clean Pro', price:35000, quantity:cantidad, img:'Imagen de WhatsApp 2025-05-25 a las 20.39.39_7e4afa66.jpg', variantId: DEFAULT_VARIANT_ID };
      onAddProduct(product);
      abrirCarrito();
      const feedback = document.getElementById('productoFeedback');
      if(feedback){ feedback.textContent='Producto añadido al carrito'; feedback.style.color='#2563eb'; setTimeout(()=>feedback.textContent='',1600); }
      document.dispatchEvent(new Event('ecp:cart-updated'));
    });
  });

  // control cantidad UI
  const btnSumar = document.getElementById('sumarCantidad');
  const btnRestar = document.getElementById('restarCantidad');
  if(btnSumar && btnRestar && inputCantidad){
    btnSumar.addEventListener('click', ()=>{ let v = parseInt(inputCantidad.value||'1',10)||1; const max = parseInt(inputCantidad.max||'999',10); if(v<max) inputCantidad.value=String(v+1); document.dispatchEvent(new Event('ecp:cart-qty-changed')); });
    btnRestar.addEventListener('click', ()=>{ let v = parseInt(inputCantidad.value||'1',10)||1; const min = parseInt(inputCantidad.min||'1',10); if(v>min) inputCantidad.value=String(v-1); document.dispatchEvent(new Event('ecp:cart-qty-changed')); });
    inputCantidad.addEventListener('change', ()=>{ document.dispatchEvent(new Event('ecp:cart-qty-changed')); });
  }

  if(btnVaciarCarro) btnVaciarCarro.addEventListener('click', ()=>{ window.allProducts = []; updateCartUI(); document.dispatchEvent(new Event('ecp:cart-updated')); });

  // Construir URL del carrito con cantidad seleccionada
  function buildShopifyCartUrl(items){
    if(!Array.isArray(items) || items.length===0) return null;
    const path = items.map(p=>{
      const variant = p.variantId || p.variant || p.id || DEFAULT_VARIANT_ID;
      const qty = Math.max(1, parseInt(p.quantity||1,10));
      return `${variant}:${qty}`;
    }).join(',');
    return `https://${SHOP_DOMAIN}/cart/${path}`;
  }

  // Para "Comprar ahora" usar SIEMPRE la cantidad del selector
  buyAnchors.forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      let qty = 1;
      if (inputCantidad) qty = parseInt(inputCantidad.value, 10) || 1;
      const url = buildShopifyCartUrl([{ variantId: DEFAULT_VARIANT_ID, quantity: qty }]);
      window.open(url, '_blank', 'noopener');
    });
  });

  // El resto del código de carrito y utilidades permanece igual...
  function updateBuyLinks(){
    let qty = 1;
    if (inputCantidad) qty = parseInt(inputCantidad.value, 10) || 1;
    const hrefBuyNow = buildShopifyCartUrl([{ variantId: DEFAULT_VARIANT_ID, quantity: qty }]);
    buyAnchors.forEach(a=>a.setAttribute('href', hrefBuyNow));
    buyAnchors.forEach(a=>a.setAttribute('data-checkout-url', hrefBuyNow));
    if(btnComprarCarrito) btnComprarCarrito.setAttribute('data-checkout-url', hrefBuyNow);
  }

  document.addEventListener('ecp:cart-updated', updateBuyLinks);
  document.addEventListener('ecp:cart-qty-changed', updateBuyLinks);
  if(cartItems){
    const mo = new MutationObserver(()=>updateBuyLinks());
    mo.observe(cartItems, { childList:true, subtree:true, attributes:true, characterData:true });
  }
  updateCartUI();
  updateBuyLinks();

  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

});