const scrollToElement = (id: string) => {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

export default scrollToElement;