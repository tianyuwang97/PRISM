(() => {
  const root=document.documentElement;
  let theme='dark';
  try { theme=localStorage.getItem('prism-theme')==='light'?'light':'dark'; } catch {}
  function apply(value) {
    theme=value;root.dataset.theme=value;root.style.colorScheme=value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value==='light'?'#f5f6fa':'#08090f');
    const button=document.getElementById('themeButton');
    if(button){button.textContent=value==='light'?'深色模式':'亮色模式';button.setAttribute('aria-pressed',String(value==='light'));button.setAttribute('aria-label',value==='light'?'切换到深色模式':'切换到亮色模式');}
  }
  apply(theme);
  document.addEventListener('DOMContentLoaded',()=>{
    apply(theme);
    document.getElementById('themeButton')?.addEventListener('click',()=>{
      apply(theme==='dark'?'light':'dark');
      try { localStorage.setItem('prism-theme',theme); } catch {}
    });
  });
  window.addEventListener('storage',event=>{if(event.key==='prism-theme')apply(event.newValue==='light'?'light':'dark');});
})();
