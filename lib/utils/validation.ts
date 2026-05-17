/**
 * Validation utility functions
 */

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate username
 */
export function validateUsername(username: string): {
  valid: boolean
  error?: string
} {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (username.length > 50) {
    return { valid: false, error: 'Username must be at most 50 characters' }
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }

  return { valid: true }
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate credit card (basic Luhn algorithm)
 */
export function validateCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')

  if (digits.length < 13 || digits.length > 19) {
    return false
  }

  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Validate date
 */
export function validateDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return !isNaN(d.getTime())
}

/**
 * Validate age (date of birth)
 */
export function validateAge(birthDate: Date | string, minAge: number = 18): boolean {
  const d = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  const age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    return age - 1 >= minAge
  }

  return age >= minAge
}

/**
 * Validate range
 */
export function validateRange(
  value: number,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (value < min) {
    return { valid: false, error: `Value must be at least ${min}` }
  }

  if (value > max) {
    return { valid: false, error: `Value must be at most ${max}` }
  }

  return { valid: true }
}

/**
 * Validate required field
 */
export function validateRequired(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'This field is required' }
  }

  return { valid: true }
}
