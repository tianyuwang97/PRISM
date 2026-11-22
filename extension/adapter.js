'use strict';
const PrismDeepSeekDOM = {
  finished(candidate) {
    const visible=node=>!!node&&node.getClientRects().length>0;
    // DeepSeek's icon-only footer does not always expose Copy/Regenerate labels.
    // Only inspect the current answer's subtree, never toolbars from older turns.
    for(let root=candidate.parentElement,depth=0;root&&depth<6;root=root.parentElement,depth++) {
      if(root.querySelector('textarea'))break;
      const messages=Array.from(root.querySelectorAll('.ds-markdown')).filter(visible);
      if(messages.length!==1||messages[0]!==candidate)break;
      const controls=Array.from(root.querySelectorAll('button,[role="button"],.ds-icon-button')).filter(visible);
      if(controls.some(e=>/停止生成|停止回答|Stop generating|Stop response/i.test([e.getAttribute('aria-label'),e.title,e.innerText].join(' '))))return false;
      const named=controls.some(e=>/复制|Copy|重新生成|Regenerate|重新回答/i.test([e.getAttribute('aria-label'),e.title,e.innerText].join(' ')));
      const footer=controls.filter(e=>!e.closest('.ds-markdown')&&e.querySelector('svg'));
      if(named||footer.length>=4)return true;
    }
    return false;
  }
};
