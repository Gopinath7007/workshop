import { appConfig } from '../config';

export type PasswordRule = {
  id: 'length' | 'upper' | 'lower' | 'number';
  label: string;
  ok: boolean;
};

export function passwordRules(value: string): PasswordRule[] {
  return [
    {
      id: 'length',
      label: `At least ${appConfig.auth.minPasswordLength} characters`,
      ok: value.length >= appConfig.auth.minPasswordLength,
    },
    { id: 'upper', label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
    { id: 'lower', label: 'One lowercase letter', ok: /[a-z]/.test(value) },
    { id: 'number', label: 'One number', ok: /\d/.test(value) },
  ];
}

export function isStrongPassword(value: string): boolean {
  return passwordRules(value).every((rule) => rule.ok);
}
