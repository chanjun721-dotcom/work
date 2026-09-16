document.querySelectorAll(".summary").forEach((b,i)=>{
  b.setAttribute("aria-expanded","false");
  const detail=b.nextElementSibling;
  if(detail){detail.id="work-detail-"+i;b.setAttribute("aria-controls",detail.id);}
  b.addEventListener("click",()=>{
    const job=b.closest(".job"), opening=!job.classList.contains("active");
    document.querySelectorAll(".job.active").forEach(other=>{
      if(other!==job){other.classList.remove("active");other.querySelector(".summary")?.setAttribute("aria-expanded","false");}
    });
    job.classList.toggle("active",opening);
    b.setAttribute("aria-expanded",String(opening));
  });
});