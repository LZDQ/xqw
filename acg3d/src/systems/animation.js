export function pressButton(mesh){
  if(!mesh) return;
  const original = mesh.position.y;
  mesh.position.y = original - 0.04;
  setTimeout(() => { mesh.position.y = original; }, 120);
}
