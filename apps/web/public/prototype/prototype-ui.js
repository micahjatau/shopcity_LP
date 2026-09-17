/* Static prototype adapter for the installed shadcn/Lucide stack.
 * React screens use lucide-react directly; these pages use the same icon geometry
 * without a remote dependency or a second icon library.
 */
(function () {
  const icon = (body) => `<svg class="sc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const icons = {
    search: icon('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>'),
    bell: icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>'),
    layout: icon('<rect x="4" y="4" width="6" height="6"></rect><rect x="14" y="4" width="6" height="6"></rect><rect x="4" y="14" width="6" height="6"></rect><rect x="14" y="14" width="6" height="6"></rect>'),
    users: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>'),
    userPlus: icon('<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path>'),
    creditCard: icon('<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path>'),
    receipt: icon('<path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2l-4 2-3-2-3 2-3-2-3 2Z"></path><path d="M8 8h8M8 12h8M8 16h5"></path>'),
    circleHelp: icon('<circle cx="12" cy="12" r="10"></circle><path d="M9.1 9a3 3 0 1 1 5.4 1.8c-.9 1-2.5 1.4-2.5 3.2M12 17h.01"></path>'),
    logOut: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5M21 12H9"></path>'),
    scanLine: icon('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><path d="M7 12h10"></path>'),
    plus: icon('<path d="M12 5v14M5 12h14"></path>'),
    arrowRight: icon('<path d="M5 12h14M13 6l6 6-6 6"></path>'),
    arrowLeft: icon('<path d="M19 12H5M11 18l-6-6 6-6"></path>'),
    x: icon('<path d="M6 6l12 12M18 6 6 18"></path>'),
    circleCheck: icon('<path d="m9 12 2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle>'),
    eyeOff: icon('<path d="m3 3 18 18"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6-1 2-4.5 6-9.5 6-1 0-2-.2-2.9-.5M6.2 6.2C4.4 7.4 3.3 9 2.5 10c.5 1 1.3 2.1 2.4 3"></path>'),
    eye: icon('<path d="M2.1 12s3.4-7 9.9-7 9.9 7 9.9 7-3.4 7-9.9 7-9.9-7-9.9-7Z"></path><circle cx="12" cy="12" r="3"></circle>'),
    listChecks: icon('<path d="M8 6h13M8 12h13M8 18h13"></path><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"></path>')
  };
  const mount = (node, name) => {
    if (node && icons[name]) {
      node.classList.add('sc-icon-slot');
      node.innerHTML = icons[name];
    }
  };
  document.querySelectorAll('.search > span[aria-hidden="true"]').forEach(node => mount(node, 'search'));
  document.querySelectorAll('[data-sc-icon]').forEach(node => mount(node, node.dataset.scIcon));
  const passwordToggle = document.getElementById('toggle-password');
  if (passwordToggle) passwordToggle.addEventListener('click', () => {
    const slot = passwordToggle.querySelector('[data-sc-icon]');
    if (slot) { slot.dataset.scIcon = document.getElementById('password')?.type === 'text' ? 'eye' : 'eyeOff'; mount(slot, slot.dataset.scIcon); }
  });
  document.querySelectorAll('.panel, .table-card, .search-card, .recent-card').forEach(node => node.classList.add('sc-card'));

  // Static equivalents of shadcn/ui Button. The data-slot/data-variant
  // attributes make the primitive inspectable and keep variants consistent
  // across pages without importing React into the standalone prototypes.
  document.querySelectorAll('button, a.btn, .btn').forEach(node => {
    if (node.classList.contains('icon-btn') || node.classList.contains('toggle') || node.classList.contains('modal-close')) return;
    node.classList.add('sc-button', 'shadcn-btn');
    node.setAttribute('data-slot', 'button');
    const variant = node.classList.contains('btn-primary') || node.classList.contains('action-primary') || node.classList.contains('submit')
      ? 'default'
      : node.classList.contains('forgot') || node.classList.contains('btn-ghost')
        ? 'ghost'
        : 'outline';
    node.setAttribute('data-variant', variant);
  });
  // Static equivalents of shadcn/ui form controls. Preserve radio/checkbox
  // semantics while giving text-like controls a shared Input/Select/Textarea slot.
  document.querySelectorAll('input, select, textarea').forEach(node => {
    const type = (node.getAttribute('type') || 'text').toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      node.classList.add('sc-choice');
      node.setAttribute('data-slot', type);
      return;
    }
    const slot = node.tagName.toLowerCase() === 'select'
      ? 'select'
      : node.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'input';
    node.classList.add(slot === 'input' ? 'sc-input' : `sc-${slot}`);
    node.setAttribute('data-slot', slot);
  });
  document.querySelectorAll('.icon-btn, .toggle, .modal-close').forEach(node => {
    node.classList.add('sc-icon-button');
    node.setAttribute('data-slot', 'icon-button');
  });
})();
