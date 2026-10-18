const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;

  const offset = 180;
  const top =
    element.getBoundingClientRect().top +
    window.scrollY -
    offset;

  window.scrollTo({
    top,
    behavior: 'smooth',
  });
};

export default scrollToElement;