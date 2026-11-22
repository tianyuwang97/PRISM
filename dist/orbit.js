const orbit = (() => {
  const svg = document.getElementById('connections');
  const form = document.getElementById('askForm');
  const flights = document.createElement('div');
  flights.className = 'light-flights';
  document.getElementById('universe').append(flights);
  const rims = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  rims.classList.add('rim-traces');
  rims.setAttribute('aria-hidden', 'true');
  flights.append(rims);
  let routes = [];
  let generation = 0;

  let idleWanted=false,idleTimer=null;
  const idleEffects=new Set();
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
  const reading=()=>!!document.querySelector('.answer-card.is-expanded,.answer-card.is-collapsing,dialog[open]');
  function clearIdleEffects(){
    for(const effect of idleEffects){effect.animation.cancel();effect.path.remove();}
    idleEffects.clear();
  }
  function idleWave(){
    clearTimeout(idleTimer);
    if(!idleWanted||document.hidden||reducedMotion.matches)return;
    if(!reading())routes.forEach((route,index)=>{
      if(!route.target.isConnected||!route.track.classList.contains('connected'))return;
      const path=route.track.cloneNode();path.setAttribute('class','idle-flow');
      path.removeAttribute('style');path.style.color=route.track.style.color;
      path.setAttribute('aria-hidden','true');svg.append(path);
      const animation=path.animate([
        {strokeDashoffset:10,opacity:0},
        {strokeDashoffset:0,opacity:.32,offset:.1},
        {strokeDashoffset:-88,opacity:.26,offset:.88},
        {strokeDashoffset:-100,opacity:0}
      ],{duration:3600,delay:index*720,easing:'linear',fill:'both'});
      const effect={path,animation};idleEffects.add(effect);
      animation.finished.then(()=>{path.remove();idleEffects.delete(effect);}).catch(()=>{});
    });
    idleTimer=setTimeout(idleWave,14000);
  }
  function setIdle(enabled,motion=true){
    idleWanted=enabled&&motion&&!reducedMotion.matches;
    clearTimeout(idleTimer);clearIdleEffects();
    if(idleWanted&&!document.hidden)idleTimer=setTimeout(idleWave,1800);
  }
  document.addEventListener('visibilitychange',()=>{
    clearTimeout(idleTimer);clearIdleEffects();
    if(!document.hidden&&idleWanted)idleTimer=setTimeout(idleWave,1800);
  });
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)setIdle(false);});
  new MutationObserver(()=>{if(reading())clearIdleEffects();}).observe(document.getElementById('answers'),{subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',()=>{clearIdleEffects();});

  function cancel(preserve = false) {
    setIdle(false);
    generation++;
    for (const route of routes) {
      route.flight?.cancel();
      route.draw?.cancel();
      route.rimFlight?.cancel();
      route.trailFlight?.cancel();
      route.trail?.remove();
      route.rim.remove();
      route.beam.remove();
    }
    if(preserve) return;
    routes = [];
    svg.replaceChildren();
    rims.replaceChildren();
    flights.replaceChildren(rims);
  }

  // Round each right-angle corner while keeping the connecting segments orthogonal.
  function roundedPath(points) {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const previous = points[i - 1], corner = points[i], next = points[i + 1];
      const before = Math.hypot(corner.x - previous.x, corner.y - previous.y);
      const after = Math.hypot(next.x - corner.x, next.y - corner.y);
      const radius = Math.min(12, before / 2, after / 2);
      const entry = {
        x: corner.x + (previous.x - corner.x) * radius / before,
        y: corner.y + (previous.y - corner.y) * radius / before
      };
      const exit = {
        x: corner.x + (next.x - corner.x) * radius / after,
        y: corner.y + (next.y - corner.y) * radius / after
      };
      d += ` L ${entry.x} ${entry.y} Q ${corner.x} ${corner.y} ${exit.x} ${exit.y}`;
    }
    const end = points[points.length - 1];
    return d + ` L ${end.x} ${end.y}`;
  }

  function borderPath(card, area, upper, cornerRadius) {
    const left = card.left - area.left + 1;
    const right = card.right - area.left - 1;
    const top = card.top - area.top + 1;
    const bottom = card.bottom - area.top - 1;
    const center = (left + right) / 2;
    const radius = Math.min(cornerRadius - 1,
      card.width / 2 - 1, card.height / 2 - 1);
    const arc = 'A ' + radius + ' ' + radius + ' 0 0 1 ';
    const topHalf = 'H ' + (right - radius) + ' ' + arc + right + ' ' + (top + radius) +
      ' V ' + (bottom - radius) + ' ' + arc + (right - radius) + ' ' + bottom + ' H ' + center;
    const bottomHalf = 'H ' + (left + radius) + ' ' + arc + left + ' ' + (bottom - radius) +
      ' V ' + (top + radius) + ' ' + arc + (left + radius) + ' ' + top + ' H ' + center;
    return upper
      ? 'M ' + center + ' ' + bottom + ' ' + bottomHalf + ' ' + topHalf
      : 'M ' + center + ' ' + top + ' ' + topHalf + ' ' + bottomHalf;
  }

  function motionFrames(path, samples = 120) {
    const length = path.getTotalLength();
    return Array.from({length: samples + 1}, (_, step) => {
      const position = path.getPointAtLength(length * step / samples);
      return {transform: `translate3d(${position.x}px,${position.y}px,0)`, opacity: 1};
    });
  }

  function layout() {
    if (!routes.length) return;
    const area = svg.getBoundingClientRect();
    const box = form.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${area.width} ${area.height}`);
    rims.setAttribute('viewBox', `0 0 ${area.width} ${area.height}`);
    routes.forEach(route => {
      const slot = route.slot;
      const card = route.target.getBoundingClientRect();
      const targetX = card.x + card.width / 2 - area.x;
      const upper = slot < 3;
      const targetY = (upper ? card.bottom - 1 : card.top + 1) - area.y;
      const startY = (upper ? box.top : box.bottom) - area.y;
      let points;
      if (slot === 0 || slot === 5) {
        points = [{x: targetX, y: startY}, {x: targetX, y: targetY}];
      } else {
        const left = slot === 1 || slot === 3;
        const startX = (area.width <= 740
          ? (left ? box.left + 22 : box.right - 22)
          : box.left + box.width * [0, .18, .82, .34, .66][slot]) - area.x;
        const bendY = startY + (targetY - startY) * [0, .68, .38, .45, .72][slot];
        points = [{x: startX, y: startY}, {x: startX, y: bendY},
          {x: targetX, y: bendY}, {x: targetX, y: targetY}];
        // Extremely narrow resize states can align both endpoints.
        if (Math.abs(startX - targetX) < 1) points = [points[0], points[3]];
      }
      route.track.setAttribute('d', roundedPath(points));
      route.trail?.setAttribute('d',route.track.getAttribute('d'));
      route.rim.setAttribute('d', borderPath(card, area, upper, parseFloat(getComputedStyle(route.target).borderRadius)));
      if (route.flight?.playState === 'running') {
        route.flight.effect.setKeyframes(motionFrames(route.phase === 'rim' ? route.rim : route.track));
      }
    });
  }

  new ResizeObserver(layout).observe(document.getElementById('stage'));

  function send(models, motion, arrive, preserve = false) {
    const reuse = preserve && routes.length === models.length && routes.every(route=>route.target.isConnected);
    cancel(reuse);
    const token = generation;
    const cards = document.getElementById('answers').children;
    if(!reuse) routes = models.map((model, index) => {
      const track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      track.setAttribute('class', 'thread-line');
      track.setAttribute('stroke', model.color);
      track.style.color = model.color;
      track.setAttribute('pathLength', '100');
      svg.append(track);
      const beam = document.createElement('i');
      beam.className = 'light-pulse';
      beam.style.color = model.color;
      flights.append(beam);
      const rim = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      rim.setAttribute('class', 'rim-light');
      rim.setAttribute('stroke', model.color);
      rim.style.color = model.color;
      rim.setAttribute('pathLength', '100');
      rims.append(rim);
      return {target: cards[index], slot:model.slot, track, beam, rim, phase: 'line'};
    });
    if(reuse) routes.forEach(route=>{
      route.phase='line';
      flights.append(route.beam); rims.append(route.rim);
      route.trail=route.track.cloneNode();
      route.trail.setAttribute('class','thread-trail');
      svg.append(route.trail);
    });
    layout();
    routes.forEach((route, index) => {
      const reveal = () => {
        if (generation !== token) return;
        route.track.classList.add('connected');
        route.target.classList.add('appeared');
        route.rim.remove();
        route.beam.remove();
        route.trail?.remove();
        arrive(index);
      };
      if (!motion) { reveal(); return; }
      const keyframes = motionFrames(route.track);
      const timing = {duration: 2200, delay: index * 380, easing: 'linear', fill: 'forwards'};
      if(!reuse) route.draw = route.track.animate([
        {strokeDashoffset: 100, opacity: .85},
        {strokeDashoffset: 0, opacity: .85}
      ], timing);
      if(reuse) route.trailFlight=route.trail.animate([
        {strokeDashoffset:14,opacity:0},
        {strokeDashoffset:7,opacity:1,offset:.07},
        {strokeDashoffset:-100,opacity:0}
      ],timing);
      route.flight = route.beam.animate(keyframes, timing);
      Promise.all([...(reuse?[route.trailFlight.finished]:[route.draw.finished]), route.flight.finished]).then(async () => {
        if (generation !== token) return;
        route.track.classList.add('connected');
        route.draw?.cancel();
        route.trail?.remove();
        route.target.classList.add('appeared');
        route.target.querySelector('.card-status').textContent = reuse?'正在传递':'正在展开';
        route.phase = 'rim';
        // The same pulse continues from the connection point around the card.
        const previousFlight = route.flight;
        route.flight = route.beam.animate(motionFrames(route.rim), {
          duration: 1800, easing: 'linear', fill: 'forwards'
        });
        previousFlight.cancel();
        route.rimFlight = route.rim.animate([
          {strokeDashoffset: 14, opacity: 0},
          {strokeDashoffset: 7, opacity: 1, offset: .07},
          {strokeDashoffset: -86, opacity: 1}
        ], {duration: 1800, easing: 'linear', fill: 'forwards'});
        await Promise.all([route.flight.finished, route.rimFlight.finished]);
        if (generation !== token) return;
        reveal();
      }).catch(error => {
        if (error.name !== 'AbortError') throw error;
      });
    });
  }
  return {send, cancel, setIdle};
})();
