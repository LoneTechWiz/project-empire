// Nations of Empire - Client-side scripts

// Auto-dismiss alerts after 5 seconds
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.alert-success').forEach(el => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    });
  }, 5000);

  // Confirm war declarations
  document.querySelectorAll('form[action*="/declare/"]').forEach(form => {
    form.addEventListener('submit', e => {
      if (!confirm('Are you sure you want to declare war? This cannot be easily undone.')) {
        e.preventDefault();
      }
    });
  });

  // Confirm nuke/missile attacks
  document.querySelectorAll('button[value="nuke"], input[value="nuke"]').forEach(btn => {
    btn.closest('form')?.addEventListener('submit', e => {
      if (!confirm('Launch nuclear strike? This is devastating!')) e.preventDefault();
    });
  });
});
