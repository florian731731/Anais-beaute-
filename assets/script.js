document.querySelector('.mobile')?.addEventListener('click',()=>document.querySelector('.menu')?.classList.toggle('open'));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const io=new IntersectionObserver(es=>es.forEach((e,i)=>{
  if(e.isIntersecting){
    if(!reduceMotion) e.target.style.transitionDelay=(i%3)*70+'ms';
    e.target.classList.add('on');
    io.unobserve(e.target);
  }
}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(e=>io.observe(e));
