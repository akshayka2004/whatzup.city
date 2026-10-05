import { BadRequestException } from '@nestjs/common';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { OperatingHours, validateOperatingHours } from '@saas/types';
import { Prisma } from '@saas/database';

/**
 * Validates a request field as opening hours (weekly shifts + special closures). Pair with
 * `@IsOptional()` so `null` / missing stays "not provided".
 */
export function IsOperatingHours(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOperatingHours',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return validateOperatingHours(value).ok;
        },
        defaultMessage(args: ValidationArguments) {
          const r = validateOperatingHours(args.value);
          return r.ok ? 'Invalid opening hours.' : r.errors.join(' ');
        },
      },
    });
  };
}

/**
 * Cleaned copy of validated opening hours (unknown keys dropped, shifts sorted), `null` to clear,
 * `undefined` when the caller didn't send the field. Throws if given something invalid, which only
 * happens when a route reached the service without going through the DTO.
 */
export function normalizeOperatingHours(input: unknown): OperatingHours | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  const r = validateOperatingHours(input);
  if (!r.ok) throw new BadRequestException(r.errors.join(' '));
  return r.value;
}

/**
 * Same as `normalizeOperatingHours`, shaped for a Prisma `Json?` column: a plain `null` isn't
 * accepted there, it has to be `Prisma.DbNull`.
 */
export function operatingHoursForDb(input: unknown): OperatingHours | typeof Prisma.DbNull | undefined {
  const n = normalizeOperatingHours(input);
  return n === null ? Prisma.DbNull : n;
}
