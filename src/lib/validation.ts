
export const PASSWORD_CONSTRAINTS = {
    minLength: 8,
    requireNumber: true,
    requireSpecialChar: true,
};

export const validatePassword = (password: string) => {
    const checks = {
        length: password.length >= PASSWORD_CONSTRAINTS.minLength,
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    return {
        isValid: checks.length && checks.number && checks.special,
        checks,
    };
};

export const PASSWORD_HINT = "Min. 8 characters, at least one number and one special character (!@#$%^&*)";
