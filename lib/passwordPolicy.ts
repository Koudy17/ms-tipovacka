export interface PasswordCheck {
  ok: boolean;
  rules: { label: string; valid: boolean }[];
}

export function checkPassword(password: string): PasswordCheck {
  const rules = [
    { label: 'Alespoň 8 znaků',      valid: password.length >= 8 },
    { label: 'Velké písmeno (A–Z)',   valid: /[A-Z]/.test(password) },
    { label: 'Malé písmeno (a–z)',    valid: /[a-z]/.test(password) },
    { label: 'Číslo (0–9)',           valid: /[0-9]/.test(password) },
  ];
  return { ok: rules.every(r => r.valid), rules };
}
