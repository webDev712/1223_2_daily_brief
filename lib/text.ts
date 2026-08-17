const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const randomEmployeeID = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * 26)] +
         letters[Math.floor(Math.random() * 26)];
};

export default capitalize;