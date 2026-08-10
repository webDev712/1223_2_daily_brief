const generatePhoneNumber = (phoneString: String) => {
    let digits = phoneString.replace(/\D/g, '');
    if (digits.startsWith('1')) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);

    let formatted = '+1';

    if (digits.length > 0) formatted += ` ${digits.slice(0, 3)}`;
    if (digits.length > 3) formatted += ` ${digits.slice(3, 6)}`;
    if (digits.length > 6) formatted += ` ${digits.slice(6, 10)}`;
    return formatted;
}

export default generatePhoneNumber;